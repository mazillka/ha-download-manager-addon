import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

const baseUrl = "https://hdrezka.me";

const wathing = `${baseUrl}/?filter=watching`;
const popular = `${baseUrl}/?filter=popular`;
const latest = `${baseUrl}/?filter=last`;

let modalInstance = null;

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
            downloadController: null,
            selectedItem: null,
            selectedUrl: null,
            videoUrl: null,
            serverDownloads: [],
            serverPollInterval: null,
            activeTab: 'search',
            tabs: [
                { id: 'search', name: 'Search' },
                { id: 'watching', name: 'Watching Now' },
                { id: 'latest', name: 'Latest arrivals' },
                { id: 'popular', name: 'Popular' },
                { id: 'downloads', name: 'Downloads' }
            ]
        }
    },
    computed: {
        isAndroid() {
            return /android/i.test(navigator.userAgent);
        },
        activeServerDownloads() {
            return this.serverDownloads.filter(d => d.status === 'downloading' || d.status === 'pending').length;
        }
    },
    mounted() {
        // Initialize Bootstrap modal
        const modalEl = this.$refs.modalRef;
        // eslint-disable-next-line no-undef
        modalInstance = new bootstrap.Modal(modalEl);

        modalEl.addEventListener('hidden.bs.modal', () => {
            this.videoUrl = null; // Stop video when modal closes
        });

        this.fetchServerDownloads();
        this.serverPollInterval = setInterval(() => this.fetchServerDownloads(), 1000);
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
                modalInstance.show();
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
            this.downloadController = new AbortController();
            this.downloadProgress = 0;
            this.downloadLoaded = 0;
            this.downloadTotal = 0;
            this.downloadSpeed = 0;

            try {
                const response = await fetch(url, { signal: this.downloadController.signal });
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
                if (error.name === 'AbortError') {
                    console.log('Download cancelled');
                } else {
                    console.error('Error:', error);
                }
            } finally {
                this.loading = false;
                this.downloadController = null;
                this.downloadProgress = 0;
                this.downloadLoaded = 0;
                this.downloadTotal = 0;
                this.downloadSpeed = 0;
            }
        },
        cancelDownload() {
            if (this.downloadController) {
                this.downloadController.abort();
            }
        },
        async downloadToServer(url, filename) {
            if (!confirm(`Download "${filename}" to server?`)) 
                return;
            try {
                await fetch("api/download", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url, filename })
                });
                this.fetchServerDownloads(); // Update count
                alert("Download started on server");
            } catch (e) {
                console.error(e);
                alert("Failed to start download");
            }
        },
        async fetchServerDownloads() {
            try {
                const res = await fetch("api/downloads");
                if (res.ok) this.serverDownloads = await res.json();
            } catch (e) { console.error(e); }
        },
        async cancelServerDownload(id) {
            if (!confirm("Cancel this download?")) return;
            try {
                await fetch(`api/downloads/${id}/cancel`, { method: "POST" });
                this.fetchServerDownloads();
            } catch (e) { console.error(e); }
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
