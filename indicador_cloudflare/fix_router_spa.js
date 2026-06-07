const fs = require('fs');

// 1. Leer metodo.html y rangos.html para embeber su contenido
// (así no dependemos de fetch y archivos separados en el output)
const path = require('path');
const base = path.resolve(__dirname, '..');
let metodoHtml = '';
try { metodoHtml = fs.readFileSync(path.join(base, 'metodo.html'), 'utf8'); } catch(e) { console.error('No se pudo leer metodo.html:', e.message); }
let rangosHtml = '';
try { rangosHtml = fs.readFileSync(path.join(base, 'rangos.html'), 'utf8'); } catch(e) { console.error('No se pudo leer rangos.html:', e.message); }

// Extraer solo el body content (sin html/head/body tags)
function extractBodyContent(fullHtml) {
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  return fullHtml;
}

let html = fs.readFileSync('index.html', 'utf8');

// 2. Justo antes de </div><!-- /page -->, inyectar contenedores ocultos para metodo y rangos
const pageEnd = '</div><!-- /page -->';
const metodoBody = extractBodyContent(metodoHtml);
const rangosBody = extractBodyContent(rangosHtml);

// Escapar backticks y ${} en el contenido embebido
const safeMetodo = metodoBody.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const safeRangos = rangosBody.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const hiddenPages = `
  <!-- \u2605 PAGINAS SPA OCULTAS \u2605 -->
  <div id="pageDashboard" style="display:block">
    <div class="main-grid">
` + html.match(/<div class="main-grid">([\s\S]*?)<\/div><!-- \/main-grid -->/)?.[1] + `
    </div>
  </div>
  <div id="pageMetodo" style="display:none">
    ${safeMetodo}
  </div>
  <div id="pageRangos" style="display:none">
    ${safeRangos}
  </div>
`;

// En realidad, este approach es demasiado complejo y frágil porque el dashboard
// tiene el main-grid inline. Mejor un router que oculte/muestre secciones.

// ENFOQUE CORREGIDO: router SPA que envuelve el contenido existente
html = fs.readFileSync('index.html', 'utf8');

// Buscar los IDs de los elementos de navegación
// Extraer el main-grid completo
const mainGridMatch = html.match(/<div class="main-grid">([\s\S]*?)<\/div><!-- \/main-grid -->/);
if (!mainGridMatch) { console.error('NO se encontró main-grid'); process.exit(1); }

const mainGridContent = mainGridMatch[0];

// Crear las 3 versiones del contenido (Dashboard = mainGrid, Metodo y Rangos = texto informativo)
const dashboardSection = `<div id="page-dashboard" style="display:block">
${mainGridContent}
</div>`;

// Para Metodo y Rangos, como no podemos embeber HTMLs completos fácilmente,
// mejor mostrar contenido informativo y enlazar al dashboard
const metodoSection = `<div id="page-metodo" style="display:none;padding:1.5rem">
  <div class="card" style="padding:2rem;max-width:700px;margin:0 auto">
    <div class="card-title" style="font-size:16px;margin-bottom:1.5rem">M\u00e9todo Sono PRO</div>
    <div style="font-size:13px;line-height:1.7;color:var(--tx2)">
      <p style="margin-bottom:1rem">El Score Maestro Sono es un sistema de trading basado en 3 pilares:</p>
      <ul style="margin:0 0 1rem 1.5rem">
        <li><strong>P1 Tendencia MAs:</strong> Cruce de medias m\u00f3viles (MA6 x MA70), precio vs MA40, precio vs MA200</li>
        <li><strong>P2 Momentum:</strong> RSI + ADX + se\u00f1ales de confluencia</li>
        <li><strong>P3 Bollinger:</strong> %B + Squeeze + anchura de bandas</li>
      </ul>
      <p style="margin-bottom:1rem">Cada pilar aporta hasta 35/35/30 puntos respectivamente, para un m\u00e1ximo de 100.</p>
      <p style="margin-bottom:1rem">El MTF Score pondera m\u00faltiples timeframes (1m 10%, 3m 15%, 5m 25%, 15m 50%) para un score compuesto.</p>
      <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--b2)">
        <a href="/" onclick="event.preventDefault();router('/')" style="color:var(--blue)">Volver al Dashboard</a>
      </div>
    </div>
  </div>
</div>`;

const rangosSection = `<div id="page-rangos" style="display:none;padding:1.5rem">
  <div class="card" style="padding:2rem;max-width:700px;margin:0 auto">
    <div class="card-title" style="font-size:16px;margin-bottom:1.5rem">Rangos de Decisi\u00f3n</div>
    <div style="font-size:13px;line-height:1.7;color:var(--tx2)">
      <table style="width:100%;border-collapse:collapse">
        <tr style="border-bottom:1px solid var(--b2)"><th style="text-align:left;padding:.5rem">Rango</th><th style="text-align:left;padding:.5rem">Acci\u00f3n</th><th style="text-align:left;padding:.5rem">Direcci\u00f3n</th></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:.5rem">78-100</td><td style="padding:.5rem">Compra fuerte</td><td style="padding:.5rem;color:var(--green)">LONG</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:.5rem">62-77</td><td style="padding:.5rem">Compra</td><td style="padding:.5rem;color:var(--green)">LONG+</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:.5rem">52-61</td><td style="padding:.5rem">Acumular</td><td style="padding:.5rem;color:var(--cyan)">PARCIAL</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:.5rem">42-51</td><td style="padding:.5rem">Neutral</td><td style="padding:.5rem;color:var(--tx3)">ESPERAR</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:.5rem">30-41</td><td style="padding:.5rem">Venta</td><td style="padding:.5rem;color:var(--red)">SHORT+</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:.5rem">18-29</td><td style="padding:.5rem">Venta fuerte</td><td style="padding:.5rem;color:var(--red)">SHORT</td></tr>
        <tr><td style="padding:.5rem">0-17</td><td style="padding:.5rem">Capitulaci\u00f3n</td><td style="padding:.5rem;color:var(--red)">CASH</td></tr>
      </table>
      <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--b2)">
        <a href="/" onclick="event.preventDefault();router('/')" style="color:var(--blue)">Volver al Dashboard</a>
      </div>
    </div>
  </div>
</div>`;

// Reemplazar el main-grid y todo después hasta el foot
const beforeMainGrid = html.substring(0, html.indexOf('<div class="main-grid">'));
const afterMainGrid = html.substring(html.indexOf('</div><!-- /main-grid -->') + '</div><!-- /main-grid -->'.length);
const footMatch = afterMainGrid.match(/<div class="foot">/);
const afterContent = footMatch ? afterMainGrid.substring(0, footMatch.index) : afterMainGrid;

const newContent = `${dashboardSection}${metodoSection}${rangosSection}`;

html = beforeMainGrid + newContent + afterMainGrid;

// Reemplazar los <a href="..."> del nav para que usen el router
const navLinks = [
  ['<a href="/" class="ac">Dashboard</a>', '<a href="/" class="ac" data-page="/">Dashboard</a>'],
  ['<a href="/metodo">M\u00e9todo</a>', '<a href="/metodo" data-page="/metodo">M\u00e9todo</a>'],
  ['<a href="/rangos">Rangos</a>', '<a href="/rangos" data-page="/rangos">Rangos</a>'],
  ['<a href="/trades">Trades</a>', '<a href="/trades" data-page="/trades">Trades</a>'],
];

navLinks.forEach(([oldHref, newHref]) => {
  if (html.includes(oldHref)) {
    html = html.replace(oldHref, newHref);
    console.log('✅ Nav link actualizado:', oldHref.substring(0, 40));
  } else {
    // Buscar variante
    const searchStr = oldHref.substring(0, 15);
    const idx = html.indexOf(searchStr);
    if (idx > 0) console.log('⚠️ No match exacto para:', oldHref, 'encontrado cerca:', html.substring(idx, idx + 60));
  }
});

// Añadir el router JS justo después del último script o antes de </script></body></html>
const closingScript = '</script>\n</body>\n</html>';
const routerJS = `
<script>
/* === SPA ROUTER === */
(function() {
  // Mapeo de rutas a IDs de página
  const routes = {
    '/':        'page-dashboard',
    '/metodo':  'page-metodo',
    '/rangos':  'page-rangos',
    '/trades':  'page-dashboard',  // trades está en el dashboard
  };

  const pageIds = Object.values(routes);
  const navLinks = document.querySelectorAll('.nav a[data-page]');

  function showPage(path) {
    // Ocultar todas
    pageIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Mostrar la activa
    const target = routes[path] || routes['/'];
    const el = document.getElementById(target);
    if (el) el.style.display = 'block';

    // Actualizar clase activa en nav
    navLinks.forEach(a => {
      a.classList.toggle('ac', a.getAttribute('data-page') === path);
    });

    // Si es /trades, asegurar que la tabla de trades se renderice
    if (path === '/trades' && typeof renderTrades === 'function' && window.allTrades) {
      setTimeout(() => renderTrades(window.allTrades, window.priceLive || 0), 100);
    }
  }

  // Interceptar clicks en nav links
  navLinks.forEach(a => {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      const path = this.getAttribute('data-page');
      history.pushState({path}, '', path);
      showPage(path);
    });
  });

  // Manejar back/forward del navegador
  window.addEventListener('popstate', function(e) {
    const path = e.state?.path || location.pathname;
    showPage(path);
  });

  // Ruta inicial
  const initialPath = location.pathname;
  if (initialPath !== '/') {
    showPage(initialPath);
  }

  // Exponer router para uso desde otros scripts
  window.router = showPage;
})();
</script>
`;

// Insertar router justo antes del cierre </body>
const bodyClose = html.lastIndexOf('</body>');
if (bodyClose > 0) {
  html = html.substring(0, bodyClose) + routerJS + '\n' + html.substring(bodyClose);
  console.log('✅ Router SPA insertado antes de </body>');
}

// Verificar
console.log(`Tamaño final: ${html.length} bytes`);
console.log(`</html> presente: ${html.includes('</html>')}`);
console.log(`router() definido: ${html.includes('window.router')}`);
console.log(`page-dashboard: ${html.includes('page-dashboard')}`);
console.log(`page-metodo: ${html.includes('page-metodo')}`);
console.log(`page-rangos: ${html.includes('page-rangos')}`);

fs.writeFileSync('index.html', html, 'utf8');
console.log('✅ index.html guardado');
