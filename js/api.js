// ============================================
// FUNCIONES DE COMUNICACIÓN CON EL BACKEND
// ============================================

/**
 * Realiza una llamada a la API del backend
 * @param {string} endpoint - Endpoint de la API
 * @param {string} method - Método HTTP (GET, POST, etc.)
 * @param {object} data - Datos a enviar en el cuerpo (para POST/PUT)
 * @returns {Promise<object>} Respuesta de la API
 */
async function apiCall(endpoint, method = 'GET', data = null) {
    updateDebugInfo(`📡 ${method} ${endpoint}`);
    
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*'
            },
            // modo más permisivo posible
            mode: 'cors',          // o incluso 'no-cors' si solo quieres que no explote (pero ojo: no podrás leer la respuesta)
            credentials: 'omit'    // quita restricciones de cookies/autenticación
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // si usas 'no-cors', aquí no podrás leer el body
        const result = await response.json().catch(() => null);

        updateDebugInfo(`✅ ${method} ${endpoint} - Éxito`);
        setConnectionStatus('connected');
        return result;

    } catch (error) {
        updateDebugInfo(`❌ ${method} ${endpoint} - Error: ${error.message}`);
        setConnectionStatus('error');
        throw error;
    }
}




// ============================================
// FUNCIONES Pantalla de Filtrado
// ============================================
/**
 * Obtiene el estado actual del sistema desde el backend
 */
async function getStatus() {
    try {
        addLog('Solicitando estado del sistema...', 'INFO');
        const statusBtn = document.getElementById('statusBtn');
        statusBtn.disabled = true;
        statusBtn.innerHTML = '⏳ Obteniendo...';
        
        const status = await apiCall('/STATUS');
        updateStatusDisplay(status);
        addLog('Estado actualizado correctamente', 'SUCCESS');
        
    } catch (error) {
        addLog('Error al obtener el estado', 'ERROR');
    } finally {
        const statusBtn = document.getElementById('statusBtn');
        statusBtn.disabled = false;
        statusBtn.innerHTML = 'Actualizar Estado';
    }
}

/**
 * Realiza un test de conexión con el backend
 * @returns {Promise<boolean>} True si la conexión es exitosa
 */
async function testConnection() {
    updateDebugInfo(`🧪 Iniciando test de conexión...`);
    addLog('Test de conexión iniciado', 'INFO');
    
    try {
        const status = await apiCall('/STATUS');
        updateDebugInfo(`✅ Test exitoso! Sistema operativo`);
        addLog('Conexión con backend establecida', 'SUCCESS');
        updateStatusDisplay(status);
        return true;
    } catch (error) {
        updateDebugInfo(`❌ Test falló: ${error.message}`);
        addLog('Error en test de conexión', 'ERROR');
        return false;
    }
}

/**
 * Solicita la recarga de tensores con los filtros actuales
 */
async function reloadTensors() {
    try {
        addLog('Solicitando recarga de tensores...', 'INFO');
        const reloadBtn = document.getElementById('reloadBtn');
        reloadBtn.disabled = true;
        reloadBtn.innerHTML = '⏳ Cargando...';
        
        const payload = {
            filters: currentConfig.filters,
            time_ranges: currentConfig.time_ranges,
            order: currentConfig.order,
            max_usage: currentConfig.max_usage / 100
        };
        
        updateDebugInfo(`📤 Enviando RELOAD_TENSORS: ${JSON.stringify(payload)}`);
        
        const result = await apiCall('/RELOAD_TENSORS', 'POST', payload);
        
        addLog(`Recarga: ${result.status}`, result.status === 'done' ? 'SUCCESS' : 'INFO');
        updateDebugInfo(`🔥 Respuesta: ${JSON.stringify(result)}`);
        
        if (result.status === 'scheduled') {
            addLog(`Recarga programada. En cola: ${result.queue_length}`, 'INFO');
        }
        
        const status = await apiCall('/STATUS');
        updateStatusDisplay(status);
        
    } catch (error) {
        addLog('Error en la recarga de tensores', 'ERROR');
        console.error('Error en reloadTensors:', error);
    } finally {
        const reloadBtn = document.getElementById('reloadBtn');
        reloadBtn.disabled = false;
        reloadBtn.innerHTML = 'Recargar Tensores';
    }
}

/**
 * Limpia toda la VRAM del sistema
 */
async function clearVRAM() {
    if (confirm('¿Está seguro de que desea limpiar toda la VRAM?')) {
        try {
            addLog('Limpiando VRAM...', 'WARNING');
            const clearBtn = document.getElementById('clearBtn');
            clearBtn.disabled = true;
            clearBtn.innerHTML = '⏳ Limpiando...';
            
            const result = await apiCall('/CLEAR_VRAM', 'POST');
            addLog('VRAM limpiada correctamente', 'SUCCESS');
            updateDebugInfo(`🗑️ VRAM limpiada: ${JSON.stringify(result)}`);
            
            const status = await apiCall('/STATUS');
            updateStatusDisplay(status);
            
        } catch (error) {
            addLog('Error al limpiar la VRAM', 'ERROR');
            console.error('Error en clearVRAM:', error);
        } finally {
            const clearBtn = document.getElementById('clearBtn');
            clearBtn.disabled = false;
            clearBtn.innerHTML = 'Limpiar VRAM';
        }
    }
}


// ============================================
// FUNCIONES Pantalla de Configuracion
// ============================================

/**
 * Aplica la configuración del sistema al backend
 */
async function applyConfiguration() {
    const applyBtn = document.getElementById('applyConfigBtn');
    applyBtn.disabled = true;
    applyBtn.innerHTML = '⏳ Aplicando...';
    
    try {
        const config = {
            lightglue_conf: {
                depth_confidence: parseFloat(document.getElementById('depthConfidence').value),
                width_confidence: parseFloat(document.getElementById('widthConfidence').value),
                filter_threshold: parseFloat(document.getElementById('filterThreshold').value)
            },
            preprocessing: {
                segmentar_camara: document.getElementById('segmentarCamara').checked,
                corregir_horientacion: document.getElementById('corregirOrientacion').checked
            },
            postprocesamiento: document.getElementById('postprocesamiento').checked,
            ransac_reproj_threshold: parseInt(document.getElementById('ransacThreshold').value)
        };
        
        updateDebugInfo(`⚙️ Enviando configuración al backend...`);
        
        // Enviar al backend
        const result = await apiCall('/UPDATE_CONFIG', 'POST', config);
        
        addLog('Configuración aplicada correctamente en el backend', 'SUCCESS');
        updateDebugInfo(`✅ Config aplicada: ${JSON.stringify(result)}`);
        
    } catch (error) {
        addLog('Error al aplicar la configuración', 'ERROR');
        updateDebugInfo(`❌ Error en configuración: ${error.message}`);
    } finally {
        applyBtn.disabled = false;
        applyBtn.innerHTML = '✅ Aplicar Configuración';
    }

}
