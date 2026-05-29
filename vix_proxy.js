export default {
  async fetch(request) {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d';
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return new Response(JSON.stringify({error:'no data'}), {status:500, headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}});
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp || [];
    const closes = quotes?.close || [];
    const opens = quotes?.open || [];
    const data_points = timestamps.map((t,i) => ({time: t*1000, open: opens[i], close: closes[i], high: (quotes?.high||[])[i], low: (quotes?.low||[])[i]})).filter(d => d.close);
    return new Response(JSON.stringify({vix: closes[closes.length-1], change: closes[closes.length-1] - closes[closes.length-2], data: data_points}), {headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}});
  }
}
