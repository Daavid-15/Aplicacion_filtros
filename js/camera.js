// ============================================
// FUNCIONES DE CÁMARA CON FLASH
// ============================================

let cameraStream = null;
let capturedImage = null;
let isCapturing = false;

/**
 * Inicia la cámara cuando se hace clic en el botón
 */
async function startCamera() {
    try {
        updateDebugInfo('📸 Iniciando cámara...');
        
        const startBtn = document.getElementById('startCameraBtn');
        const stopBtn = document.getElementById('stopCameraBtn');
        const captureBtn = document.getElementById('captureBtn');
        const cameraStatus = document.getElementById('cameraStatus');
        
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        captureBtn.style.display = 'inline-block';
        
        cameraStatus.textContent = 'Iniciando cámara...';
        cameraStatus.className = 'camera-status';

        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('cameraVideo');
        video.srcObject = cameraStream;
        
        // Esperar a que el video esté listo
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });
        
        video.play();
        
        // Mostrar el recuadro verde después de que el video esté listo
        setTimeout(() => {
            showCaptureArea();
        }, 500);
        
        // Verificar flash
        const track = cameraStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
            updateDebugInfo('✅ Flash disponible');
        } else {
            updateDebugInfo('⚠️ Flash no disponible');
        }
        
        cameraStatus.textContent = 'Cámara activa';
        cameraStatus.className = 'camera-status active';
        updateDebugInfo('✅ Cámara inicializada');
        addLog('Cámara activada correctamente', 'SUCCESS');
        
    } catch (error) {
        updateDebugInfo(`❌ Error al iniciar cámara: ${error.message}`);
        addLog('Error al acceder a la cámara', 'ERROR');
        
        const cameraStatus = document.getElementById('cameraStatus');
        cameraStatus.textContent = `Error: ${error.message}`;
        cameraStatus.className = 'camera-status error';
        
        // Restaurar botones
        document.getElementById('startCameraBtn').style.display = 'inline-block';
        document.getElementById('stopCameraBtn').style.display = 'none';
        document.getElementById('captureBtn').style.display = 'none';
    }
}

/**
 * Muestra el recuadro verde del 85% en el centro
 */
function showCaptureArea() {
    const video = document.getElementById('cameraVideo');
    const container = document.querySelector('.camera-container');
    
    // Eliminar área existente
    const existingArea = document.getElementById('captureArea');
    if (existingArea) {
        existingArea.remove();
    }
    
    // Crear nuevo recuadro
    const captureArea = document.createElement('div');
    captureArea.id = 'captureArea';
    
    const videoRect = video.getBoundingClientRect();
    
    // Calcular dimensiones
    const minDimension = Math.min(videoRect.width, videoRect.height);
    const areaSize = minDimension * 0.85;
    
    // Calcular posición centrada relativa al video
    const left = (videoRect.width - areaSize) / 2;
    const top = (videoRect.height - areaSize) / 2;
    
    captureArea.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        width: ${areaSize}px;
        height: ${areaSize}px;
        border: 3px solid #00ff00;
        background: transparent;
        pointer-events: none;
        z-index: 10;
        border-radius: 10px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
    `;
    
    // Asegurar que el contenedor tenga posición relativa
    container.style.position = 'relative';
    container.appendChild(captureArea);
    
    updateDebugInfo(`📐 Área de captura: ${areaSize.toFixed(0)}px`);
}

/**
 * Detiene la cámara
 */
function stopCamera() {
    const startBtn = document.getElementById('startCameraBtn');
    const stopBtn = document.getElementById('stopCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    // Limpiar imagen capturada
    if (capturedImage) {
        URL.revokeObjectURL(capturedImage.url);
        capturedImage = null;
    }
    
    // Ocultar previsualización si está visible
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    
    // Remover área de captura
    const captureArea = document.getElementById('captureArea');
    if (captureArea) {
        captureArea.remove();
    }
    
    // Mostrar video nuevamente
    const video = document.getElementById('cameraVideo');
    video.style.display = 'block';
    
    // Actualizar UI
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    captureBtn.style.display = 'none';
    captureBtn.disabled = false;
    captureBtn.innerHTML = 'Capturar Imagen';
    
    cameraStatus.textContent = 'Cámara detenida';
    cameraStatus.className = 'camera-status';
    
    updateDebugInfo('🛑 Cámara detenida');
    addLog('Cámara detenida', 'INFO');
}

/**
 * Captura imagen con flash
 */
async function captureImage() {
    if (!cameraStream || isCapturing) {
        return;
    }
    
    isCapturing = true;
    const captureBtn = document.getElementById('captureBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    
    captureBtn.disabled = true;
    captureBtn.innerHTML = '⏳ Capturando...';
    cameraStatus.textContent = 'Capturando imagen...';
    
    try {
        // Activar flash
        await activateFlash();
        
        // Pequeña pausa para que el flash se active
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Capturar imagen
        const imageData = await takePicture();
        
        // Desactivar flash
        await deactivateFlash();
        
        // Mostrar imagen capturada
        displayCapturedImage(imageData);
        
        cameraStatus.textContent = 'Imagen capturada - Revise la previsualización';
        addLog('Imagen capturada correctamente', 'SUCCESS');
        
    } catch (error) {
        updateDebugInfo(`❌ Error en captura: ${error.message}`);
        addLog('Error al capturar imagen', 'ERROR');
        cameraStatus.textContent = 'Error al capturar imagen';
        cameraStatus.className = 'camera-status error';
        
        // Restaurar vista de cámara en caso de error
        showCameraView();
    } finally {
        isCapturing = false;
        captureBtn.disabled = false;
        captureBtn.innerHTML = 'Capturar Imagen';
    }
}

/**
 * Activa el flash
 */
async function activateFlash() {
    if (!cameraStream) return;
    
    try {
        const track = cameraStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
            await track.applyConstraints({
                advanced: [{ torch: true }]
            });
            updateDebugInfo('💡 Flash activado');
        }
    } catch (error) {
        console.warn('No se pudo activar el flash:', error);
    }
}

/**
 * Desactiva el flash
 */
async function deactivateFlash() {
    if (!cameraStream) return;
    
    try {
        const track = cameraStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
            await track.applyConstraints({
                advanced: [{ torch: false }]
            });
            updateDebugInfo('💡 Flash desactivado');
        }
    } catch (error) {
        console.warn('No se pudo desactivar el flash:', error);
    }
}

/**
 * Toma la foto
 */
async function takePicture() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const context = canvas.getContext('2d');
    
    // Usar dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar frame completo
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve({
                blob: blob,
                url: URL.createObjectURL(blob),
                timestamp: new Date().toISOString(),
                id: Date.now()
            });
        }, 'image/jpeg', 0.9);
    });
}

/**
 * Muestra la imagen capturada
 */
function displayCapturedImage(imageData) {
    capturedImage = imageData;
    
    const video = document.getElementById('cameraVideo');
    const captureArea = document.getElementById('captureArea');
    const captureBtn = document.getElementById('captureBtn');
    
    // Ocultar elementos de cámara
    video.style.display = 'none';
    if (captureArea) captureArea.style.display = 'none';
    captureBtn.style.display = 'none';
    
    // Mostrar previsualización
    const previewContainer = document.getElementById('imagePreviewContainer') || createPreviewContainer();
    const previewImg = document.getElementById('previewImage');
    
    previewImg.src = imageData.url;
    previewContainer.style.display = 'block';
    
    updateDebugInfo('📷 Mostrando imagen capturada');
}

/**
 * Crea contenedor de previsualización
 */
function createPreviewContainer() {
    const container = document.querySelector('.camera-container');
    
    const previewContainer = document.createElement('div');
    previewContainer.id = 'imagePreviewContainer';
    previewContainer.style.cssText = `
        display: none;
        text-align: center;
    `;
    
    const previewImg = document.createElement('img');
    previewImg.id = 'previewImage';
    previewImg.style.cssText = `
        max-width: 100%;
        max-height: 400px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        margin-bottom: 20px;
    `;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 15px;
        justify-content: center;
        flex-wrap: wrap;
    `;
    
    const discardBtn = document.createElement('button');
    discardBtn.className = 'btn btn-danger';
    discardBtn.innerHTML = '❌ Descartar';
    discardBtn.onclick = discardImage;
    
    const sendBtn = document.createElement('button');
    sendBtn.className = 'btn btn-success';
    sendBtn.innerHTML = '📤 Enviar Imagen';
    sendBtn.onclick = sendImageToBackend;
    
    buttonContainer.appendChild(discardBtn);
    buttonContainer.appendChild(sendBtn);
    
    previewContainer.appendChild(previewImg);
    previewContainer.appendChild(buttonContainer);
    
    container.appendChild(previewContainer);
    return previewContainer;
}

/**
 * Descarta la imagen
 */
function discardImage() {
    if (capturedImage) {
        URL.revokeObjectURL(capturedImage.url);
        capturedImage = null;
    }
    
    showCameraView();
    addLog('Imagen descartada', 'INFO');
}

/**
 * Envía la imagen (placeholder)
 */
async function sendImageToBackend() {
    if (!capturedImage) return;
    
    const sendBtn = document.querySelector('#imagePreviewContainer .btn-success');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '⏳ Enviando...';
    
    try {
        // TODO: Implementar envío real al backend
        updateDebugInfo('📤 Enviando imagen al backend...');
        addLog('Enviando imagen al backend...', 'INFO');
        
        // Simulación de envío
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        addLog('Imagen enviada correctamente', 'SUCCESS');
        updateDebugInfo('✅ Imagen enviada al backend');
        
        // Limpiar y volver a cámara
        if (capturedImage) {
            URL.revokeObjectURL(capturedImage.url);
            capturedImage = null;
        }
        
        showCameraView();
        
    } catch (error) {
        updateDebugInfo(`❌ Error al enviar imagen: ${error.message}`);
        addLog('Error al enviar imagen', 'ERROR');
        
        sendBtn.disabled = false;
        sendBtn.innerHTML = '📤 Enviar Imagen';
    }
}

/**
 * Vuelve a mostrar la cámara
 */
function showCameraView() {
    const video = document.getElementById('cameraVideo');
    const captureArea = document.getElementById('captureArea');
    const captureBtn = document.getElementById('captureBtn');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const cameraStatus = document.getElementById('cameraStatus');
    
    video.style.display = 'block';
    if (captureArea) captureArea.style.display = 'block';
    captureBtn.style.display = 'inline-block';
    
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    
    cameraStatus.textContent = 'Cámara activa';
    cameraStatus.className = 'camera-status active';
    
    updateDebugInfo('📸 Volviendo a vista de cámara');
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    updateDebugInfo('📸 Módulo de cámara cargado');
    
    // Asegurar que los botones tengan el estado correcto al inicio
    document.getElementById('stopCameraBtn').style.display = 'none';
    document.getElementById('captureBtn').style.display = 'none';
});