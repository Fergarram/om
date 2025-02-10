# Copy Electron files
Copy-Item -Path "node_modules\electron\dist\*" -Destination "builds\windows" -Recurse -Force

# Rename electron.exe to om.exe
Rename-Item -Path "builds\windows\electron.exe" -NewName "om.exe"

# Pack
bun pack_win

# Create shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$(Get-Location)\om.lnk")
$Shortcut.TargetPath = "$(Get-Location)\builds\windows\om.exe"
$Shortcut.IconLocation = "$(Get-Location)\icons\icon.ico,0"
$Shortcut.Save()
