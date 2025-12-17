// Global loader + fetch wrapper
(() => {
    const originalFetch = window.fetch.bind(window);
    let activeFetches = 0;

    const loaderEl = document.querySelector("#global-loader");;

    function showLoader() {
        loaderEl.style.display = "flex";
    }
    function hideLoader() {
        loaderEl.style.display = "none";
    }

    window.fetch = async (...args) => {
        activeFetches++;
        if (activeFetches === 1) {
            showLoader();
        }
        try {
            const res = await originalFetch(...args);
            return res;
        } catch (err) {
            throw err;
        } finally {
            activeFetches--;
            if (activeFetches <= 0) {
                hideLoader();
            }
        }
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#searchInput").addEventListener("keydown", e => {
        if (e.key === "Enter") {
            document.querySelector("#searchButton").click();
        }
    });
    // ensure Bootstrap modal exists
    if (!document.querySelector('#global-modal')) {
        const modal = document.createElement('div');
        modal.id = 'global-modal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // create Bootstrap Modal instance
        try {
            // eslint-disable-next-line no-undef
            modal._bsModal = new bootstrap.Modal(modal, { backdrop: true });
        } catch (e) {
            // bootstrap not available or init failed
            modal._bsModal = null;
        }
    }
});