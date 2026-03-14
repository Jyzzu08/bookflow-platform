param(
  [string]$Repository,
  [string]$Tag = "v2.0.0",
  [string]$Name = "BookFlow Platform v2.0.0",
  [string]$NotesFile = "docs/releases/v2.0.0.md"
)

$ErrorActionPreference = 'Stop'

if (-not $env:GITHUB_TOKEN) {
  throw "GITHUB_TOKEN environment variable is required."
}

if (-not $Repository) {
  throw "Repository parameter is required. Example: Jyzzu08/bookflow-platform"
}

if (-not (Test-Path $NotesFile)) {
  throw "Release notes file not found: $NotesFile"
}

$body = Get-Content $NotesFile -Raw
$payload = @{
  tag_name = $Tag
  name = $Name
  body = $body
  draft = $false
  prerelease = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.github.com/repos/$Repository/releases" `
  -Headers @{
    Authorization = "Bearer $($env:GITHUB_TOKEN)"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
  } `
  -ContentType "application/json" `
  -Body $payload

Write-Host "GitHub release created for $Repository@$Tag"
