$wshell = New-Object -ComObject Wscript.Shell
$shortcut = $wshell.CreateShortcut("$env:USERPROFILE\Desktop\OpenClaw.lnk")
$shortcut.TargetPath = "cmd.exe"
$shortcut.Arguments = "/c start /min npx openclaw start"
$shortcut.WorkingDirectory = "$env:USERPROFILE\.openclaw\workspace"
$shortcut.WindowStyle = 7
$shortcut.Description = "Iniciar OpenClaw (jarvisClaw)"
$shortcut.Save()

Write-Host "Acceso directo creado en el escritorio: OpenClaw.lnk"
Write-Host "Ruta: $env:USERPROFILE\Desktop\OpenClaw.lnk"
