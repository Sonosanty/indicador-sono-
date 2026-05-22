const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');

const NOTEBOOKLM_PATH = 'C:\\notebooklm-py';

async function queryNotebook(query) {
  console.log(`[NotebookLM] Consultando: ${query}`);
  
  const fs = require('fs');
  if (!fs.existsSync(NOTEBOOKLM_PATH)) {
    return {
      success: false,
      query: query,
      error: 'NotebookLM-py no está instalado',
      result: 'Instala NotebookLM-py primero: git clone https://github.com/barrenechea/notebooklm-py.git C:\\notebooklm-py'
    };
  }
  
  const escapedQuery = query.replace(/"/g, '\\"');
  const cmd = `cd ${NOTEBOOKLM_PATH} && .\\venv\\Scripts\\activate && python query.py "${escapedQuery}"`;
  
  try {
    const { stdout, stderr } = await execPromise(cmd, {
      timeout: 30000,
      shell: 'powershell.exe'
    });
    
    if (stderr && !stdout) {
      return {
        success: false,
        query: query,
        error: stderr,
        result: 'Error ejecutando NotebookLM'
      };
    }
    
    return {
      success: true,
      query: query,
      result: stdout.trim(),
      source: 'NotebookLM-py (base de conocimiento local)'
    };
    
  } catch (error) {
    console.error('[NotebookLM] Error:', error.message);
    
    return {
      success: false,
      query: query,
      error: error.message,
      result: 'Verifica que NotebookLM-py esté instalado y configurado correctamente'
    };
  }
}

module.exports = { 
  queryNotebook,
  tools: {
    query: async (params) => {
      return await queryNotebook(params.query);
    }
  }
};
