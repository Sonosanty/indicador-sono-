export default {
  async fetch(request) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: /vix — Yahoo Finance VIX
    if (url.pathname === '/vix' || url.pathname === '/') {
      const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d';
      try {
        const resp = await fetch(yahooUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await resp.json();
        const result = data?.chart?.result?.[0];
        if (!result) throw new Error('no data');
        const quotes = result.indicators?.quote?.[0];
        const timestamps = result.timestamp || [];
        const closes = quotes?.close || [];
        const opens = quotes?.open || [];
        const data_points = timestamps.map((t,i) => ({
          time: t * 1000, open: opens[i], close: closes[i],
          high: (quotes?.high||[])[i], low: (quotes?.low||[])[i]
        })).filter(d => d.close);
        return new Response(JSON.stringify({
          vix: closes[closes.length-1],
          change: closes.length >= 2 ? +(closes[closes.length-1] - closes[closes.length-2]).toFixed(2) : 0,
          data: data_points
        }), { headers: corsHeaders });
      } catch(e) {
        return new Response(JSON.stringify({ vix: 15.32, change: -2.67, error: 'fallback' }), { headers: corsHeaders });
      }
    }

    // Route: /global — CoinGecko global data (proxied to avoid CORS)
    if (url.pathname === '/global') {
      try {
        const resp = await fetch('https://api.coingecko.com/api/v3/global', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!resp.ok) throw new Error('CoinGecko status ' + resp.status);
        const data = await resp.json();
        if (!data || !data.data) throw new Error('no data');
        const d = data.data;
        return new Response(JSON.stringify({
          data: {
            total_market_cap: d.total_market_cap?.usd || 0,
            dominance: d.market_cap_percentage?.btc || 0,
            eth_dominance: d.market_cap_percentage?.eth || 0
          }
        }), { headers: corsHeaders });
      } catch(e) {
        return new Response(JSON.stringify({
          data: { total_market_cap: 0, dominance: 55, eth_dominance: 10 },
          error: e.message
        }), { headers: corsHeaders });
      }
    }

    // Route: /eur — EUR/USD rate (fallback)
    if (url.pathname === '/eur') {
      try {
        const resp = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const data = await resp.json();
        return new Response(JSON.stringify({ rate: data.rates?.EUR || 0.92 }), { headers: corsHeaders });
      } catch(e) {
        return new Response(JSON.stringify({ rate: 0.92 }), { headers: corsHeaders });
      }
    }

    // 404
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: corsHeaders });
  }
}
