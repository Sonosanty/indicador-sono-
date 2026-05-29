#!/usr/bin/env node
// Sono Pro — Skill de despliegue y monitoreo
// Uso: node sono-deploy.mjs [deploy|status|monitor|help]

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROYECT_DIR = path.resolve(__dirname, '..', '..', 'indicador_cloudflare');
const WRANGLER = 'npx wrangler pages deploy';

function banner() {
  console.log('');
  console.log('  ╔══════════════════════════════╗');
  console.log('  ║   SONO PRO — DEPLOY SKILL    ║');
  console.log('  ╚══════════════════════════════╝');
  console.log('');
}

function checkSyntax() {
  console.log('  🔍 Verificando sintaxis JS...');
  const files = fs.readdirSync(PROYECT_DIR, { recursive: true })
    .filter(f => f.endsWith('.html'));
  
  let ok = true;
  for (const file of files) {
    const html = fs.readFileSync(path.join(PROYECT_DIR, file), 'utf-8');
    const start = html.indexOf('<script>');
    if (start >= 0) {
      const end = html.indexOf('</script>', start);
      const js = html.substring(start + 8, end);
      try {
        new Function(js);
        console.log(`    ✅ ${file}`);
      } catch (e) {
        console.log(`    ❌ ${file}: ${e.message.split('\n')[0]}`);
        ok = false;
      }
    }
  }
  return ok;
}

function deploy() {
  banner();
  console.log('  📦 Proyecto:', PROYECT_DIR);
  console.log('');
  
  // 1. Check syntax
  if (!checkSyntax()) {
    console.log('\n  ❌ Abortando deploy — hay errores de sintaxis JS');
    process.exit(1);
  }
  
  // 2. Backup
  const backupDir = path.join(PROYECT_DIR, '..', `backup_${new Date().toISOString().slice(0,10)}_${Date.now()}`);
  console.log(`\n  📋 Backup: ${backupDir}`);
  try {
    execSync(`xcopy "${PROYECT_DIR}" "${backupDir}" /E /I /Y`, { stdio: 'ignore' });
    console.log('  ✅ Backup creado');
  } catch (e) {
    console.log('  ⚠️  Backup falló, continuando...');
  }
  
  // 3. Deploy
  console.log('\n  🚀 Desplegando a Cloudflare Pages...');
  try {
    const result = execSync(`${WRANGLER} "${PROYECT_DIR}" --project-name indicador-sono --branch main`, {
      cwd: PROYECT_DIR,
      stdio: 'pipe',
      timeout: 120000
    });
    const output = result.toString();
    const urlMatch = output.match(/https:\/\/[a-z0-9]+\.indicador-sono\.pages\.dev/);
    console.log('  ✅ Deploy completado');
    if (urlMatch) console.log(`  🌐 Preview: ${urlMatch[0]}`);
    console.log(`  🌐 Producción: https://indicador-sono.pages.dev`);
  } catch (e) {
    console.log('  ❌ Deploy falló:', e.message.split('\n')[0]);
    process.exit(1);
  }
}

function status() {
  banner();
  console.log('  📊 Estado de Sono Pro');
  console.log('');
  console.log('  🌐 Producción:');
  console.log('    Landing:   https://indicador-sono.pages.dev/');
  console.log('    Dashboard: https://indicador-sono.pages.dev/dashboard_sono/');
  console.log('    Trades:    https://indicador-sono.pages.dev/trades/');
  console.log('');
  console.log('  📁 Local:');
  console.log('    Proyecto: ' + PROYECT_DIR);
  console.log('');
  console.log('  📋 Pendientes:');
  console.log('    1. Conectar Fear & Greed API');
  console.log('    2. Añadir Dominancia BTC (CoinGecko)');
  console.log('    3. WebSocket Binance para tiempo real');
  console.log('    4. División en 3 páginas (Macro / Trades / Range)');
  console.log('    5. Equity curve con Cloudflare Worker + D1');
}

function monitor() {
  banner();
  console.log('  📡 Monitoreando endpoints...');
  console.log('');
  
  const urls = [
    ['Landing', 'https://indicador-sono.pages.dev/'],
    ['Dashboard', 'https://indicador-sono.pages.dev/dashboard_sono/'],
    ['Trades', 'https://indicador-sono.pages.dev/trades/']
  ];
  
  urls.forEach(([name, url]) => {
    try {
      const result = execSync(`curl -s -o NUL -w "%{http_code} | %{time_total}s" "${url}"`, {
        timeout: 10000,
        stdio: 'pipe'
      });
      console.log(`  ${name.padEnd(12)} ${result.toString().trim()}`);
    } catch (e) {
      console.log(`  ${name.padEnd(12)} ❌ Error: ${e.message.split('\n')[0]}`);
    }
  });
}

// Main
const action = process.argv[2] || 'deploy';
switch (action) {
  case 'deploy': deploy(); break;
  case 'status': status(); break;
  case 'monitor': monitor(); break;
  default:
    console.log('Uso: node sono-deploy.mjs [deploy|status|monitor|help]');
}
