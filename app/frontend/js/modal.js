function hideModal() {
    const modal = document.querySelector('#global-modal');
    if (!modal) {
        return;
    }
    if (modal._bsModal) {
        return modal._bsModal.hide();
    }
    modal.classList.remove('show');
    modal.style.display = 'none';
}

function showModal(html, title) {
    const modal = document.querySelector('#global-modal');
    if (!modal) {
        return;
    }
    const body = modal.querySelector('.modal-body');
    const titleEl = modal.querySelector('.modal-title');
    body.innerHTML = html;
    if (titleEl) {
        titleEl.innerHTML = title || '';
    }
    if (modal._bsModal) {
        return modal._bsModal.show();
    }
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}