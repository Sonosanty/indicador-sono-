// sono-trades-worker — API REST CRUD para Trading Journal
// Almacenamiento: Cloudflare KV (TRADES_KV)
// Endpoints:
//   GET  /api/trades           — lista todos los trades
//   POST /api/trades           — añade un trade
//   DELETE /api/trades/:id     — elimina un trade
//   DELETE /api/trades         — elimina todos
//   GET  /api/stats            — estadísticas resumidas

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    const path = url.pathname.replace(/\/$/, '')

    // GET /api/trades
    if (path === '/api/trades' && request.method === 'GET') {
      const raw = await env.TRADES_KV.get('trades', { type: 'json' })
      return new Response(JSON.stringify(raw || []), { headers: CORS })
    }

    // POST /api/trades
    if (path === '/api/trades' && request.method === 'POST') {
      const body = await request.json()
      const trades = (await env.TRADES_KV.get('trades', { type: 'json' })) || []
      const trade = {
        id: crypto.randomUUID().slice(0, 8),
        fecha: body.fecha || new Date().toISOString().slice(0, 10),
        activo: body.activo || 'BTC',
        direccion: body.direccion || 'LONG',
        entrada: +body.entrada || 0,
        salida: body.salida ? +body.salida : null,
        tamano: +body.tamano || 0,
        rr: +body.rr || 1,
        setup: body.setup || '',
        nota: body.nota || '',
        timestamp: Date.now(),
      }
      if (trade.salida) {
        const diff = trade.direccion === 'LONG' ? trade.salida - trade.entrada : trade.entrada - trade.salida
        const pct = (diff / trade.entrada) * 100
        trade.pl = +((diff / trade.entrada) * trade.tamano).toFixed(2)
        trade.pl_pct = +pct.toFixed(2)
        trade.rr_real = trade.pl > 0 ? +((trade.salida - trade.entrada) / (trade.entrada * 0.01 * trade.rr)).toFixed(1) : -1
      }
      trades.push(trade)
      await env.TRADES_KV.put('trades', JSON.stringify(trades))
      return new Response(JSON.stringify(trade), { status: 201, headers: CORS })
    }

    // DELETE /api/trades (todos)
    if (path === '/api/trades' && request.method === 'DELETE') {
      await env.TRADES_KV.put('trades', JSON.stringify([]))
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    }

    // DELETE /api/trades/:id
    const matchId = path.match(/^\/api\/trades\/([a-z0-9]+)$/)
    if (matchId && request.method === 'DELETE') {
      let trades = (await env.TRADES_KV.get('trades', { type: 'json' })) || []
      const before = trades.length
      trades = trades.filter(t => t.id !== matchId[1])
      if (trades.length === before) {
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: CORS })
      }
      await env.TRADES_KV.put('trades', JSON.stringify(trades))
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    }

    // GET /api/stats
    if (path === '/api/stats' && request.method === 'GET') {
      const trades = (await env.TRADES_KV.get('trades', { type: 'json' })) || []
      const closed = trades.filter(t => t.salida !== null && t.salida !== undefined)
      const wins = closed.filter(t => t.pl > 0)
      const losses = closed.filter(t => t.pl < 0)
      const totalPl = closed.reduce((s, t) => s + (t.pl || 0), 0)
      const avgRr = closed.length ? +(closed.reduce((s, t) => s + (t.rr_real || 0), 0) / closed.length).toFixed(2) : 0
      const winRate = closed.length ? +((wins.length / closed.length) * 100).toFixed(1) : 0
      const profitFactor = losses.length ? +(wins.reduce((s, t) => s + Math.abs(t.pl || 0), 0) / Math.max(1, losses.reduce((s, t) => s + Math.abs(t.pl || 0), 0))).toFixed(2) : 0
      return new Response(JSON.stringify({
        total: trades.length,
        closed: closed.length,
        wins: wins.length,
        losses: losses.length,
        winRate,
        profitFactor,
        avgRr,
        totalPl: +totalPl.toFixed(2),
        open: trades.filter(t => t.salida === null || t.salida === undefined).length,
      }), { headers: CORS })
    }

    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: CORS })
  },
}
