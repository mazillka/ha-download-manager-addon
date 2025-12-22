import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

const baseUrl = "https://hdrezka.me";

const wathing = `${baseUrl}/?filter=watching`;
const popular = `${baseUrl}/?filter=popular`;
const latest = `${baseUrl}/?filter=last`;

createApp({
    data() {
        return {
            query: '',
            results: [],
            loading: false,
            downloadProgress: 0,
            downloadLoaded: 0,
            downloadTotal: 0,
            downloadSpeed: 0,
            selectedItem: null,
            selectedUrl: null,
            videoUrl: null,
            modalInstance: null,
            activeTab: 'search',
            tabs: [
                { id: 'search', name: 'Search' },
                { id: 'watching', name: 'Watching Now' },
                { id: 'latest', name: 'Latest arrivals' },
                { id: 'popular', name: 'Popular' }
            ]
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
        async selectTab(tabId) {
            this.activeTab = tabId;
            if (tabId === 'search') {
                this.results = [];
                return;
            }

            let url;
            if (tabId === 'watching') {
                url = wathing;
            }
            else if (tabId === 'popular') {
                url = popular;
            }
            else if (tabId === 'latest') {
                url = latest;
            }

            if (url) {
                await this.fetchList(url);
            }
        },
        async fetchList(url) {
            this.loading = true;
            this.results = [];

            await fetch("api/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url })
            }).then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }

                return response.json();
            }).then(data => {
                this.results = data;
            }).catch(error => {
                console.error('Error:', error);
            }).finally(() => {
                this.loading = false;
            });
        },
        async search() {
            if (!this.query) {
                return;
            }
            const searchUrl = `${baseUrl}/search/?do=search&subaction=search&q=${encodeURIComponent(this.query)}`;
            await this.fetchList(searchUrl);
        },
        async clear() {
            this.query = '';
            this.results = [];
        },
        async parse(url, data_translator_id = null) {
            this.loading = true;
            await fetch("api/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, data_translator_id })
            }).then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }
                return response.json();

            }).then(data => {
                this.selectedItem = data;
                this.selectedUrl = url;
                this.videoUrl = null; // Reset video player
                this.modalInstance.show();
            }).catch(error => {
                console.error('Error:', error);
            }).finally(() => {
                this.loading = false;
            });
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
        formatBytes(bytes, decimals = 2) {
            if (!+bytes) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
        },
        async download(url, filename) {
            this.loading = true;
            this.downloadProgress = 0;
            this.downloadLoaded = 0;
            this.downloadTotal = 0;
            this.downloadSpeed = 0;

            try {
                const response = await fetch(url);
                if (!response.ok)
                    throw new Error('HTTP error ' + response.status);

                const contentLength = response.headers.get('content-length');
                const total = contentLength ? parseInt(contentLength, 10) : 0;
                this.downloadTotal = total;
                let loaded = 0;
                let lastLoaded = 0;
                let lastTime = Date.now();

                const reader = response.body.getReader();
                const chunks = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    chunks.push(value);
                    loaded += value.length;
                    this.downloadLoaded = loaded;
                    if (total)
                        this.downloadProgress = Math.round((loaded / total) * 100);

                    const now = Date.now();
                    if (now - lastTime >= 500) {
                        this.downloadSpeed = (loaded - lastLoaded) / ((now - lastTime) / 1000);
                        lastLoaded = loaded;
                        lastTime = now;
                    }
                }

                const blob = new Blob(chunks);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(a.href);
                a.remove();
            } catch (error) {
                console.error('Error:', error);
            } finally {
                this.loading = false;
                this.downloadProgress = 0;
                this.downloadLoaded = 0;
                this.downloadTotal = 0;
                this.downloadSpeed = 0;
            }
        },
        handleParse(t) {
            if (t.url) {
                this.parse(t.url, null);
            } else {
                this.parse(this.selectedUrl, t.data_translator_id);
            }
        }
    }
}).mount('#app');
