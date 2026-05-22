import sys

with open("extracted_text.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("headings_list.txt", "w", encoding="utf-8") as out:
    for idx, line in enumerate(lines):
        if line.strip().startswith("PARTE") or line.strip().startswith("BLOQUE") or "ANÁLISIS" in line or "ESTRATEGIA" in line:
            out.write(f"Line {idx+1}: {line.strip()}\n")
print("SUCCESS")
