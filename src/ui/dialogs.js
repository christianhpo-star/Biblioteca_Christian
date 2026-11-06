/** Ciclo das janelas legadas e controle de rolagem da página. */
const modalFocusOrigins = new Map();

function openModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;
    if (modalId === 'modalWorkSheet' && !overlay.classList.contains('open')) {
        modalFocusOrigins.set(modalId, document.activeElement);
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (modalId === 'modalWorkSheet') overlay.querySelector('.modal-close-btn')?.focus();
}

function closeModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = 'auto';
    if (modalId === 'modalWorkSheet') {
        const origin = modalFocusOrigins.get(modalId);
        modalFocusOrigins.delete(modalId);
        if (origin?.isConnected && typeof origin.focus === 'function') origin.focus();
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay.open').forEach(modal => closeModal(modal.id));
    document.body.style.overflow = 'auto';
}

function handleModalOverlayClick(e, modalId) {
    if (e.target.id === modalId) closeModal(modalId);
}

/** Mantém a navegação na ficha compacta; campos recolhidos não entram no ciclo de Tab. */
document.addEventListener('keydown', event => {
    const modal = document.getElementById('modalWorkSheet');
    if (!modal?.classList.contains('open')) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeModal('modalWorkSheet');
        return;
    }
    if (event.key !== 'Tab') return;
    const focusables = [...modal.querySelectorAll('button, a[href], input, select, textarea, summary')]
        .filter(el => !el.disabled && !el.hidden && !el.closest('[hidden]') &&
            !el.closest('details:not([open])') && el.getClientRects().length);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables.at(-1);
    if (!modal.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}, true);
