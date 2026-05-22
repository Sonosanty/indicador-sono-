import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def get_docx_text(path):
    try:
        if not os.path.exists(path):
            return f"Error: File not found at {path}"
        with zipfile.ZipFile(path) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            # Find all <w:t> elements
            texts = []
            # OpenXML namespace
            ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
            t_tag = ns + 't'
            p_tag = ns + 'p'
            
            # Preserve paragraphs
            for paragraph in root.iter(p_tag):
                p_text = []
                for t in paragraph.iter(t_tag):
                    if t.text:
                        p_text.append(t.text)
                if p_text:
                    texts.append("".join(p_text))
            return "\n\n".join(texts)
    except Exception as e:
        return f"Error parsing DOCX: {e}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        path = sys.argv[1]
        text = get_docx_text(path)
        # Write to extracted_text.txt with utf-8 encoding
        with open("extracted_text.txt", "w", encoding="utf-8") as f:
            f.write(text)
        print("SUCCESS")
    else:
        print("Usage: python read_docx.py <path_to_docx>")
