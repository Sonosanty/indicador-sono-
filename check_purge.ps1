Start-Sleep -Seconds 60
Write-Host "=== Post-cache purge ==="
$root = curl -s https://indicador-sono.pages.dev/
Write-Host "Raiz: $($root.Length) bytes - contains fU: $($root.Contains('fU'))"

$met = curl -s https://indicador-sono.pages.dev/metodo
Write-Host "/metodo: $($met.Length) bytes"

$ran = curl -s https://indicador-sono.pages.dev/rangos
Write-Host "/rangos: $($ran.Length) bytes"

$tra = curl -s https://indicador-sono.pages.dev/trades
Write-Host "/trades: $($tra.Length) bytes"

$dash = curl -s https://indicador-sono.pages.dev/dashboard
Write-Host "/dashboard: $($dash.Length) bytes"

Write-Host "`nHeaders:"
curl -s -I https://indicador-sono.pages.dev/metodo | Select-String "cf-cache"
Write-Host "Done"
