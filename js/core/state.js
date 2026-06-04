/**
 * js/core/state.js — Store reactivo mínimo
 * Sin framework, solo pub/sub simple para actualizaciones de UI
 *
 * Uso:
 *   import { store } from './js/core/state.js';
 *   store.subscribe('price', val => updateUI(val));
 *   store.set('price', 64000);
 */

class Store {
  constructor(initial) {
    this._state = { ...initial };
    this._listeners = {};
    this._globalListeners = [];
  }

  get(key) {
    return this._state[key];
  }

  getAll() {
    return { ...this._state };
  }

  set(key, value) {
    const prev = this._state[key];
    if (prev === value) return;
    this._state[key] = value;
    this._notify(key, value, prev);
  }

  setMultiple(pairs) {
    for (const [key, value] of Object.entries(pairs)) {
      const prev = this._state[key];
      if (prev !== value) {
        this._state[key] = value;
        this._notify(key, value, prev);
      }
    }
  }

  subscribe(key, fn) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(fn);
    return () => this._unsubscribe(key, fn);
  }

  onAny(fn) {
    this._globalListeners.push(fn);
    return () => {
      const idx = this._globalListeners.indexOf(fn);
      if (idx >= 0) this._globalListeners.splice(idx, 1);
    };
  }

  _notify(key, value, prev) {
    const subs = this._listeners[key];
    if (subs) {
      subs.forEach(fn => { try { fn(value, prev); } catch (e) { console.warn('[Store] listener error:', e); } });
    }
    this._globalListeners.forEach(fn => { try { fn(key, value, prev); } catch (e) { console.warn('[Store] global listener error:', e); } });
  }

  _unsubscribe(key, fn) {
    const subs = this._listeners[key];
    if (subs) {
      const idx = subs.indexOf(fn);
      if (idx >= 0) subs.splice(idx, 1);
    }
  }

  clear() {
    this._state = {};
    this._listeners = {};
    this._globalListeners = [];
  }
}

// Store global único
const store = new Store({
  asset: 'BTC',
  timeframe: '15m',
  price: 0,
  change24hPct: 0,
  high24h: 0,
  low24h: 0,
  fng: 50,
  vix: 0,
  btcDom: 0,
  ethDom: 0,
  marketCap: 0,
  eurUsd: 1.08,
  score: null,
  scoreLabel: '--',
  rsi3d: null,
  klines: {},
  health: { source: '---', stale: false, latencyMs: 0 },
  connected: false,
});

export { store };
