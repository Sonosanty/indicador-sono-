import json

def fix_json():
    with open('historico.json', 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    # Check if it starts with [
    if not content.startswith('['):
        # Let's wrap it in [ and ]
        # First check if there's a trailing comma and remove it, or if it ends with }
        # Let's see: we can clean it up
        cleaned = content
        if cleaned.endswith(','):
            cleaned = cleaned[:-1]
        cleaned = '[' + cleaned + ']'
    else:
        cleaned = content
        
    try:
        # Try to parse
        data = json.loads(cleaned)
        print(f"Successfully parsed JSON. Total records: {len(data)}")
        
        # Save clean JSON array back to historico.json
        with open('historico.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print("Saved clean valid JSON array to historico.json.")
        return True
    except json.JSONDecodeError as e:
        print(f"Failed to parse as simple array: {e}")
        # Let's try to fix more robustly: split by '},\n    {' or similar, or find individual JSON objects
        # A very robust way is to use a JSON decoder to scan and yield objects
        print("Attempting robust scanning...")
        decoder = json.JSONDecoder()
        pos = 0
        objects = []
        # Remove any leading [ if it's there
        text_to_scan = content.strip()
        if text_to_scan.startswith('['):
            text_to_scan = text_to_scan[1:]
        if text_to_scan.endswith(']'):
            text_to_scan = text_to_scan[:-1]
            
        text_to_scan = text_to_scan.strip()
        
        while pos < len(text_to_scan):
            # Skip whitespace and commas
            while pos < len(text_to_scan) and (text_to_scan[pos].isspace() or text_to_scan[pos] == ','):
                pos += 1
            if pos >= len(text_to_scan):
                break
            try:
                obj, idx = decoder.raw_decode(text_to_scan, pos)
                objects.append(obj)
                pos = idx
            except json.JSONDecodeError as err:
                print(f"Error at position {pos}: {err}")
                # Try to advance to the next object start
                next_pos = text_to_scan.find('{', pos + 1)
                if next_pos == -1:
                    break
                pos = next_pos
                
        print(f"Robust scan found {len(objects)} valid JSON objects.")
        if len(objects) > 0:
            with open('historico.json', 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=4, ensure_ascii=False)
            print("Successfully saved cleaned records to historico.json.")
            return True
        return False

if __name__ == "__main__":
    fix_json()
