// ============================================
// FUNCIONES DE NAVEGACIÓN ENTRE PANTALLAS (Barra inferior)
// ============================================

/**
 * Cambia entre las diferentes pantallas de la aplicación
 * @param {string} screenId - ID de la pantalla a mostrar
 * @param {HTMLElement} navElement - Elemento de navegación que activó el cambio
 */
function switchScreen(screenId, navElement) {
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar la pantalla seleccionada
    document.getElementById(screenId).classList.add('active');
    
    // Actualizar estado de navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    navElement.classList.add('active');
}