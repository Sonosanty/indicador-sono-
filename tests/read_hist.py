import json
import os

path = r'C:\Users\sparreno\.openclaw\agents\main\sessions\48fb505e-2b7b-4474-8728-0e61cf0ec5f0.jsonl'
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                if data.get('type') == 'message':
                    msg = data.get('message', {})
                    role = msg.get('role')
                    content = msg.get('content', '')
                    if isinstance(content, list):
                        text = ''.join([item.get('text', '') for item in content if item.get('type') == 'text'])
                    else:
                        text = str(content)
                    print(f"--- {role.upper()} ---")
                    print(text[:200])
                    print()
            except Exception as e:
                pass
else:
    print("Path does not exist")
