# Check if database file exists
$dbPath = ".\data\pondo.db"
Write-Host "Checking database file: $dbPath"

if (Test-Path $dbPath) {
  Write-Host "Database file exists"
  $stats = Get-Item $dbPath
  Write-Host "File size: $($stats.Length) bytes"
} else {
  Write-Host "Database file does not exist"
}

# Try to read the first few bytes
try {
  $bytes = Get-Content $dbPath -Encoding Byte -ReadCount 16 -TotalCount 16
  Write-Host "First 16 bytes: $([BitConverter]::ToString($bytes))"
} catch {
  Write-Host "Error reading file: $($_.Exception.Message)"
}