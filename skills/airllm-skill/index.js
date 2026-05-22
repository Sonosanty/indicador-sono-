const axios = require('axios');

const AIRLLM_URL = 'http://localhost:5000/generate';

async function generateAirLLM(prompt) {
  console.log(`[AirLLM] Generando respuesta para: ${prompt.substring(0, 50)}...`);
  
  try {
    const response = await axios.post(AIRLLM_URL, {
      prompt: prompt
    }, {
      timeout: 60000
    });
    
    if (response.data && response.data.response) {
      return {
        success: true,
        prompt: prompt,
        result: response.data.response,
        source: 'AirLLM (modelo local GPU)'
      };
    } else {
      return {
        success: false,
        prompt: prompt,
        error: 'Respuesta inválida del servidor AirLLM',
        result: 'Verifica que el servidor AirLLM esté corriendo'
      };
    }
    
  } catch (error) {
    console.error('[AirLLM] Error:', error.message);
    
    let errorMsg = 'Error conectando con AirLLM';
    if (error.code === 'ECONNREFUSED') {
      errorMsg = 'Servidor AirLLM no corriendo. Inicia: python C:\\AirLLM\\server.py';
    } else if (error.code === 'ETIMEDOUT') {
      errorMsg = 'Timeout esperando respuesta del modelo';
    }
    
    return {
      success: false,
      prompt: prompt,
      error: error.message,
      result: errorMsg
    };
  }
}

module.exports = { 
  generateAirLLM,
  tools: {
    generate: async (params) => {
      return await generateAirLLM(params.prompt);
    }
  }
};
