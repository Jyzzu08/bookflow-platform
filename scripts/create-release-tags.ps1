param(
  [string]$BaseRef = "HEAD"
)

$ErrorActionPreference = "Stop"

$tags = @(
  @{ Name = "v0.1.0"; Message = "BookFlow Platform foundation" },
  @{ Name = "v0.2.0"; Message = "BookFlow Platform compatibility layer" },
  @{ Name = "v0.3.0"; Message = "BookFlow Platform service expansion" },
  @{ Name = "v0.4.0"; Message = "BookFlow Platform hardening" },
  @{ Name = "v1.0.0"; Message = "BookFlow Platform portfolio release" }
)

foreach ($tag in $tags) {
  $exists = git tag --list $tag.Name
  if ($exists) {
    Write-Host "Skipping existing tag $($tag.Name)"
    continue
  }

  git tag -a $tag.Name $BaseRef -m $tag.Message
  Write-Host "Created tag $($tag.Name) on $BaseRef"
}
