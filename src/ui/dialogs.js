/** Ciclo das janelas legadas e controle de rolagem da página. */
function openModal(modalId) {
    document.getElementById(modalId).classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
    document.body.style.overflow = 'auto';
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = 'auto';
}

function handleModalOverlayClick(e, modalId) {
    if (e.target.id === modalId) {
        closeModal(modalId);
    }
}
