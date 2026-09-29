<#
.SYNOPSIS
    npm run library:publish -- zet wat je in de app aan de bibliotheek hebt veranderd (bv. een tier via
    het potloodje in het trackregister) met een commando op main.
.DESCRIPTION
    De app schrijft een wijziging meteen in data/library/export/, en die map staat in git. Direct op main
    committen mag niet (dkj-policy: alles via branch + PR), dus dit script loopt die route voor je, voor
    ALLEEN de export (Dave, 29 september 2026):

      1. weigert als je niet op main staat, of als er naast data/library/export/ nog iets gewijzigd is --
         dan zou andermans werk (of half werk) meeliften;
      2. vat samen wat er veranderde (scripts/library/export-diff.ts, bv. "2 tracks gewijzigd (dkj_rating 2)");
      3. maakt een branch chore/library-<tijd> met zijn branchdocument (new-branch van de plugin) en vult
         dat document zelf in;
      4. commit de export, en draait open-pr en ship-pr van de plugin: de gates, de PR, de merge en de fold.
         Een datawijziging heeft geen zichtbaar resultaat, dus die PR wacht niet op een blik;
      5. eindigt op een bijgewerkte main.

    -DryRun doet alleen stap 1 en 2 en zegt wat hij zou doen.

    De plugin-scripts komen uit de dkj-policy-installatie van DEZE checkout
    (~/.claude/plugins/installed_plugins.json), niet uit een vaste versie.
    Pure ASCII (repo convention for .ps1).
#>
param(
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$exportDir = 'data/library/export/'

function Stop-Publish([string]$Message) {
    Write-Host "library:publish: $Message"
    exit 1
}

function Get-PolicyScriptsRoot {
    $registry = Join-Path $env:USERPROFILE '.claude/plugins/installed_plugins.json'
    if (-not (Test-Path $registry)) { Stop-Publish "geen $registry -- is dkj-policy geinstalleerd?" }
    $installs = (Get-Content $registry -Raw | ConvertFrom-Json).plugins.'dkj-policy@dkj-claude-plugins'
    # Voor deze checkout gelden twee soorten records: een projectinstallatie op dit pad, en een installatie
    # voor de hele machine (scope user, zonder projectPath). Ze kunnen verschillen (gemeten 29 september
    # 2026: project 5.8.0, user 5.9.0, en de sessie laadde 5.9.0), dus de nieuwste van de twee wint.
    $here = (Resolve-Path $root).Path
    $mine = @($installs | Where-Object {
        ($_.scope -eq 'user') -or ($_.projectPath -and ((Resolve-Path $_.projectPath -ErrorAction SilentlyContinue).Path -eq $here))
    } | Sort-Object { [version]$_.version } -Descending)
    if ($mine.Count -eq 0) { Stop-Publish "dkj-policy is niet voor deze checkout geinstalleerd ($root)." }
    $scripts = Join-Path $mine[0].installPath 'scripts'
    if (-not (Test-Path $scripts)) { Stop-Publish "de dkj-policy-installatie mist $scripts." }
    return $scripts
}

function Invoke-Step([string]$What, [scriptblock]$Run) {
    Write-Host "library:publish: $What"
    & $Run
    if ($LASTEXITCODE -ne 0) { Stop-Publish "'$What' mislukte (exit $LASTEXITCODE). De branch blijft staan; kijk hierboven waarom." }
}

Push-Location $root
try {
    # 1. De uitgangssituatie.
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    if ($branch -ne 'main') {
        Stop-Publish "je staat op '$branch', niet op main. Wat je in de app wijzigt, komt dan op die branch mee; publiceer vanaf main."
    }
    $dirty = @(git status --porcelain --untracked-files=all | ForEach-Object { $_.Substring(3).Trim('"') })
    if ($dirty.Count -eq 0) { Stop-Publish 'niets te publiceren: de export is gelijk aan main.'; }
    $other = @($dirty | Where-Object { -not $_.StartsWith($exportDir) })
    if ($other.Count -gt 0) {
        Stop-Publish ("naast de export is er nog iets gewijzigd, en dat hoort niet in een datawijziging:`n  " + ($other -join "`n  "))
    }

    # 2. Wat er veranderde.
    $diffJson = & npx --no-install tsx scripts/library/export-diff.ts
    if ($LASTEXITCODE -ne 0) { Stop-Publish 'de samenvatting van de export mislukte.' }
    $diff = ($diffJson | Select-Object -Last 1) | ConvertFrom-Json
    $summary = if ($diff.summary) { $diff.summary } else { 'alleen updated_at' }
    Write-Host "library:publish: veranderd sinds main -- $summary"

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $name = "chore/library-$stamp"
    if ($DryRun) {
        Write-Host "library:publish: -DryRun -- zou $name maken, de export committen en via open-pr en ship-pr op main zetten."
        exit 0
    }

    $scripts = Get-PolicyScriptsRoot
    $title = "Bibliotheek bijgewerkt vanuit de app: $summary"

    # 3. De branch en zijn document.
    Invoke-Step "branch $name" { powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scripts 'task/new-branch.ps1') -Name $name -Title $title }
    $docPath = Join-Path $root ('dkj-policy/' + ($name -replace '/', '-') + '.md')
    $doc = [IO.File]::ReadAllText($docPath)
    $nl = if ($doc.Contains("`r`n")) { "`r`n" } else { "`n" }
    $doc = $doc.Replace('- [ ] TODO: the first step of this branch', "- [x] Export uit de app gecommit: $summary")
    $deploy = @(
        "### DEPLOY: $name",
        '',
        "Wijzigingen die in de app zelf zijn gemaakt, zoals een tier via het potloodje in het trackregister, staan nu op main: $summary. Er verandert niets aan de code.",
        '',
        '**Score:** 1',
        '',
        '#### What makes this deploy extra special',
        '',
        'N/A -- alleen de eigen bibliotheekdata; de app zelf verandert niet.',
        '',
        '**Score:** N/A',
        '',
        '#### Pull Request'
    ) -join $nl
    $pattern = '(?s)### DEPLOY: ' + [regex]::Escape($name) + '.*?#### Pull Request'
    if ($doc -notmatch $pattern) { Stop-Publish "het branchdocument $docPath heeft niet de verwachte vorm; vul het zelf in en draai open-pr." }
    $doc = [regex]::Replace($doc, $pattern, { param($m) $deploy })
    [IO.File]::WriteAllText($docPath, $doc, (New-Object System.Text.UTF8Encoding($false)))

    # 4. Commit, PR, merge, fold.
    Invoke-Step 'commit' { git add -- $exportDir $docPath; git commit -q -m "chore: bibliotheek bijgewerkt vanuit de app ($summary)" }
    Invoke-Step 'push' { git push -q }
    Invoke-Step 'open-pr' { powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scripts 'release/open-pr.ps1') -NoResolves }
    Invoke-Step 'ship-pr' { powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scripts 'release/ship-pr.ps1') -NoResolves }

    # 5. Terug op een bijgewerkte main (ship-pr doet dat normaal al; dit is idempotent).
    git checkout -q main
    git pull -q --ff-only
    Write-Host "library:publish: klaar -- $summary staat op main."
} finally {
    Pop-Location
}
