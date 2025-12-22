import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

const baseUrl = "https://hdrezka.me";

const wathing = `${baseUrl}/?filter=watching`;
const popular = `${baseUrl}/?filter=popular`;
const last = `${baseUrl}/?filter=last`;

createApp({
    data() {
        return {
            query: '',
            results: [],
            loading: false,
            selectedItem: null,
            selectedUrl: null,
            videoUrl: null,
            modalInstance: null,
            activeTab: 'search',
            tabs: [
                { id: 'search', name: 'Search' },
                { id: 'watching', name: 'Watching' },
                { id: 'popular', name: 'Popular' },
                { id: 'last', name: 'Last' }
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
            else if (tabId === 'last') {
                url = last;
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
        async download(url, filename) {
            this.loading = true;
            await fetch(url)
                .then(async response => {
                    if (!response.ok) {
                        throw new Error('HTTP error ' + response.status);
                    }

                    return await response.blob();
                })
                .then(blob => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(a.href);
                    a.remove();
                })
                .catch(error => {
                    console.error('Error:', error);
                })
                .finally(() => {
                    this.loading = false;
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
