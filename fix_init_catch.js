const fs = require("fs");
let js = fs.readFileSync(
  "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js",
  "utf8"
);

const initFn = "(async function init(){\n";
const initStart = js.indexOf(initFn);
if (initStart >= 0) {
  const bodyStart = initStart + initFn.length;
  const tryBlock = "try{\n";

  // Encontrar el cierre de init()
  const afterInit = js.indexOf("})();", initStart);
  const closeBrace = js.lastIndexOf("}", afterInit);

  if (closeBrace > bodyStart) {
    js =
      js.substring(0, bodyStart) +
      tryBlock +
      js.substring(bodyStart, closeBrace) +
      '\n}catch(e){console.error("[STX] init() error:",e);if(window.updateSonoMethod)window.updateSonoMethod({price:lastScore?.price||0});\n' +
      js.substring(closeBrace);

    fs.writeFileSync(
      "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js",
      js,
      "utf8"
    );
    console.log("try/catch anadido a init()");

    const { execSync } = require("child_process");
    execSync('node --check "' + "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js" + '"', { encoding: "utf8" });
    console.log("node --check: OK");
  }
}
