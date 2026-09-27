<#
.SYNOPSIS
    Shared branch conventions for workflow scripts (repo-specific prefix table).
.DESCRIPTION
    Placed by specialists-init as a VUL-IN scaffold. Provides Get-BranchTypes, Get-BranchPrefix,
    Get-BranchInfo and Test-BranchName -- every function check-script-contract marks required for this
    lib. Prefix table determines GitHub label for PR and changelog entry type, and is
    DIFFERENT PER REPO -- fill in your branch taxonomy below (table intentionally empty).

    No Set-StrictMode here: dot-sourcing would modify calling script's strict mode.
    Pure ASCII (repo convention for .ps1).
#>

# Canonical branch types in release notes order.
$script:BranchTypeOrder = @('Feat', 'Fix', 'Docs', 'Chore')

# Prefix -> GitHub label (PR) + branch type (changelog entry). Labels are the tracker's defaults.
$script:BranchPrefixTable = @{
    feat  = @{ Label = 'enhancement';   Type = 'Feat' }
    fix   = @{ Label = 'bug';           Type = 'Fix' }
    docs  = @{ Label = 'documentation'; Type = 'Docs' }
    chore = @{ Label = 'documentation'; Type = 'Chore' }
}

function Get-BranchTypes {
    return $script:BranchTypeOrder
}

function Get-BranchPrefix {
    param([Parameter(Mandatory = $true)][string]$Branch)
    if ($Branch -match '/') { return ($Branch -split '/')[0] }
    return ($Branch -split '-')[0]
}

function Get-BranchInfo {
    param([Parameter(Mandatory = $true)][string]$Branch)
    $prefix = Get-BranchPrefix -Branch $Branch
    $known  = $script:BranchPrefixTable.ContainsKey($prefix)
    [pscustomobject]@{
        Branch   = $Branch
        Prefix   = $prefix
        IsKnown  = $known
        Label    = $(if ($known) { $script:BranchPrefixTable[$prefix].Label } else { $null })
        Type     = $(if ($known) { $script:BranchPrefixTable[$prefix].Type } else { $null })
        SafeName = $Branch -replace '/', '-'
    }
}

# Validates a branch name before it is used (new-branch.ps1), instead of repeating the reject rules
# inline. Required by the contract, so the scaffold defines it rather than leaving the session check to
# report it against a missing function (issue #226). Hard rejects: an empty name, 'main', and any name
# containing 'final' (deliberately broad, so 'finalize' is rejected too). An UNKNOWN PREFIX is not a
# hard reject -- the caller reads IsKnown and decides for itself, consistent with the other shared
# scripts, which fall back on an unknown prefix rather than blocking.
function Test-BranchName {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Branch)

    if ([string]::IsNullOrWhiteSpace($Branch)) {
        return [pscustomobject]@{ IsValid = $false; Reason = "Branch name must not be empty."; IsKnown = $false }
    }
    if ($Branch -eq 'main') {
        return [pscustomobject]@{ IsValid = $false; Reason = "Branch name must not be 'main'."; IsKnown = $false }
    }
    if ($Branch -match 'final') {
        return [pscustomobject]@{ IsValid = $false; Reason = "Branch name must not contain the token 'final'."; IsKnown = $false }
    }

    $info = Get-BranchInfo -Branch $Branch
    [pscustomobject]@{ IsValid = $true; Reason = $null; IsKnown = $info.IsKnown }
}
