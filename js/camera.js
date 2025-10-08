// ============================================
// FUNCIONES DE CÁMARA CON FLASH - SECUENCIA MEJORADA
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
        
        // Configurar autofocus si está disponible
        setupAutoFocus();
        
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
        
        cameraStatus.textContent = 'Cámara activa - Toque para enfocar';
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
 * Configura el autofocus para la cámara
 */
function setupAutoFocus() {
    const video = document.getElementById('cameraVideo');
    const track = cameraStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    // Verificar si soporta focus
    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        // Configurar autofocus continuo
        track.applyConstraints({
            advanced: [{ focusMode: 'continuous' }]
        }).then(() => {
            updateDebugInfo('✅ Autofocus continuo activado');
        }).catch(error => {
            console.warn('No se pudo activar autofocus continuo:', error);
        });
    }
    
    // Permitir enfoque táctil
    video.addEventListener('click', function(event) {
        manualFocus(event);
    });
}

/**
 * Enfoque manual al tocar la pantalla
 */
function manualFocus(event) {
    const track = cameraStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
        const video = document.getElementById('cameraVideo');
        const rect = video.getBoundingClientRect();
        
        // Calcular posición relativa del toque
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        // Mostrar indicador de enfoque
        showFocusIndicator(event.clientX, event.clientY);
        
        // Intentar enfoque manual (esto puede no funcionar en todos los dispositivos)
        track.applyConstraints({
            advanced: [{ focusMode: 'manual', focusDistance: 0 }]
        }).then(() => {
            updateDebugInfo(`🎯 Enfoque manual en (${x.toFixed(2)}, ${y.toFixed(2)})`);
            addLog('Enfoque manual aplicado', 'INFO');
        }).catch(error => {
            console.warn('Enfoque manual no soportado:', error);
        });
    }
}

/**
 * Muestra un indicador visual de enfoque
 */
function showFocusIndicator(x, y) {
    // Remover indicador anterior
    const existingIndicator = document.getElementById('focusIndicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Crear nuevo indicador
    const indicator = document.createElement('div');
    indicator.id = 'focusIndicator';
    indicator.style.cssText = `
        position: fixed;
        left: ${x - 25}px;
        top: ${y - 25}px;
        width: 50px;
        height: 50px;
        border: 2px solid #00ff00;
        border-radius: 50%;
        pointer-events: none;
        z-index: 20;
        animation: focusPulse 1s ease-out;
    `;
    
    document.body.appendChild(indicator);
    
    // Remover después de la animación
    setTimeout(() => {
        indicator.remove();
    }, 1000);
}

/**
 * Captura imagen con la secuencia: Flash → Enfocar → Flash → Foto
 */
async function captureImage() {
    if (!cameraStream || isCapturing) {
        return;
    }
    
    isCapturing = true;
    const captureBtn = document.getElementById('captureBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    
    captureBtn.disabled = true;
    captureBtn.innerHTML = '⏳ Preparando...';
    cameraStatus.textContent = 'Iniciando secuencia de captura...';
    
    try {
        // SECUENCIA MEJORADA DE CAPTURA
        
        // 1. PRIMER FLASH (señal de preparación)
        cameraStatus.textContent = 'Activando flash...';
        await activateFlash();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 2. ENFOQUE AUTOMÁTICO
        cameraStatus.textContent = 'Enfocando...';
        await performAutoFocus();
        
        // 3. SEGUNDO FLASH (para la captura real)
        cameraStatus.textContent = 'Flash para captura...';
        await new Promise(resolve => setTimeout(resolve, 100));
        await activateFlash(); // Reactivar flash
        
        // 4. CAPTURAR FOTO
        cameraStatus.textContent = 'Capturando imagen...';
        await new Promise(resolve => setTimeout(resolve, 300)); // Dar tiempo al flash
        const imageData = await takePicture();
        
        // 5. DESACTIVAR FLASH
        await deactivateFlash();
        
        // 6. MOSTRAR RESULTADO
        displayCapturedImage(imageData);
        
        cameraStatus.textContent = 'Imagen capturada - Revise la previsualización';
        addLog('Imagen capturada con secuencia completa', 'SUCCESS');
        
    } catch (error) {
        updateDebugInfo(`❌ Error en secuencia de captura: ${error.message}`);
        addLog('Error en la secuencia de captura', 'ERROR');
        cameraStatus.textContent = 'Error en la captura';
        cameraStatus.className = 'camera-status error';
        
        // Asegurar que el flash se apague en caso de error
        await deactivateFlash().catch(() => {});
        
        // Restaurar vista de cámara en caso de error
        showCameraView();
    } finally {
        isCapturing = false;
        captureBtn.disabled = false;
        captureBtn.innerHTML = 'Capturar Imagen';
    }
}

/**
 * Realiza el enfoque automático
 */
async function performAutoFocus() {
    const track = cameraStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    try {
        // Intentar diferentes métodos de enfoque
        
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            // Ya está en enfoque continuo, forzar re-enfoque
            await track.applyConstraints({
                advanced: [{ focusMode: 'auto' }]
            });
            updateDebugInfo('🔍 Re-enfoque automático aplicado');
        }
        
        if (capabilities.focusMode && capabilities.focusMode.includes('single-shot')) {
            // Enfoque de un solo disparo
            await track.applyConstraints({
                advanced: [{ focusMode: 'single-shot' }]
            });
            updateDebugInfo('🔍 Enfoque single-shot aplicado');
        }
        
        // Esperar a que el enfoque se estabilice
        await new Promise(resolve => setTimeout(resolve, 800));
        
        addLog('Enfoque automático completado', 'INFO');
        
    } catch (error) {
        console.warn('Enfoque automático no disponible:', error);
        // Si el enfoque automático falla, esperar un tiempo mínimo
        await new Promise(resolve => setTimeout(resolve, 500));
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
            return true;
        }
    } catch (error) {
        console.warn('No se pudo activar el flash:', error);
    }
    return false;
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

// El resto de las funciones permanecen igual...

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
    
    // Obtener dimensiones del contenedor (no del video)
    const containerRect = container.getBoundingClientRect();
    
    // Calcular dimensiones - usar el 85% de la dimensión menor del contenedor
    const minDimension = Math.min(containerRect.width, containerRect.height);
    const areaSize = minDimension * 0.85;
    
    // Calcular posición centrada relativa al contenedor
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
    
    // Asegurar que el contenedor tenga posición relativa
    container.style.position = 'relative';
    container.appendChild(captureArea);
    
    updateDebugInfo(`📐 Área de captura: ${areaSize.toFixed(0)}px`);
    
    // Recalcular posición cuando cambie el tamaño de la ventana
    window.addEventListener('resize', recalculateCaptureArea);
}

// ... (el resto de las funciones como showCameraView, takePicture, displayCapturedImage, etc. se mantienen igual)