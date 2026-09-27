<#
.SYNOPSIS
    Local lint gate, run by open-pr before a PR (Get-LintScript).
.DESCRIPTION
    Runs the same three steps as the lint-en-tests job in .github/workflows/ci.yml, so a green run here
    predicts a green CI. Exits non-zero on the first failing step.
    Pure ASCII (repo convention for .ps1).
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Push-Location $root
try {
    foreach ($step in 'lint', 'typecheck', 'test') {
        Write-Host "lint gate: npm run $step"
        & npm run $step
        if ($LASTEXITCODE -ne 0) {
            Write-Host "lint gate: 'npm run $step' failed (exit $LASTEXITCODE)."
            exit 1
        }
    }
    Write-Host 'lint gate: green.'
    exit 0
} finally {
    Pop-Location
}
