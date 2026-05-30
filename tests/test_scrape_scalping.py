import urllib.request
from bs4 import BeautifulSoup
import json

def scrape_scalping_trades():
    url = "https://mifuturapp.com/indicador_btc/backtest_scalping.php"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            html = response.read()
    except Exception as e:
        print(f"Error fetching URL: {e}")
        return []
        
    soup = BeautifulSoup(html, 'html.parser')
    table = soup.find('table')
    if not table:
        print("No table found on the page")
        return []
        
    trades = []
    tbody = table.find('tbody')
    rows = tbody.find_all('tr') if tbody else table.find_all('tr')[1:]
    
    for row in rows:
        cols = row.find_all('td')
        if len(cols) < 5:
            continue
            
        # Parse fecha
        fecha = cols[0].get_text(separator=" ").strip()
        
        # Parse type
        tipo = cols[1].get_text().strip()
        
        # Parse entrada price
        entrada = cols[2].get_text().strip()
        
        # Parse salida price and date
        salida_text = cols[3].get_text(separator=" ").strip()
        salida_parts = salida_text.split()
        salida_price = salida_parts[0] if len(salida_parts) > 0 else ""
        salida_date = " ".join(salida_parts[1:]) if len(salida_parts) > 1 else ""
        
        # Parse resultado
        resultado = cols[4].get_text().strip()
        
        # Parse R
        r_val = cols[5].get_text().strip() if len(cols) > 5 else ""
        
        # Parse Stop
        stop_val = cols[6].get_text().strip() if len(cols) > 6 else ""
        
        # Parse TP
        tp_val = cols[7].get_text().strip() if len(cols) > 7 else ""
        
        # Parse structure/pattern
        structure = ""
        motivos = ""
        if len(cols) > 16:
            # columns: 16 is structure, 17 is motivos
            structure = cols[16].get_text().strip()
        if len(cols) > 17:
            motivos = cols[17].get_text().strip()
            
        trades.append({
            "fecha": fecha,
            "tipo": tipo,
            "entrada": entrada,
            "salida_precio": salida_price,
            "salida_fecha": salida_date,
            "resultado": resultado,
            "r": r_val,
            "stop": stop_val,
            "tp": tp_val,
            "pattern": structure,
            "motivos": motivos
        })
        
    return trades

if __name__ == "__main__":
    trades = scrape_scalping_trades()
    print(f"Successfully scraped {len(trades)} trades.")
    if trades:
        print("Sample Trade:")
        print(json.dumps(trades[0], indent=2))
