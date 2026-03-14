param()
$ErrorActionPreference = 'Stop'

$suffix = [guid]::NewGuid().ToString('N').Substring(0,8)
$registerBody = @{
  username = "contract-user-$suffix"
  password = "contract-pass"
} | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/register' -ContentType 'application/json' -Body $registerBody | Out-Null

$authResponse = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/auth' -ContentType 'application/json' -Body $registerBody
if (-not $authResponse.token) { throw 'Missing legacy auth token' }

$userInfo = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/get-user-info?token=$($authResponse.token)"
if (-not $userInfo.id) { throw 'Legacy user info contract broken' }

$books = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/get_all/demo-user/$($authResponse.token)"
if ($null -eq $books) { throw 'Legacy books endpoint contract broken' }

Write-Host 'Contract test passed.'
