// ============================================
// CÁMARA SIMPLIFICADA CON RESULTADOS EN LA MISMA PANTALLA
// ============================================

let currentImage = null;
let currentResult = null;

/**
 * Abre la cámara del dispositivo
 */
function openCamera() {
    const fileInput = document.getElementById('cameraFileInput');
    const cameraStatus = document.getElementById('cameraStatus');
    
    cameraStatus.textContent = 'Abriendo cámara...';
    cameraStatus.className = 'camera-status';
    
    // Limpiar el input para permitir seleccionar la misma imagen otra vez
    fileInput.value = '';
    
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
        console.log('Input file cambiado'); // Debug
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
        
        // Mostrar campo de nombre con fecha/hora actual
        const imageNameInput = document.getElementById('imageNameInput');
        if (imageNameInput) {
            imageNameInput.style.display = 'block';
            // Establecer nombre por defecto: fecha y hora actual
            const now = new Date();
            const defaultName = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            document.getElementById('imageName').value = defaultName;
        }
        
        cameraStatus.textContent = 'Imagen capturada correctamente';
        cameraStatus.className = 'camera-status active';
    });
    
    // También manejar el evento click para debug
    fileInput.addEventListener('click', function() {
        console.log('Input file clickeado');
    });
}

/**
 * Procesa la imagen antes de enviar (redimensiona y comprime)
 */
async function processImage(originalFile, targetWidth, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = function() {
            // Calcular nuevas dimensiones manteniendo aspect ratio
            let newWidth = targetWidth;
            let newHeight = (img.height * targetWidth) / img.width;
            
            // Si el alto es mayor que el ancho, usar alto como referencia
            if (img.height > img.width) {
                newHeight = targetWidth;
                newWidth = (img.width * targetWidth) / img.height;
            }
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Dibujar imagen redimensionada
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Convertir a blob con calidad especificada
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('No se pudo procesar la imagen'));
                    return;
                }
                
                const processedFile = new File([blob], 'processed_image.jpg', {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                
                resolve({
                    file: processedFile,
                    originalSize: originalFile.size,
                    processedSize: blob.size,
                    width: newWidth,
                    height: newHeight,
                    compression: ((1 - (blob.size / originalFile.size)) * 100).toFixed(1)
                });
            }, 'image/jpeg', quality);
        };
        
        img.onerror = () => reject(new Error('Error al cargar la imagen'));
        img.src = URL.createObjectURL(originalFile);
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
    sendBtn.innerHTML = '⏳ Procesando...';
    cameraStatus.textContent = 'Procesando imagen...';
    
    try {
        // Obtener configuración de calidad
        const targetWidth = parseInt(document.getElementById('imageWidth').value) || 1024;
        const quality = parseFloat(document.getElementById('imageQuality').value) || 0.8;
        
        updateDebugInfo(`⚙️ Procesando imagen: ${targetWidth}px, calidad ${quality}`);
        cameraStatus.textContent = `Redimensionando a ${targetWidth}px...`;
        
        // Procesar imagen (redimensionar y comprimir)
        const processed = await processImage(currentImage.file, targetWidth, quality);
        
        updateDebugInfo(`📊 Imagen procesada: ${(processed.originalSize / 1024).toFixed(1)}KB → ${(processed.processedSize / 1024).toFixed(1)}KB (${processed.compression}% reducción)`);
        cameraStatus.textContent = 'Enviando al backend...';
        sendBtn.innerHTML = '⏳ Enviando...';
        
        // **IMPORTANTE**: Obtener el nombre personalizado del campo de texto
        const imageNameValue = document.getElementById('imageName').value.trim();
        
        // Si está vacío, usar fecha/hora actual; si no, usar el valor ingresado
        const finalName = imageNameValue 
            ? imageNameValue + '.jpg' 
            : `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.jpg`;
        
        // Crear un nuevo File con el nombre personalizado
        const renamedFile = new File([processed.file], finalName, {
            type: 'image/jpeg',
            lastModified: Date.now()
        });
        
        addLog(`📝 Nombre de archivo: ${finalName}`, 'INFO');
        updateDebugInfo(`📝 Enviando como: ${finalName}`);
        
        // Crear FormData para enviar
        const formData = new FormData();
        formData.append('image', renamedFile);  // ⚠️ AQUÍ SE ENVÍA CON EL NOMBRE
        formData.append('timestamp', new Date().toISOString());
        formData.append('original_width', processed.width);
        formData.append('original_height', processed.height);
        formData.append('quality', quality);
        
        // Mostrar pantalla de espera
        showWaitingScreen();
        
        // Enviar al backend - ESPERAMOS RESPUESTA COMO IMAGEN (BLOB)
        const response = await fetch(`${API_BASE_URL}/upload_image`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }
        
        const matches = response.headers.get("X-Matches");
        const processingTime = response.headers.get("X-Processing-Time");
        const numImgs = response.headers.get("X-Num-Imgs");
        const timePerImg = response.headers.get("X-Time-Per-Img");

        const imageBlob = await response.blob();
        
        // Crear URL para la imagen procesada
        const processedImageUrl = URL.createObjectURL(imageBlob);
        
        addLog(`Imagen procesada recibida: ${(imageBlob.size / 1024).toFixed(1)}KB`, 'SUCCESS');
        updateDebugInfo('✅ Procesamiento completado - Imagen recibida del backend');
        
        // Mostrar resultados con la imagen procesada
        showResultsScreen({
            result_image_url: processedImageUrl,
            image_blob: imageBlob,
            processed_size: imageBlob.size,
            matches_found: matches,
            processing_time: processingTime,
            num_imgs: numImgs,
            time_per_img: timePerImg
        });
        
    } catch (error) {
        console.error('Error al enviar imagen:', error);
        addLog('Error al enviar imagen: ' + error.message, 'ERROR');
        updateDebugInfo('❌ Error al enviar imagen: ' + error.message);
        
        // Mostrar error
        showErrorScreen(error.message);
    }
}



/**
 * Muestra los resultados en la misma pantalla
 */
function showResultsScreen(resultData) {
    const imagePreview = document.getElementById('imagePreview');
    const cameraStatus = document.getElementById('cameraStatus');
    const qualityControls = document.querySelector('.quality-controls');
    const imageNameInput = document.getElementById('imageNameInput'); // ← AÑADIR
    
    currentResult = resultData;

    if (resultData.result_image_url) {
        imagePreview.src = resultData.result_image_url;
    } else if (resultData.image_blob) {
        const imageUrl = URL.createObjectURL(resultData.image_blob);
        imagePreview.src = imageUrl;
    } else {
        imagePreview.src = currentImage.url;
    }
    imagePreview.style.display = 'block';

    // Extraer datos enviados por el backend
    const matches = resultData.matches_found || 'N/A';
    const processingTime = resultData.processing_time || 'N/A';
    const numImgs = resultData.num_imgs || 'N/A';
    const timePerImg = resultData.time_per_img || 'N/A';

    cameraStatus.innerHTML = `
        <div style="text-align: center; padding: 15px;">
            <div style="font-size: 36px; margin-bottom: 15px; color: #27ae60;">✅</div>
            <h3 style="color: #27ae60; margin-bottom: 10px;">Análisis Completado</h3>
            <div style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <div><strong>Matches:</strong> ${matches}</div>
                <div><strong>Tiempo:</strong> ${processingTime} segundos</div>
                <div><strong>Num_imgs:</strong> ${numImgs}</div>
                <div><strong>Tiempo/Img:</strong> ${timePerImg} ms</div>
                <div><strong>Tamaño resultado:</strong> ${(resultData.processed_size / 1024).toFixed(1)} KB</div>
            </div>
            <button class="btn btn-success" onclick="acceptResults()" style="margin-top: 15px;">
                ✅ Aceptar y Volver
            </button>
        </div>
    `;
    cameraStatus.className = 'camera-status active';
    
    if (qualityControls) qualityControls.style.display = 'none';
    
    // Ocultar campo de nombre en resultados ← AÑADIR
    if (imageNameInput) imageNameInput.style.display = 'none';
    
    addLog('Procesamiento de imagen completado', 'SUCCESS');
}


/**
 * Acepta los resultados y vuelve al estado inicial
 */
function acceptResults() {
    // Liberar la URL del objeto de la imagen procesada
    if (currentResult && currentResult.result_image_url) {
        URL.revokeObjectURL(currentResult.result_image_url);
    }
    resetCamera();
    addLog('Resultados aceptados', 'INFO');
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
    
    // Liberar también la imagen de resultado si existe
    if (currentResult && currentResult.result_image_url) {
        URL.revokeObjectURL(currentResult.result_image_url);
        currentResult = null;
    }
    
    // Limpiar input file
    const fileInput = document.getElementById('cameraFileInput');
    fileInput.value = '';
    
    resetCamera();
    addLog('Imagen descartada', 'INFO');
}

/**
 * Muestra la pantalla de espera
 */
function showWaitingScreen() {
    const imagePreview = document.getElementById('imagePreview');
    const openBtn = document.getElementById('openCameraBtn');
    const sendBtn = document.getElementById('sendImageBtn');
    const discardBtn = document.getElementById('discardImageBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    const qualityControls = document.querySelector('.quality-controls');
    const imageNameInput = document.getElementById('imageNameInput'); // ← AÑADIR
    
    // Ocultar controles
    openBtn.style.display = 'none';
    sendBtn.style.display = 'none';
    discardBtn.style.display = 'none';
    imagePreview.style.display = 'none';
    if (qualityControls) qualityControls.style.display = 'none';
    
    // Ocultar campo de nombre ← AÑADIR
    if (imageNameInput) imageNameInput.style.display = 'none';
    
    // Mostrar estado de espera
    cameraStatus.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <h3>Procesando Imagen</h3>
            <p>El sistema está analizando la imagen. Esto puede tomar unos segundos...</p>
            <div style="margin-top: 20px;">
                <div style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background: #667eea; animation: pulse 1.5s infinite;"></div>
            </div>
        </div>
    `;
    cameraStatus.className = 'camera-status active';
}


/**
 * Muestra pantalla de error
 */
function showErrorScreen(errorMessage) {
    const cameraStatus = document.getElementById('cameraStatus');
    const openBtn = document.getElementById('openCameraBtn');
    const sendBtn = document.getElementById('sendImageBtn');
    const discardBtn = document.getElementById('discardImageBtn');
    const qualityControls = document.querySelector('.quality-controls');
    const imageNameInput = document.getElementById('imageNameInput'); // ← AÑADIR
    
    cameraStatus.innerHTML = `
        <div style="text-align: center; color: #e74c3c; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
            <h3>Error en el Procesamiento</h3>
            <p>${errorMessage}</p>
            <button class="btn btn-primary" onclick="resetCamera()" style="margin-top: 20px;">
                ↩️ Volver a Cámara
            </button>
        </div>
    `;
    cameraStatus.className = 'camera-status error';
    
    // Mostrar botón de volver inmediatamente
    openBtn.style.display = 'inline-block';
    sendBtn.style.display = 'none';
    discardBtn.style.display = 'none';
    
    // Ocultar campo de nombre en caso de error ← AÑADIR
    if (imageNameInput) imageNameInput.style.display = 'none';
    
    if (qualityControls) qualityControls.style.display = 'block';
    
    addLog(`Error en procesamiento: ${errorMessage}`, 'ERROR');
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
    const qualityControls = document.querySelector('.quality-controls');
    const imageNameInput = document.getElementById('imageNameInput'); // ← AÑADIR
    
    // Ocultar previsualización
    imagePreview.style.display = 'none';
    imagePreview.src = '';
    
    // Restablecer botones
    openBtn.style.display = 'inline-block';
    sendBtn.style.display = 'none';
    discardBtn.style.display = 'none';
    sendBtn.disabled = false;
    sendBtn.innerHTML = '📤 Enviar Imagen';
    
    // Ocultar campo de nombre ← AÑADIR ESTO
    if (imageNameInput) {
        imageNameInput.style.display = 'none';
        // Opcional: limpiar el campo
        document.getElementById('imageName').value = '';
    }
    
    // Mostrar controles de calidad
    if (qualityControls) qualityControls.style.display = 'block';
    
    cameraStatus.textContent = 'Listo para capturar';
    cameraStatus.className = 'camera-status';
    
    currentImage = null;
    currentResult = null;
}

// Funciones de calidad
function setupQualityControls() {
    const qualitySlider = document.getElementById('imageQuality');
    const qualityValue = document.getElementById('qualityValue');
    
    if (qualitySlider && qualityValue) {
        qualitySlider.addEventListener('input', function() {
            qualityValue.textContent = this.value;
            updateSizeEstimate();
        });
    }
    
    const imageWidth = document.getElementById('imageWidth');
    if (imageWidth) {
        imageWidth.addEventListener('input', updateSizeEstimate);
    }
}

function updateSizeEstimate() {
    const widthInput = document.getElementById('imageWidth');
    const qualityInput = document.getElementById('imageQuality');
    const imageInfo = document.getElementById('imageInfo');
    
    if (!widthInput || !qualityInput || !imageInfo) return;
    
    const width = parseInt(widthInput.value) || 1024;
    const quality = parseFloat(qualityInput.value) || 0.8;
    
    // Estimación muy básica del tamaño
    const estimatedSizeKB = Math.round((width * width * quality) / 1000);
    imageInfo.textContent = 
        `Tamaño estimado: ${estimatedSizeKB} KB (${width}px, calidad ${quality})`;
}

// Llamar en la inicialización
function initSimpleCamera() {
    setupFileInput();
    setupQualityControls();
    updateSizeEstimate();
    updateDebugInfo('📸 Cámara simplificada inicializada');
    addLog('Módulo de cámara simplificada cargado', 'SUCCESS');
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initSimpleCamera();
});

/**
 * Muestra la pantalla de espera
 */
function showWaitingScreen() {
    const imagePreview = document.getElementById('imagePreview');
    const openBtn = document.getElementById('openCameraBtn');
    const sendBtn = document.getElementById('sendImageBtn');
    const discardBtn = document.getElementById('discardImageBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    const qualityControls = document.querySelector('.quality-controls');
    const imageNameInput = document.getElementById('imageNameInput'); // ← AÑADIR
    
    // Ocultar controles
    openBtn.style.display = 'none';
    sendBtn.style.display = 'none';
    discardBtn.style.display = 'none';
    imagePreview.style.display = 'none';
    if (qualityControls) qualityControls.style.display = 'none';
    
    // Ocultar campo de nombre ← AÑADIR
    if (imageNameInput) imageNameInput.style.display = 'none';
    
    // Mostrar estado de espera
    cameraStatus.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <h3>Procesando Imagen</h3>
            <p>El sistema está analizando la imagen. Esto puede tomar unos segundos...</p>
            <div style="margin-top: 20px;">
                <div style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background: #667eea; animation: pulse 1.5s infinite;"></div>
            </div>
        </div>
    `;
    cameraStatus.className = 'camera-status active';
}