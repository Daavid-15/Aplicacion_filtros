// ============================================
// CÁMARA SIMPLIFICADA CON INPUT FILE
// ============================================

let currentImage = null;

/**
 * Abre la cámara del dispositivo
 */
function openCamera() {
    const fileInput = document.getElementById('cameraFileInput');
    const cameraStatus = document.getElementById('cameraStatus');
    
    cameraStatus.textContent = 'Abriendo cámara...';
    cameraStatus.className = 'camera-status';
    
    // Simular clic en el input file
    fileInput.click();
}

/**
 * Maneja la selección de archivo
 */
function setupFileInput() {
    const fileInput = document.getElementById('cameraFileInput');
    const imagePreview = document.getElementById('imagePreview');
    const openBtn = document.getElementById('openCameraBtn');
    const sendBtn = document.getElementById('sendImageBtn');
    const discardBtn = document.getElementById('discardImageBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        
        if (!file) {
            cameraStatus.textContent = 'No se seleccionó ninguna imagen';
            cameraStatus.className = 'camera-status error';
            return;
        }
        
        // Verificar que es una imagen
        if (!file.type.startsWith('image/')) {
            cameraStatus.textContent = 'Por favor, selecciona una imagen válida';
            cameraStatus.className = 'camera-status error';
            return;
        }
        
        // Crear URL para la imagen
        const imageUrl = URL.createObjectURL(file);
        
        // Mostrar previsualización
        imagePreview.src = imageUrl;
        imagePreview.style.display = 'block';
        
        // Guardar imagen actual
        currentImage = {
            file: file,
            url: imageUrl,
            timestamp: new Date().toISOString()
        };
        
        // Actualizar UI
        openBtn.style.display = 'none';
        sendBtn.style.display = 'inline-block';
        discardBtn.style.display = 'inline-block';
        
        cameraStatus.textContent = 'Imagen capturada correctamente';
        cameraStatus.className = 'camera-status active';
        
        updateDebugInfo('📷 Imagen capturada: ' + file.name);
        addLog('Imagen capturada desde la cámara', 'SUCCESS');
    });
}

/**
 * Envía la imagen al backend
 */
async function sendImage() {
    if (!currentImage) {
        addLog('No hay imagen para enviar', 'ERROR');
        return;
    }
    
    const sendBtn = document.getElementById('sendImageBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    
    sendBtn.disabled = true;
    sendBtn.innerHTML = '⏳ Enviando...';
    cameraStatus.textContent = 'Enviando imagen al backend...';
    
    try {
        // TODO: Implementar envío real al backend
        // Por ahora solo simulamos el envío
        
        updateDebugInfo('📤 Enviando imagen al backend...');
        
        // Simular tiempo de envío
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Aquí iría el código real para enviar al backend:
        // const formData = new FormData();
        // formData.append('image', currentImage.file);
        // const response = await fetch(`${API_BASE_URL}/upload`, {
        //     method: 'POST',
        //     body: formData
        // });
        
        addLog('Imagen enviada correctamente al backend', 'SUCCESS');
        updateDebugInfo('✅ Imagen enviada al backend');
        cameraStatus.textContent = 'Imagen enviada correctamente';
        
        // Limpiar después del envío
        resetCamera();
        
    } catch (error) {
        console.error('Error al enviar imagen:', error);
        addLog('Error al enviar imagen: ' + error.message, 'ERROR');
        updateDebugInfo('❌ Error al enviar imagen: ' + error.message);
        cameraStatus.textContent = 'Error al enviar imagen';
        cameraStatus.className = 'camera-status error';
        
        sendBtn.disabled = false;
        sendBtn.innerHTML = '📤 Enviar Imagen';
    }
}

/**
 * Descarta la imagen actual
 */
function discardImage() {
    if (currentImage) {
        // Liberar la URL del objeto
        URL.revokeObjectURL(currentImage.url);
        currentImage = null;
    }
    
    // Limpiar input file
    const fileInput = document.getElementById('cameraFileInput');
    fileInput.value = '';
    
    resetCamera();
    addLog('Imagen descartada', 'INFO');
}

/**
 * Restablece la cámara al estado inicial
 */
function resetCamera() {
    const imagePreview = document.getElementById('imagePreview');
    const openBtn = document.getElementById('openCameraBtn');
    const sendBtn = document.getElementById('sendImageBtn');
    const discardBtn = document.getElementById('discardImageBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    
    // Ocultar previsualización
    imagePreview.style.display = 'none';
    imagePreview.src = '';
    
    // Restablecer botones
    openBtn.style.display = 'inline-block';
    sendBtn.style.display = 'none';
    discardBtn.style.display = 'none';
    sendBtn.disabled = false;
    sendBtn.innerHTML = '📤 Enviar Imagen';
    
    cameraStatus.textContent = 'Listo para capturar';
    cameraStatus.className = 'camera-status';
    
    currentImage = null;
}

/**
 * Inicializa la cámara simplificada
 */
function initSimpleCamera() {
    setupFileInput();
    updateDebugInfo('📸 Cámara simplificada inicializada');
    addLog('Módulo de cámara simplificada cargado', 'SUCCESS');
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initSimpleCamera();
});

