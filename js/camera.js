// ============================================
// FUNCIONES DE CÁMARA CON FLASH - ERRORES DETALLADOS
// ============================================

let cameraStream = null;
let capturedImage = null;
let isCapturing = false;

/**
 * Captura imagen con secuencia y manejo de errores detallado
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
    
    let currentStep = 'inicio';
    
    try {
        // SECUENCIA CON MONITOREO DE PASOS
        currentStep = 'activar_flash';
        updateDebugInfo(`🔦 Paso ${currentStep}...`);
        cameraStatus.textContent = 'Activando flash...';
        
        const flashActivated = await activateFlash();
        if (flashActivated) {
            await new Promise(resolve => setTimeout(resolve, 300));
        } else {
            addLog('Flash no disponible, continuando sin flash', 'WARNING');
        }
        
        currentStep = 'enfoque';
        updateDebugInfo(`🎯 Paso ${currentStep}...`);
        cameraStatus.textContent = 'Enfocando...';
        await simpleFocus();
        
        currentStep = 'captura';
        updateDebugInfo(`📸 Paso ${currentStep}...`);
        cameraStatus.textContent = 'Capturando foto...';
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const imageData = await takePicture();
        
        currentStep = 'apagar_flash';
        updateDebugInfo(`💡 Paso ${currentStep}...`);
        cameraStatus.textContent = 'Apagando flash...';
        await deactivateFlash();
        
        currentStep = 'mostrar_resultado';
        updateDebugInfo(`✅ Paso ${currentStep}...`);
        displayCapturedImage(imageData);
        
        cameraStatus.textContent = 'Imagen capturada correctamente';
        cameraStatus.className = 'camera-status active';
        addLog('Secuencia de captura completada', 'SUCCESS');
        
    } catch (error) {
        console.error('Error detallado en captura:', error);
        
        // MENSAJES DE ERROR ESPECÍFICOS
        let errorMessage = 'Error desconocido en la captura';
        let errorDetails = error.message || 'Sin detalles';
        
        switch (currentStep) {
            case 'activar_flash':
                errorMessage = 'Error al activar el flash';
                errorDetails = `El flash no pudo activarse: ${errorDetails}`;
                break;
                
            case 'enfoque':
                errorMessage = 'Error en el enfoque automático';
                errorDetails = `El enfoque automático falló: ${errorDetails}`;
                break;
                
            case 'captura':
                errorMessage = 'Error al capturar la imagen';
                errorDetails = `No se pudo tomar la foto: ${errorDetails}`;
                break;
                
            case 'apagar_flash':
                errorMessage = 'Error al apagar el flash';
                errorDetails = `El flash no se pudo apagar: ${errorDetails}`;
                break;
                
            default:
                errorMessage = 'Error en la secuencia de captura';
                errorDetails = `Error en paso "${currentStep}": ${errorDetails}`;
        }
        
        updateDebugInfo(`❌ ${errorMessage}: ${errorDetails}`);
        addLog(`${errorMessage}: ${errorDetails}`, 'ERROR');
        
        cameraStatus.textContent = `${errorMessage} - Ver consola para detalles`;
        cameraStatus.className = 'camera-status error';
        
        // Mostrar mensaje más detallado al usuario
        showErrorToUser(errorMessage, errorDetails);
        
    } finally {
        // Asegurar que el flash se apague en caso de error
        if (currentStep !== 'mostrar_resultado') {
            try {
                await deactivateFlash();
            } catch (flashError) {
                console.warn('Error adicional al apagar flash:', flashError);
            }
        }
        
        isCapturing = false;
        captureBtn.disabled = false;
        captureBtn.innerHTML = 'Capturar Imagen';
    }
}

/**
 * Muestra el error al usuario de forma más visible
 */
function showErrorToUser(title, details) {
    // Crear o actualizar elemento de error
    let errorElement = document.getElementById('cameraError');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'cameraError';
        errorElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f8d7da;
            color: #721c24;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #f5c6cb;
            z-index: 1000;
            max-width: 300px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(errorElement);
    }
    
    errorElement.innerHTML = `
        <h4 style="margin-bottom: 10px; color: #721c24;">❌ ${title}</h4>
        <p style="margin-bottom: 15px; font-size: 14px;">${details}</p>
        <button onclick="this.parentElement.remove()" 
                style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Cerrar
        </button>
    `;
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (errorElement && errorElement.parentElement) {
            errorElement.remove();
        }
    }, 5000);
}

/**
 * Activa el flash con mejor manejo de errores
 */
async function activateFlash() {
    if (!cameraStream) {
        throw new Error('Stream de cámara no disponible');
    }
    
    try {
        const track = cameraStream.getVideoTracks()[0];
        if (!track) {
            throw new Error('No se encontró track de video');
        }
        
        const capabilities = track.getCapabilities();
        console.log('Capacidades de la cámara:', capabilities);
        
        if (!capabilities.torch) {
            throw new Error('El dispositivo no soporta flash nativo');
        }
        
        await track.applyConstraints({
            advanced: [{ torch: true }]
        });
        
        // Verificar que se activó
        await new Promise(resolve => setTimeout(resolve, 200));
        const settings = track.getSettings();
        
        if (settings.torch) {
            updateDebugInfo('💡 Flash activado correctamente');
            return true;
        } else {
            throw new Error('El flash no se activó a pesar del comando');
        }
        
    } catch (error) {
        console.error('Error detallado en activateFlash:', error);
        throw new Error(`Flash: ${error.message}`);
    }
}

/**
 * Enfoque simplificado con mejor logging
 */
async function simpleFocus() {
    try {
        const track = cameraStream.getVideoTracks()[0];
        if (!track) {
            throw new Error('No hay track de video disponible');
        }
        
        const capabilities = track.getCapabilities();
        console.log('Capacidades de enfoque:', capabilities.focusMode);
        
        if (!capabilities.focusMode) {
            throw new Error('Enfoque automático no disponible en este dispositivo');
        }
        
        // Probar diferentes modos de enfoque
        const focusModes = ['continuous', 'auto', 'single-shot'];
        let focusApplied = false;
        
        for (const mode of focusModes) {
            if (capabilities.focusMode.includes(mode)) {
                try {
                    await track.applyConstraints({
                        advanced: [{ focusMode: mode }]
                    });
                    updateDebugInfo(`🔍 Enfoque ${mode} aplicado`);
                    focusApplied = true;
                    break;
                } catch (error) {
                    console.warn(`Enfoque ${mode} falló:`, error);
                }
            }
        }
        
        if (!focusApplied) {
            throw new Error('Ningún modo de enfoque funcionó');
        }
        
        // Esperar a que el enfoque se estabilice
        await new Promise(resolve => setTimeout(resolve, 800));
        
    } catch (error) {
        console.error('Error detallado en simpleFocus:', error);
        throw new Error(`Enfoque: ${error.message}`);
    }
}

/**
 * Toma la foto con mejor diagnóstico
 */
async function takePicture() {
    const video = document.getElementById('cameraVideo');
    
    // Diagnóstico completo del video
    console.log('Estado del video:', {
        readyState: video.readyState,
        HAVE_ENOUGH_DATA: video.HAVE_ENOUGH_DATA,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        ended: video.ended,
        error: video.error
    });
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        throw new Error(`Video no está listo (estado: ${video.readyState})`);
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error(`Dimensiones del video inválidas: ${video.videoWidth}x${video.videoHeight}`);
    }
    
    const canvas = document.getElementById('cameraCanvas');
    const context = canvas.getContext('2d');
    
    // Usar dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Limpiar canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    try {
        // Dibujar frame completo
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Verificar que se dibujó algo
        const imageData = context.getImageData(0, 0, 1, 1).data;
        if (imageData[0] === 0 && imageData[1] === 0 && imageData[2] === 0) {
            throw new Error('Canvas está vacío después de dibujar');
        }
        
    } catch (error) {
        console.error('Error al dibujar en canvas:', error);
        throw new Error(`Dibujo en canvas: ${error.message}`);
    }
    
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas.toBlob() retornó null - no se pudo generar la imagen'));
                return;
            }
            
            if (blob.size === 0) {
                reject(new Error('El blob de imagen está vacío (0 bytes)'));
                return;
            }
            
            console.log('Imagen capturada:', {
                tamaño: blob.size,
                tipo: blob.type
            });
            
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
 * Desactiva el flash con mejor manejo de errores
 */
async function deactivateFlash() {
    if (!cameraStream) return;
    
    try {
        const track = cameraStream.getVideoTracks()[0];
        if (!track) return;
        
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
            await track.applyConstraints({
                advanced: [{ torch: false }]
            });
            updateDebugInfo('💡 Flash desactivado');
        }
    } catch (error) {
        console.error('Error al desactivar flash:', error);
        // No lanzamos error aquí porque es una operación de limpieza
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