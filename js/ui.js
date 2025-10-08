// ============================================
// FUNCIONES DE INTERFAZ DE USUARIO
// ============================================


// -------------------------------------
// Funciones Pantalla Filtrado
// -------------------------------------
/**
 * Establece el estado de conexión en la interfaz
 * @param {string} status - Estado de conexión ('connected', 'error', etc.)
 */
function setConnectionStatus(status) {
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    
    statusBar.classList.remove('matching-active', 'loading-active', 'error');
    
    switch (status) {
        case 'connected':
            statusText.textContent = 'CONECTADO';
            break;
        case 'error':
            statusText.textContent = 'ERROR DE CONEXIÓN';
            statusBar.classList.add('error');
            break;
        default:
            statusText.textContent = 'CONECTANDO';
    }
}

/**
 * Actualiza la visualización del estado del sistema
 * @param {object} status - Datos de estado del backend
 */
function updateStatusDisplay(status) {
    if (!status) return;

    document.getElementById('matchingText').textContent = status.matching_active ? 'ACTIVO' : 'INACTIVO';
    document.getElementById('matchingStatus').className = `status-indicator ${status.matching_active ? 'active' : 'inactive'}`;
    
    document.getElementById('loadingText').textContent = status.load_tensors_active ? 'ACTIVO' : 'INACTIVO';
    document.getElementById('loadingStatus').className = `status-indicator ${status.load_tensors_active ? 'active' : 'inactive'}`;
    
    document.getElementById('pendingText').textContent = status.pending_reload ? 'SÍ' : 'NO';
    document.getElementById('pendingStatus').className = `status-indicator ${status.pending_reload ? 'pending' : 'inactive'}`;
    
    const statusBar = document.getElementById('statusBar');
    statusBar.classList.remove('matching-active', 'loading-active');
    
    if (status.matching_active) {
        statusBar.classList.add('matching-active');
    } else if (status.load_tensors_active) {
        statusBar.classList.add('loading-active');
    }
    
    document.getElementById('tensorsLoaded').textContent = status.tensors_loaded || 0;
    document.getElementById('vramUsage').textContent = status.vram_usage_percent ? status.vram_usage_percent + '%' : '0%';
    document.getElementById('lastUpdate').textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
}



/**
 * Alterna la selección de un uso de acero
 * @param {HTMLElement} element - Elemento HTML del uso de acero
 */
function toggleSteelUse(element) {
    element.classList.toggle('selected');
    updateFilters();
}

/**
 * Alterna la selección de un tipo de acero
 * @param {HTMLElement} element - Elemento HTML del tipo de acero
 */
function toggleSteelType(element) {
    element.classList.toggle('selected');
    updateFilters();
}

/**
 * Actualiza los filtros activos en la configuración actual
 */
function updateFilters() {
    const selectedUses = Array.from(document.querySelectorAll('.steel-use.selected'))
        .map(el => el.textContent);
    
    const selectedTypes = Array.from(document.querySelectorAll('.steel-type.selected'))
        .map(el => el.dataset.key);
    
    const rawTypes = document.getElementById('steelRawTypesInput').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
    
    currentConfig.filters = {
        SteelUses: selectedUses,
        SteelClass: selectedTypes,
        SteelType: rawTypes
    };
    
    document.getElementById('dateRanges').textContent = currentConfig.time_ranges.length;
    document.getElementById('steelTypes').textContent = 
        selectedUses.length + selectedTypes.length + rawTypes.length;
}

/**
 * Añade un nuevo rango de fechas a la configuración
 */
function addDateRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        addLog('Error: Debe especificar ambas fechas', 'ERROR');
        return;
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
        addLog('Error: La fecha de inicio debe ser anterior a la fecha final', 'ERROR');
        return;
    }
    
    const range = [startDate, endDate];
    currentConfig.time_ranges.push(range);
    updateFilters();
    
    const rangeList = document.getElementById('rangeList');
    const rangeItem = document.createElement('div');
    rangeItem.className = 'range-item';
    rangeItem.innerHTML = `
        ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}
        <button class="btn btn-danger btn-small" onclick="removeDateRange(this)">❌</button>
    `;
    rangeItem.dataset.range = JSON.stringify(range);
    rangeList.appendChild(rangeItem);
    
    addLog(`Rango añadido: ${startDate} - ${endDate}`, 'SUCCESS');
}

/**
 * Elimina un rango de fechas de la configuración
 * @param {HTMLElement} button - Botón que activó la eliminación
 */
function removeDateRange(button) {
    const rangeItem = button.parentElement;
    const range = JSON.parse(rangeItem.dataset.range);
    
    currentConfig.time_ranges = currentConfig.time_ranges.filter(r => 
        !(r[0] === range[0] && r[1] === range[1])
    );
    
    rangeItem.remove();
    updateFilters();
    addLog(`Rango eliminado`, 'INFO');
}

/**
 * Formatea una fecha para mostrar en la interfaz
 * @param {string} dateTimeStr - Cadena de fecha/hora
 * @returns {string} Fecha formateada
 */
function formatDateForDisplay(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
}



/**
 * Añade una entrada al registro de actividad
 * @param {string} message - Mensaje a registrar
 * @param {string} type - Tipo de mensaje ('INFO', 'ERROR', 'SUCCESS', 'WARNING')
 */
function addLog(message, type = 'INFO') {
    const logContainer = document.getElementById('logContainer');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    const timestamp = new Date().toLocaleTimeString();
    
    let emoji = '💬';
    if (type === 'ERROR') emoji = '❌';
    if (type === 'SUCCESS') emoji = '✅';
    if (type === 'WARNING') emoji = '⚠️';
    
    logEntry.textContent = `[${timestamp}] ${emoji} ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    const logs = logContainer.querySelectorAll('.log-entry');
    if (logs.length > 50) {
        logs[0].remove();
    }
}



/**
 * Actualiza el panel de información de depuración
 * @param {string} message - Mensaje a mostrar
 */
function updateDebugInfo(message) {
    const debugInfo = document.getElementById('debugInfo');
    const timestamp = new Date().toLocaleTimeString();
    debugInfo.innerHTML += `<br>[${timestamp}] ${message}`;
    const lines = debugInfo.innerHTML.split('<br>');
    if (lines.length > 20) {
        debugInfo.innerHTML = lines.slice(-20).join('<br>');
    }
}