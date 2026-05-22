// C:\Users\sparreno\.openclaw\workspace\skills\perplexity-search\perplexity-search.mjs
/**
 * PERPLEXITY-SEARCH.MJS
 * Implementacion ultra-robusta inspirada en la arquitectura de LvcidPsyche/Auto-Browser.
 * Utiliza el perfil persistente de OpenClaw donde el usuario ya esta logueado como 'sono10199211'
 * para reutilizar las cookies de sesion y bypass de Cloudflare de forma inmediata y automática.
 * Soporta la nueva interfaz de Perplexity con el editor Lexical (contenteditable div#ask-input).
 */

import { chromium } from "playwright";
import path from "path";
import os from "os";
import fs from "fs";

const args = process.argv.slice(2);
const isVisible = args.includes("--visible") || process.env.VISIBLE === "true" || process.env.HEADLESS === "false";
const query = args.filter(a => a !== "--visible").join(" ").trim();

// Seleccionar la ruta del perfil de forma inteligente e integrada con OpenClaw
let profilePath = path.join(os.homedir(), ".openclaw", "browser", "openclaw", "user-data");

if (!fs.existsSync(profilePath)) {
    // Fallback al perfil aislado de la habilidad
    profilePath = path.join(os.homedir(), ".openclaw", "profiles", "perplexity-profile");
}

async function run() {
    console.error(`[Auto-Browser] Cargando perfil persistente integrado en: ${profilePath}`);
    console.error(`[Auto-Browser] Modo: ${isVisible ? "VISIBLE (Manual/Operador)" : "HEADLESS (Automatizado)"}`);

    let context;
    try {
        // Lanzar con perfil persistente para reutilizar el login activo de 'sono10199211'
        context = await chromium.launchPersistentContext(profilePath, {
            headless: !isVisible,
            viewport: { width: 1280, height: 720 },
            locale: "es-ES",
            timezoneId: "Europe/Madrid",
            args: [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox"
            ]
        });

        const page = context.pages()[0] || await context.newPage();
        
        // Configurar cabeceras reales
        await page.setExtraHTTPHeaders({
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
        });

        // Modo Setup (sin query): Navegar a Perplexity para mantenimiento visible
        if (!query) {
            console.error("\n[Auto-Browser] MODO SETUP: Navegando a Perplexity.ai...");
            await page.goto("https://www.perplexity.ai", { waitUntil: "domcontentloaded", timeout: 60000 });
            
            console.error("[Auto-Browser] Perfil visible activo. Cierra la ventana cuando termines para guardar el estado.\n");
            await new Promise(resolve => {
                context.on("close", resolve);
            });
            console.log(JSON.stringify({ success: true, message: "Perfil guardado con exito." }));
            return;
        }

        // Ejecutar busqueda automatizada con confluencia
        console.error(`[Auto-Browser] Navegando a Perplexity con consulta: "${query}"`);
        await page.goto("https://www.perplexity.ai", { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(3000);

        // Selectores adaptativos modernos para encontrar el cuadro de entrada (incluye div#ask-input y textarea)
        const inputSelectors = [
            "div#ask-input",
            "div[contenteditable='true']",
            "[id='ask-input']",
            "textarea[placeholder*='Ask']",
            "textarea[placeholder*='pregunta']",
            "textarea[placeholder*='Anything']",
            "textarea"
        ];
        
        let searchBox = null;
        for (const selector of inputSelectors) {
            try {
                searchBox = await page.waitForSelector(selector, { timeout: 3000 });
                if (searchBox) {
                    console.error(`[Auto-Browser] Cuadro de entrada localizado con selector: "${selector}"`);
                    break;
                }
            } catch (e) {
                // Siguiente selector
            }
        }

        if (!searchBox) {
            throw new Error("No se pudo localizar el campo de entrada de Perplexity. Posible bloqueo de Cloudflare.");
        }

        // Focusear y escribir de forma humana para disparar los eventos Lexical/React
        await searchBox.focus();
        await page.keyboard.type(query, { delay: 30 }); // Simula pulsaciones fisicas de teclas
        await page.waitForTimeout(500);
        await page.keyboard.press("Enter");
        
        console.error("[Auto-Browser] Consulta enviada con exito. Esperando streaming de respuesta...");

        // Esperar a que inicie la navegacion y el streaming de la respuesta
        await page.waitForTimeout(5000);

        // Deteccion de fin de stream midiendo el crecimiento del texto de respuesta (.prose o div similar)
        let prevLength = 0;
        let noChangeCount = 0;
        let answerText = "";
        
        for (let i = 0; i < 20; i++) { // Maximo 40 segundos de streaming
            await page.waitForTimeout(2000);
            
            answerText = await page.evaluate(() => {
                // Busqueda del contenedor principal de la respuesta de Perplexity (.prose)
                const prose = document.querySelector(".prose");
                if (prose) return prose.innerText;
                
                // Buscar parrafos de respuesta
                const divs = Array.from(document.querySelectorAll("div"));
                for (const d of divs) {
                    const text = d.innerText || "";
                    if (text.length > 200 && !text.includes("Sign In") && !text.includes("Ask anything") && !text.includes("Compartir")) {
                        return text;
                    }
                }
                return "";
            });

            const currentLength = answerText.trim().length;
            console.error(`[Auto-Browser] Longitud del texto: ${currentLength} caracteres...`);

            if (currentLength > 50 && currentLength === prevLength) {
                noChangeCount++;
                if (noChangeCount >= 2) { // 4 segundos sin cambios => Fin de transmision
                    console.error("[Auto-Browser] El streaming ha finalizado.");
                    break;
                }
            } else {
                noChangeCount = 0;
            }
            prevLength = currentLength;
        }

        if (!answerText) {
            // Extracción alternativa general
            answerText = await page.evaluate(() => {
                const proseElements = Array.from(document.querySelectorAll(".prose p, .prose li"));
                if (proseElements.length > 0) {
                    return proseElements.map(el => el.innerText).join("\n\n");
                }
                return document.body.innerText.substring(0, 3000);
            });
        }

        await context.close();
        
        console.log(JSON.stringify({
            success: true,
            engine: "perplexity-autobrowser",
            query: query,
            answer: answerText.trim(),
            profile_used: profilePath
        }, null, 2));

    } catch (err) {
        if (context) await context.close().catch(() => {});
        console.log(JSON.stringify({
            success: false,
            error: err.message,
            tip: "Si hay un bloqueo persistente, corre 'node perplexity-search.mjs --visible' para validacion manual."
        }, null, 2));
    }
}

run();
