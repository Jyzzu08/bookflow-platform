param()
$ErrorActionPreference = 'Stop'

$suffix = [guid]::NewGuid().ToString('N').Substring(0,8)
$payload = @{
  username = "e2e-user-$suffix"
  password = "e2e-pass"
} | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/register' -ContentType 'application/json' -Body $payload | Out-Null

$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/v2/auth/login' -ContentType 'application/json' -Body $payload
if (-not $login.accessToken) { throw 'Missing v2 access token' }
if (-not $login.refreshToken) { throw 'Missing v2 refresh token' }

$book = '{"title":"E2E Book","cover":"e2e.jpg","idUser":"demo-user"}'
Invoke-RestMethod -Method Post -Uri 'http://localhost:8081/v2/catalog/books' -ContentType 'application/json' -Body $book | Out-Null

$catalog = Invoke-RestMethod -Method Get -Uri 'http://localhost:8080/v2/catalog/books'
if (-not $catalog.items) { throw 'Catalog retrieval failed' }

$orderPayload = '{"userId":"demo-user","items":[{"id":"book-1","quantity":1}],"total":120}'
$order = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/v2/orders' -ContentType 'application/json' -Body $orderPayload
if (-not $order.id) { throw 'Order creation failed' }

$paymentPayload = @{
  order_id = "$($order.id)"
  amount = 120
  currency = "EUR"
} | ConvertTo-Json -Compress
$payment = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/v2/payments' -ContentType 'application/json' -Body $paymentPayload
if (-not $payment.status) { throw 'Payment flow failed' }

Write-Host 'E2E journey passed.'
