import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

let modalInstance = null;

createApp({
    data() {
        return {
            baseUrl: "https://hdrezka.me",
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

        this.fetchConfig();
        this.fetchServerDownloads();
        this.serverPollInterval = setInterval(() => this.fetchServerDownloads(), 1000);
    },
    methods: {
        async fetchConfig() {
            await fetch("api/config").then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }

                return response.json();
            }).then(data => {
                this.baseUrl = data.baseUrl;
            }).catch(error => {
                console.error('Error:', error);
            });
        },
        async selectTab(tabId) {
            this.activeTab = tabId;
            if (tabId === 'search') {
                this.results = [];
                return;
            }

            let url;
            if (tabId === 'watching') {
                url = `${this.baseUrl}/?filter=watching`;
            }
            else if (tabId === 'popular') {
                url = `${this.baseUrl}/?filter=popular`;
            }
            else if (tabId === 'latest') {
                url = `${this.baseUrl}/?filter=last`;
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
            const searchUrl = `${this.baseUrl}/search/?do=search&subaction=search&q=${encodeURIComponent(this.query)}`;
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
            if (!+bytes) {
                return '0 Bytes';
            }
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
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }

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
                    if (done) {
                        break;
                    }

                    chunks.push(value);
                    loaded += value.length;
                    this.downloadLoaded = loaded;
                    if (total) {
                        this.downloadProgress = Math.round((loaded / total) * 100);
                    }

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
            Swal.fire({
                title: "Are you sure?",
                text: `${filename} will be downloaded to server.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "No",
                customClass: {
                    confirmButton: "btn btn-success",
                    cancelButton: "btn btn-danger"
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await fetch("api/download", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url, filename })
                        });
                        this.fetchServerDownloads(); // Update count

                        Swal.fire({
                            title: "Download started on server!",
                            icon: "success",
                            customClass: {
                                confirmButton: "btn btn-success",
                                cancelButton: "btn btn-danger"
                            }
                        });

                    } catch (error) {
                        console.error('Error:', error);
                        Swal.fire({
                            title: "Failed to start download",
                            customClass: {
                                confirmButton: "btn btn-success",
                            }
                        });
                    }
                }
            });
        },
        async fetchServerDownloads() {
            await fetch("api/downloads")
                .then(response => {
                    if (!response.ok) {
                        throw new Error('HTTP error ' + response.status);
                    }
                    return response.json();
                }).then(data => {
                    this.serverDownloads = data;
                }).catch(error => {
                    console.error('Error:', error);
                });
        },
        async cancelServerDownload(id) {
            Swal.fire({
                title: "Are you sure?",
                text: "You won't be able to revert this!",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "No",
                customClass: {
                    confirmButton: "btn btn-success",
                    cancelButton: "btn btn-danger"
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await fetch(`api/downloads/${id}/cancel`, { method: "POST" });
                        this.fetchServerDownloads();
                    } catch (e) {
                        console.error('Error:', error);
                    }
                }
            });
        },
        async pauseServerDownload(id) {
            try {
                await fetch(`api/downloads/${id}/pause`, { method: "POST" });
                this.fetchServerDownloads();
            } catch (errora) {
                console.error('Error:', error);
            }
        },
        async resumeServerDownload(id) {
            try {
                await fetch(`api/downloads/${id}/resume`, { method: "POST" });
                this.fetchServerDownloads();
            } catch (error) {
                console.error('Error:', error);
            }
        },
        async deleteServerDownload(id) {
            Swal.fire({
                title: "Are you sure?",
                text: "Are you sure you want to delete this download task?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "No",
                customClass: {
                    confirmButton: "btn btn-success",
                    cancelButton: "btn btn-danger"
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: "Are you sure?",
                        text: "Do you also want to delete the file from the disk?",
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Yes",
                        cancelButtonText: "No",
                        customClass: {
                            confirmButton: "btn btn-success",
                            cancelButton: "btn btn-danger"
                        }
                    }).then(async (result) => {
                        try {
                            await fetch(`api/downloads/${id}?removeFile=${result.isConfirmed}`, { method: "DELETE" });
                            this.fetchServerDownloads();
                        } catch (error) {
                            console.error('Error:', error);
                        }
                    });
                }
            });
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
