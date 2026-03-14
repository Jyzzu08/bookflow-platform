param()

$ErrorActionPreference = 'Stop'

$endpoints = @(
  'http://localhost:8080/health',
  'http://localhost:3001/health',
  'http://localhost:3002/health',
  'http://localhost:3003/health',
  'http://localhost:3004/health',
  'http://localhost:3005/health',
  'http://localhost:8001/health',
  'http://localhost:8002/health',
  'http://localhost:8081/health'
)

foreach ($url in $endpoints) {
  Write-Host "Checking $url"
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 8
  if ($response.StatusCode -lt 200 -or $response.StatusCode -gt 299) {
    throw "Endpoint failed: $url"
  }
}

Write-Host 'Smoke checks passed.'
