// ============================================
// INICIALIZACIÓN Y FUNCIONES PRINCIPALES
// ============================================

/**
 * Inicializa la interfaz de usuario
 */
function initializeInterface() {
    updateDebugInfo(`🚀 Inicializando interfaz...`);
    
    const steelUsesContainer = document.getElementById('steelUsesContainer');
    for (const [useName, types] of Object.entries(STEEL_USES)) {
        const useElement = document.createElement('div');
        useElement.className = 'steel-use';
        useElement.textContent = useName;
        useElement.onclick = function() { toggleSteelUse(this); };
        steelUsesContainer.appendChild(useElement);
    }
    
    const steelTypesContainer = document.getElementById('steelTypesContainer');
    for (const [typeKey, typeData] of Object.entries(STEEL_TYPES)) {
        const typeElement = document.createElement('div');
        typeElement.className = 'steel-type';
        typeElement.textContent = typeData.description;
        typeElement.dataset.key = typeKey;
        typeElement.onclick = function() { toggleSteelType(this); };
        steelTypesContainer.appendChild(typeElement);
    }
    
    document.getElementById('maxUsage').addEventListener('change', function() {
        currentConfig.max_usage = parseInt(this.value);
    });
    
    updateDebugInfo(`✅ Interfaz inicializada`);
}

/**
 * Carga el estado inicial desde el backend
 */
async function loadInitialState() {
    try {
        setConnectionStatus('connecting');
        const status = await apiCall('/STATUS');
        updateStatusDisplay(status);
        addLog('Conexión con backend establecida', 'SUCCESS');
    } catch (error) {
        addLog('No se pudo conectar con el backend', 'ERROR');
    }
}

/**
 * Actualización periódica del estado del sistema
 */
async function periodicUpdate() {
    try {
        const status = await apiCall('/STATUS');
        updateStatusDisplay(status);
    } catch (error) {
        // Error silencioso en actualización periódica
    }
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    updateDebugInfo(`🎯 DOM cargado, inicializando aplicación...`);
    
    // Mostrar modal de configuración del backend al inicio
    document.getElementById('backendModal').style.display = 'flex';
    
    // Inicializar interfaz
    initializeInterface();
    
    // Configurar actualización periódica cada 5 segundos
    setInterval(periodicUpdate, 5000);
    
    // Configurar event listeners
    document.getElementById('steelRawTypesInput').addEventListener('input', updateFilters);
    document.getElementById('sortOrder').addEventListener('change', function() {
        currentConfig.order = this.value;
    });
    
    updateDebugInfo(`✅ Aplicación inicializada correctamente`);
});

// Manejo de errores globales
window.addEventListener('error', function(event) {
    console.error('Error global:', event.error);
    updateDebugInfo(`💥 Error global: ${event.error.message}`);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Promise rechazada:', event.reason);
    updateDebugInfo(`💥 Promise rechazada: ${event.reason.message}`);
});