param([Parameter(Mandatory=$true)][string]$AgentUser, [Parameter(Mandatory=$true)][string]$VaultHome, [Parameter(Mandatory=$true)][string]$CodePath)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'isolation-rights.ps1')
try {
  $ownerIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $agentAccount = Get-LocalUser -Name $AgentUser
  $ownerSid = $ownerIdentity.User.Value
  $agentSid = $agentAccount.SID.Value
  if ($ownerSid -eq $agentSid) { throw 'Owner and agent must be different accounts' }
  $administrators = @(Get-LocalGroupMember -SID 'S-1-5-32-544')
  if ($administrators.SID.Value -contains $agentSid) { throw 'Agent cannot be an administrator' }
  if ($administrators.SID.Value -contains $ownerSid) { throw 'Owner must use a standard account' }
  if (@($administrators | Where-Object ObjectClass -eq 'Group').Count -gt 0) { throw 'Nested administrator memberships require manual isolation review' }
  $allowed = @($ownerSid, 'S-1-5-18', 'S-1-5-32-544')
  foreach ($entry in @(@{ Path=$VaultHome; Private=$true }, @{ Path=$CodePath; Private=$false })) {
    $resolved = (Resolve-Path -LiteralPath $entry.Path).Path
    $acl = Get-Acl -LiteralPath $resolved
    foreach ($rule in $acl.Access) {
      $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
      if ($rule.AccessControlType -eq 'Allow' -and $allowed -notcontains $sid) {
        if ($entry.Private -or (Test-SafeGenMutationRights $rule.FileSystemRights)) { throw 'Directory grants access outside owner boundary' }
      }
    }
  }
  exit 0
} catch { Write-Error 'SafeGen owner isolation verification failed'; exit 1 }
