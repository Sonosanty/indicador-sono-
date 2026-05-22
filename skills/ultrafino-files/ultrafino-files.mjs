import { readFileSync, existsSync } from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const filePath = process.argv.slice(2).join(" ").trim();

if (!filePath) {
    console.log(JSON.stringify({ success: false, error: "Ruta de archivo no especificada" }));
    process.exit(0);
}

const ext = path.extname(filePath).toLowerCase();

async function leerArchivo() {
    if (!existsSync(filePath)) {
        return { success: false, error: `Archivo no encontrado: ${filePath}` };
    }

    try {
        // TXT, CSV, PS1, PowerShell, MD
        if ([".txt",".csv",".ps1",".psm1",".psd1",".md",".json",".xml",".html",".js",".ts"].includes(ext)) {
            const content = readFileSync(filePath, "utf-8");
            const lines = content.split("\n").length;
            return {
                success: true,
                type: ext.replace(".",""),
                lines,
                content: content.substring(0, 50000),
                truncated: content.length > 50000
            };
        }

        // Excel - requiere xlsx en node_modules de OpenClaw
        if ([".xlsx",".xls"].includes(ext)) {
            try {
                const XLSX = require("C:\\OpenClaw\\node_modules\\xlsx");
                const wb = XLSX.readFile(filePath);
                const result = {};
                wb.SheetNames.forEach(name => {
                    const ws = wb.Sheets[name];
                    result[name] = XLSX.utils.sheet_to_csv(ws).substring(0, 20000);
                });
                return { success: true, type: "excel", sheets: wb.SheetNames, data: result };
            } catch(e) {
                return { success: false, error: `Excel no disponible: ${e.message}. Exporta a CSV para analizar.` };
            }
        }

        // PDF
        if (ext === ".pdf") {
            return {
                success: false,
                error: "PDF requiere conversion previa. Usa: copy el PDF y extrae texto con Adobe o convertidor online, luego guarda como TXT.",
                sugerencia: "Para analizar PDFs en OpenClaw, guarda primero como TXT."
            };
        }

        // Word DOCX
        if ([".docx",".doc"].includes(ext)) {
            try {
                const mammoth = require("C:\\OpenClaw\\node_modules\\mammoth");
                const result = await mammoth.extractRawText({ path: filePath });
                return { success: true, type: "word", content: result.value.substring(0, 50000) };
            } catch(e) {
                return { success: false, error: `Word no disponible: ${e.message}. Instala mammoth: cd C:\\OpenClaw && npm install mammoth` };
            }
        }

        return { success: false, error: `Formato no soportado: ${ext}` };

    } catch(err) {
        return { success: false, error: err.message };
    }
}

leerArchivo().then(r => console.log(JSON.stringify(r)));