
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$backupDir = "c:\Users\autob\OneDrive\Desktop\SKi SKC\SKI Project\backups\backup_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force

Write-Host "Backing up databases..."
# Root DB
if (Test-Path "c:\Users\autob\OneDrive\Desktop\SKi SKC\SKI Project\local.db") {
    Copy-Item "c:\Users\autob\OneDrive\Desktop\SKi SKC\SKI Project\local.db" "$backupDir\root_local.db"
    Write-Host "✅ Root local.db backed up."
}

# Dashboard DB
if (Test-Path "c:\Users\autob\OneDrive\Desktop\SKi SKC\SKI Project\dashboard\data\local.db") {
    Copy-Item "c:\Users\autob\OneDrive\Desktop\SKi SKC\SKI Project\dashboard\data\local.db" "$backupDir\dashboard_local.db"
    Write-Host "✅ Dashboard local.db backed up."
}

Write-Host "Creating project ZIP (excluding node_modules, .git, and .next)..."
$tempDir = "c:\Users\autob\OneDrive\Desktop\SKi SKC\SKI Project\backups\temp_zip_$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force

# Use robocopy for better reliability and performance with exclusions
robocopy "c:\Users\autob\OneDrive\Desktop\SKi SKC\SKI Project" "$tempDir" /MIR /XD "node_modules" ".git" ".next" "backups" /XF "*.log" "local.db" "backup.ps1" /NP /NFL /NDL

$zipPath = "$backupDir\SKI_Project_$timestamp.zip"
Write-Host "Compressing to $zipPath..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

Write-Host "Cleaning up temporary files..."
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Backup completed successfully!"
Write-Host "Backup Location: $backupDir"
Write-Host "Root DB: root_local.db ($( if (Test-Path ""$backupDir\root_local.db"") { (Get-Item ""$backupDir\root_local.db"").Length / 1MB } else { 0 } ) MB)"
Write-Host "Dashboard DB: dashboard_local.db ($( if (Test-Path ""$backupDir\dashboard_local.db"") { (Get-Item ""$backupDir\dashboard_local.db"").Length / 1MB } else { 0 } ) MB)"
Write-Host "Source ZIP: SKI_Project_$timestamp.zip ($( (Get-Item ""$zipPath"").Length / 1MB ) MB)"
