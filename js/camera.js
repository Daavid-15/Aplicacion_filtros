// ============================================
// FUNCIONES DE CÁMARA CON FLASH - SECUENCIA SIMPLIFICADA
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
        video.addEventListener('canplay', function onCanPlay() {
            video.removeEventListener('canplay', onCanPlay);
            showCaptureArea();
        });
        
        // Verificar flash
        const track = cameraStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
            updateDebugInfo('✅ Flash disponible');
        } else {
            updateDebugInfo('⚠️ Flash no disponible');
        }
        
        cameraStatus.textContent = 'Cámara activa - Lista para capturar';
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
 * Captura imagen con secuencia simplificada y robusta
 */
async function captureImage() {
    if (!cameraStream || isCapturing) {
        addLog('Cámara no disponible o ya capturando', 'ERROR');
        return;
    }
    
    isCapturing = true;
    const captureBtn = document.getElementById('captureBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    
    captureBtn.disabled = true;
    captureBtn.innerHTML = '⏳ Capturando...';
    cameraStatus.textContent = 'Iniciando secuencia...';
    
    try {
        // SECUENCIA SIMPLIFICADA Y ROBUSTA
        
        updateDebugInfo('🔦 Paso 1: Activando flash...');
        cameraStatus.textContent = 'Activando flash...';
        const flashActivated = await activateFlash();
        
        if (flashActivated) {
            // Pequeña pausa para que el flash se active completamente
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        updateDebugInfo('🎯 Paso 2: Enfocando...');
        cameraStatus.textContent = 'Enfocando...';
        await simpleFocus();
        
        updateDebugInfo('📸 Paso 3: Capturando foto...');
        cameraStatus.textContent = 'Capturando foto...';
        
        // Pequeña pausa adicional antes de capturar
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const imageData = await takePicture();
        
        updateDebugInfo('💡 Paso 4: Apagando flash...');
        cameraStatus.textContent = 'Apagando flash...';
        await deactivateFlash();
        
        updateDebugInfo('✅ Paso 5: Mostrando resultado...');
        displayCapturedImage(imageData);
        
        cameraStatus.textContent = 'Imagen capturada correctamente';
        addLog('Secuencia de captura completada', 'SUCCESS');
        
    } catch (error) {
        console.error('Error en captura:', error);
        updateDebugInfo(`❌ Error en captura: ${error.message}`);
        addLog(`Error en captura: ${error.message}`, 'ERROR');
        cameraStatus.textContent = 'Error en la captura - Intente nuevamente';
        cameraStatus.className = 'camera-status error';
        
        // Asegurar que el flash se apague en caso de error
        try {
            await deactivateFlash();
        } catch (flashError) {
            console.warn('Error al apagar flash:', flashError);
        }
        
    } finally {
        isCapturing = false;
        captureBtn.disabled = false;
        captureBtn.innerHTML = 'Capturar Imagen';
    }
}

/**
 * Enfoque simplificado que no falla
 */
async function simpleFocus() {
    try {
        const track = cameraStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        // Intentar enfoque automático simple
        if (capabilities.focusMode) {
            // Probar diferentes modos de enfoque
            const focusModes = ['continuous', 'auto', 'single-shot'];
            
            for (const mode of focusModes) {
                if (capabilities.focusMode.includes(mode)) {
                    try {
                        await track.applyConstraints({
                            advanced: [{ focusMode: mode }]
                        });
                        updateDebugInfo(`🔍 Enfoque ${mode} aplicado`);
                        break;
                    } catch (error) {
                        console.warn(`Enfoque ${mode} falló:`, error);
                    }
                }
            }
        }
        
        // Esperar un tiempo fijo para que el enfoque se estabilice
        await new Promise(resolve => setTimeout(resolve, 800));
        
    } catch (error) {
        console.warn('Enfoque automático no disponible, continuando sin enfoque:', error);
        // Si el enfoque falla, simplemente esperamos el tiempo normal
        await new Promise(resolve => setTimeout(resolve, 800));
    }
}

/**
 * Activa el flash - versión más robusta
 */
async function activateFlash() {
    if (!cameraStream) return false;
    
    try {
        const track = cameraStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
            await track.applyConstraints({
                advanced: [{ torch: true }]
            });
            
            // Verificar que se activó
            await new Promise(resolve => setTimeout(resolve, 100));
            const settings = track.getSettings();
            
            if (settings.torch) {
                updateDebugInfo('💡 Flash activado correctamente');
                return true;
            } else {
                updateDebugInfo('⚠️ Flash no se pudo activar');
                return false;
            }
        } else {
            updateDebugInfo('⚠️ Flash no disponible en este dispositivo');
            return false;
        }
    } catch (error) {
        console.warn('Error al activar flash:', error);
        updateDebugInfo('❌ Error activando flash');
        return false;
    }
}

/**
 * Desactiva el flash - versión más robusta
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
        console.warn('Error al desactivar flash:', error);
        updateDebugInfo('⚠️ Error desactivando flash');
    }
}

/**
 * Toma la foto con manejo de errores mejorado
 */
async function takePicture() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const context = canvas.getContext('2d');
    
    // Verificar que el video esté listo
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        throw new Error('Video no está listo para capturar');
    }
    
    // Usar dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Limpiar canvas antes de dibujar
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar frame completo
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('No se pudo generar la imagen'));
                return;
            }
            
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
    
    // Obtener dimensiones del contenedor
    const containerRect = container.getBoundingClientRect();
    
    // Calcular dimensiones - usar el 85% de la dimensión menor del contenedor
    const minDimension = Math.min(containerRect.width, containerRect.height);
    const areaSize = minDimension * 0.85;
    
    // Calcular posición centrada
    const left = (containerRect.width - areaSize) / 2;
    const top = (containerRect.height - areaSize) / 2;
    
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
    
    container.style.position = 'relative';
    container.appendChild(captureArea);
    
    updateDebugInfo(`📐 Área de captura: ${areaSize.toFixed(0)}px`);
    
    // Recalcular posición cuando cambie el tamaño
    window.addEventListener('resize', recalculateCaptureArea);
}

/**
 * Recalcula la posición del recuadro
 */
function recalculateCaptureArea() {
    if (document.getElementById('captureArea') && cameraStream) {
        showCaptureArea();
    }
}

// ... (las funciones showCameraView, displayCapturedImage, createPreviewContainer, discardImage, sendImageToBackend se mantienen igual)

/**
 * Vuelve a mostrar la cámara
 */
function showCameraView() {
    const video = document.getElementById('cameraVideo');
    const captureBtn = document.getElementById('captureBtn');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const cameraStatus = document.getElementById('cameraStatus');
    
    video.style.display = 'block';
    captureBtn.style.display = 'inline-block';
    
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    
    if (cameraStream) {
        video.addEventListener('canplay', function onCanPlay() {
            video.removeEventListener('canplay', onCanPlay);
            showCaptureArea();
        });
    }
    
    cameraStatus.textContent = 'Cámara activa - Lista para capturar';
    cameraStatus.className = 'camera-status active';
    
    updateDebugInfo('📸 Volviendo a vista de cámara');
}

/**
 * Muestra la imagen capturada
 */
function displayCapturedImage(imageData) {
    capturedImage = imageData;
    
    const video = document.getElementById('cameraVideo');
    const captureArea = document.getElementById('captureArea');
    const captureBtn = document.getElementById('captureBtn');
    
    video.style.display = 'none';
    if (captureArea) captureArea.style.display = 'none';
    captureBtn.style.display = 'none';
    
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
        updateDebugInfo('📤 Enviando imagen al backend...');
        addLog('Enviando imagen al backend...', 'INFO');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        addLog('Imagen enviada correctamente', 'SUCCESS');
        updateDebugInfo('✅ Imagen enviada al backend');
        
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

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    updateDebugInfo('📸 Módulo de cámara cargado');
    document.getElementById('stopCameraBtn').style.display = 'none';
    document.getElementById('captureBtn').style.display = 'none';
});