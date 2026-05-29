schtasks /create /tn "OpenClawAutoStart" /tr "cmd.exe /c start /min npx openclaw start" /sc onlogon /ru %USERNAME% /f
schtasks /create /tn "SonoBotAutoStart" /tr "C:\Python314\python.exe C:\Users\sparreno\.openclaw\workspace\sono_bot.py" /sc onlogon /ru %USERNAME% /delay 0002:00 /f
schtasks /query /tn "OpenClawAutoStart","SonoBotAutoStart" /fo LIST