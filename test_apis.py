import yfinance as yf
import urllib.request
import json
from pytrends.request import TrendReq

def test_vix():
    try:
        vix = yf.Ticker('^VIX')
        vix_val = round(vix.history(period='1d')['Close'].iloc[-1], 2)
        print(f"VIX: {vix_val}")
    except Exception as e:
        print(f"VIX Error: {e}")

def test_fng():
    try:
        req = urllib.request.urlopen('https://api.alternative.me/fng/')
        res = json.loads(req.read().decode('utf-8'))
        value = res["data"][0]["value"]
        label = res["data"][0]["value_classification"]
        print(f"Fear & Greed: {value} ({label})")
    except Exception as e:
        print(f"F&G Error: {e}")

def test_trends():
    try:
        pytrends = TrendReq(hl='en-US', tz=360)
        pytrends.build_payload(["bitcoin"], cat=0, timeframe='now 1-d', geo='')
        data = pytrends.interest_over_time()
        vol = int(data['bitcoin'].iloc[-1])
        print(f"Google Trends Bitcoin: {vol}")
    except Exception as e:
        print(f"Trends Error: {e}")

if __name__ == "__main__":
    test_vix()
    test_fng()
    test_trends()
