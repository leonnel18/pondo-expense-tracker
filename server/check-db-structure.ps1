# PowerShell script to check database structure
Add-Type -AssemblyName System.Data
$connectionString = "Data Source=.\data\pondo.db;Version=3;"
try {
  $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
  $connection.Open()
  Write-Host "Connected to database successfully"
  
  # Get table names
  $command = $connection.CreateCommand()
  $command.CommandText = "SELECT name FROM sqlite_master WHERE type='table'"
  $reader = $command.ExecuteReader()
  Write-Host "Tables in database:"
  while ($reader.Read()) {
    Write-Host "  -" $reader["name"]
  }
  $reader.Close()
  
  # Check settings table
  $command.CommandText = "SELECT * FROM settings"
  try {
    $reader = $command.ExecuteReader()
    Write-Host "Settings table data:"
    while ($reader.Read()) {
      Write-Host "  - Key:" $reader["key"] "Value:" $reader["value"]
    }
    $reader.Close()
  } catch {
    Write-Host "Error reading settings table:" $_.Exception.Message
  }
  
  $connection.Close()
} catch {
  Write-Host "Error connecting to database:" $_.Exception.Message
}