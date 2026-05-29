# Tareas Pendientes — Sono Pro

## Estado del bot (17:23)
BTC/VENTA, ETH/DISTRIBUCIÓN — ni uno en COMPRA. Mercado bajista, el bot espera.

## Pendientes ordenadas por prioridad

### 🔴 Crítico (bloquea funcionalidad)
- [ ] Depositar USDT en Pionex para activar trading de SOL y XRP
- [ ] Purgar caché CDN del deploy security (Cloudflare no refresca html automático)

### 🟡 Prioridad media
- [ ] Backend D1 SQLite (Cloudflare Workers) para persistencia real de trades
- [ ] Alertas Telegram desde el frontend
- [ ] Bot Pionex: implementar trailing stop dinámico por ATR
- [ ] Dashboard: añadir modo oscuro/claro
- [ ] Landing: VIX real mediante Cloudflare Worker proxy (evitar CORS)

### 🟢 Mejoras cosméticas/bajas
- [ ] PWA (manifest.json + service worker) para instalación en móvil
- [ ] Exportar trades a CSV
- [ ] Backtesting histórico con el bot Python
- [ ] Añadir timeframe 3m al dashboard (solo 1m/5m/15m ahora)
- [ ] Landing: añadir snapshot histórico por card (min/max/Δ ya están, falta gráfico sparkline)
- [ ] Limpiar el .git/ que se creó en indicador_cloudflare/ (innecesario)

## Notas
- El deploy a main falla porque Wrangler no respeta --branch main correctamente
- La suscripción a Pionex no tiene bots grid activos
- Hay ~$18.76 USDC y ~$0.0026 USDT en la cuenta
- Script sono_bot.py corriendo en PID 5752, logs a sono_bot.log
