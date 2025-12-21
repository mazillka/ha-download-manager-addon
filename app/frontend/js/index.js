import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

createApp({
    data() {
        return {
            query: '',
            results: [],
            loading: false,
            selectedItem: null,
            selectedUrl: null,
            videoUrl: null,
            modalInstance: null
        }
    },
    computed: {
        isAndroid() {
            return /android/i.test(navigator.userAgent);
        }
    },
    mounted() {
        // Initialize Bootstrap modal
        const modalEl = this.$refs.modalRef;
        // eslint-disable-next-line no-undef
        this.modalInstance = new bootstrap.Modal(modalEl);

        modalEl.addEventListener('hidden.bs.modal', () => {
            this.videoUrl = null; // Stop video when modal closes
        });
    },
    methods: {
        async search() {
            if (!this.query) {
                return;
            }
            this.loading = true;
            this.results = [];
            try {
                const response = await fetch("api/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: this.query })
                });
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }
                this.results = await response.json();
            } catch (error) {
                console.error('Error:', error);
                alert('Search failed');
            } finally {
                this.loading = false;
            }
        },
        async clear() {
            this.query = '';
            this.results = [];
        },
        async parse(url, data_translator_id = null) {
            this.loading = true;
            try {
                const response = await fetch("api/parse", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url, data_translator_id })
                });
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }
                const data = await response.json();

                this.selectedItem = data;
                this.selectedUrl = url;
                this.videoUrl = null; // Reset video player
                this.modalInstance.show();
            } catch (error) {
                console.error('Error:', error);
                alert('Parse failed');
            } finally {
                this.loading = false;
            }
        },
        showPlayer(url) {
            this.videoUrl = url;
        },
        openStream(url) {
            window.open(url, '_blank');
        },
        copyStreamUrl(url) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url);
            } else {
                const ta = document.createElement('textarea');
                ta.value = url;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            }
        },
        async download(url, filename) {
            this.loading = true;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }
                const blob = await response.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(a.href);
                a.remove();
            } catch (e) {
                console.error(e);
                alert('Error downloading file');
            } finally {
                this.loading = false;
            }
        }
    }
}).mount('#app');
