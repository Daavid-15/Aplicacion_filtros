

// ============================================
// CONFIGURACIÓN GLOBAL Y CONSTANTES
// ============================================

// URL base para las llamadas a la API (se establecerá mediante modal)
let API_BASE_URL = '';

// Configuración actual del sistema
let currentConfig = {
    time_ranges: [],
    filters: {},
    order: "asc",
    max_usage: 85
};

// Definición de tipos de acero y sus patrones
const STEEL_TYPES = {
    "H___A33": { pattern: /^H.{3}A33$/, description: "H___A33" },
    "H___L33": { pattern: /^H.{3}L33$/, description: "H___L33" },
    "H___N33": { pattern: /^H.{3}N33$/, description: "H___N33" },
    "H___W33": { pattern: /^H.{3}W33$/, description: "H___W33" },
    "R___A55": { pattern: /^R.{3}A55$/, description: "R___A55" },
    "B___E33": { pattern: /^B.{3}E33$/, description: "B___E33" },
    "A6__A55": { pattern: /^A6.{2}A55$/, description: "A6__A55" },
    "E___A__": { pattern: /^E.{3}A.{2}$/, description: "E___A__" },
    "F___S__": { pattern: /^F.{3}S.{2}$/, description: "F___S__" },
    "F___P__": { pattern: /^F.{3}P.{2}$/, description: "F___P__" },
    "___S__": { pattern: /^.{3}S.{2}$/, description: "___S__" },
    "A___A__": { pattern: /^A.{3}A.{2}$/, description: "A___A__" },
    "C___T33": { pattern: /^C.{3}T33$/, description: "C___T33" },
    "H___A55": { pattern: /^H.{3}A55$/, description: "H___A55" }
};

// Definición de usos de acero y sus tipos asociados
const STEEL_USES = {
    "Neumaticos": [STEEL_TYPES["H___A33"], STEEL_TYPES["H___L33"], STEEL_TYPES["H___N33"]],
    "Cuerdas": [STEEL_TYPES["H___W33"]],
    "Muelles": [STEEL_TYPES["R___A55"]],
    "Estampacion": [STEEL_TYPES["B___E33"]],
    "Electrodos": [STEEL_TYPES["A6__A55"]],
    "Pseudo": [STEEL_TYPES["E___A__"], STEEL_TYPES["F___S__"]],
    "FreeCuttingResulfuradas": [STEEL_TYPES["F___P__"], STEEL_TYPES["___S__"]],
    "BajoCarbono": [STEEL_TYPES["A___A__"]],
    "Pretensados": [STEEL_TYPES["C___T33"]],
    "CablesYMuelles": [STEEL_TYPES["H___A55"]]
};

/**
 * Establece la URL del backend desde el modal inicial
 */
// En config.js - el modal pide URL completa, pero hay que validarla
function setBackendUrl() {
    const urlInput = document.getElementById('backendUrl');
    const url = urlInput.value.trim();
    
    // 👇 Añadir validación de URL
    try {
        new URL(url); // Esto valida que sea una URL válida
    } catch (e) {
        alert('URL inválida. Formato esperado: http://ip:puerto o http://dominio.com');
        return;
    }
    
    API_BASE_URL = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // Cerrar modal
    document.getElementById('backendModal').style.display = 'none';
    
    // Actualizar debug
    updateDebugInfo(`🔗 Backend configurado: ${API_BASE_URL}`);
    addLog(`Backend configurado en: ${API_BASE_URL}`, 'SUCCESS');
    
    // Intentar conexión inicial
    loadInitialState();

}
