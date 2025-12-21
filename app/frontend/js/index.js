async function OnSearch() {
    var query = document.querySelector("#searchInput").value;

    await fetch("api/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            query: query
        })
    }).then(response => {
        if (!response.ok) {
            throw new Error('HTTP error ' + response.status);
        }

        return response.json();
    }).then(data => {
        const container = document.querySelector("#cards-row");

        container.innerHTML = "";

        data.forEach((element, index) => {
            const col = document.createElement("div");
            col.className = "col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 d-flex";

            col.innerHTML = `
                <div class="card h-100 w-100 d-flex flex-column" onclick="OnParse('${element.pageUrl}', null)">
                    <div class="card-body d-flex flex-column">
                    <h5 class="card-title">
                        ${element.title}
                    </h5>

                    <div class="mt-auto d-flex justify-content-center">
                        <div style="max-height:150px; display:flex; align-items:flex-end;">
                        <img src="${element.posterUrl}" alt="${element.title}" class="img-fluid" style="max-width:100%; max-height:100%;">
                        </div>
                    </div>
                    </div>
                </div>
            `;

            container.appendChild(col);

            // add animation
            setTimeout(() => {
                col.querySelector(".card").classList.add("visible");
            }, index * 100);
        });
    }).catch(error => {
        console.error('Error:', error);
    })
}

async function OnClear() {
    document.querySelector("#searchInput").value = "";
    document.querySelector("#cards-row").innerHTML = "";
}

async function OnDownload(url, filename) {
    try {
        await fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }

                showSpinner();

                return response.blob();
            }).then(data => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(data);
                a.download = filename;
                document.body.appendChild(a);
                a.click();

                URL.revokeObjectURL(a.href);
                a.remove();
            }).catch(error => {
                console.error('Error:', error);
            })
    } catch (e) {
        alert('Error downloading file');
        console.error(e);
    } finally {
        hideSpinner();
    }
}

async function OnParse(url, data_translator_id) {
    await fetch("api/parse", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: url,
            data_translator_id: data_translator_id
        })
    }).then(response => {
        if (!response.ok) {
            throw new Error('HTTP error ' + response.status);
        }

        return response.json();
    }).then(data => {
        showParseResult(data, url);
    }).catch(error => {
        console.error('Error:', error);
    })
}

function showParseResult(data, url) {
    if (!data) {
        return showModal('<pre>No data</pre>');
    }

    const title = data.title || data.titleOriginal || 'No title';
    const titleOriginal = data.titleOriginal || '';
    const posterDiv = data.posterUrl ? `<div class="text-center mb-3"><img class="img-fluid" style="max-height: 250px;" src="${data.posterUrl}" alt="${title}"></div>` : '';

    const streams = Array.isArray(data.streams) && data.streams.length ? `
        <h6>Streams</h6>
        <ul class="list-unstyled">
        ${data.streams.map(s => {
        const quality = escapeHtml(s.quality);
        const mp4 = encodeURIComponent(s.mp4);
        const mp4FileName = escapeHtml(s.mp4FileName);
        const mp4Android = encodeURIComponent(s.mp4Android);

        return `
                    <li class="mb-2">
                        [${quality}] > 

                        ${isAndroid() ? `<button type="button" class="btn btn-sm btn-outline-secondary" onclick="openStream(decodeURIComponent('${mp4Android}'))">
                            Watch External
                        </button>` : ''}
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="showPlayer(decodeURIComponent('${mp4}'))">
                            Watch
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="openStream(decodeURIComponent('${mp4}'))">
                            Open in Tab
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="copyStreamUrl(decodeURIComponent('${mp4}'))">
                            Copy Url
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="OnDownload(decodeURIComponent('${mp4}'), '${mp4FileName}')">
                            Download
                        </button>
                    </li>`;
    }).join('')}
        </ul>
    ` : '';

    const videoEmbedContainer = `<div id="video-player-container" class="mb-3"></div>`;
    const translations = Array.isArray(data.translations) && data.translations.length ? `
        <h6>Translations</h6>
        <div class="d-flex flex-wrap">
            ${data.translations.map(t => `
                <button onclick="OnParse('${url}', '${t.data_translator_id}')"type="button" class="btn btn-sm ${t.active ? 'btn-success' : 'btn-outline-primary'} me-2 mb-2" ${t.active ? 'disabled' : ''}>
                    ${escapeHtml(t.name)}
                </button>
            `).join('')}
        </div>
    ` : '';

    const modalTitle = `<h4><a href="${url}" target="_blank">${escapeHtml(titleOriginal)}</a></h4>`;
    const modalHtml = `
        <div>
            ${posterDiv}
            <div>
                ${videoEmbedContainer}
                ${translations}
                ${streams}
            </div>
        </div>`;

    showModal(modalHtml, modalTitle);
}

function showPlayer(url) {
    const container = document.querySelector('#video-player-container');
    if (!container) {
        return;
    }

    if (/(\.mp4|\.m3u8)$/i.test(url)) {
        container.innerHTML = `
            <h6>Video</h6>
            <div class="embed-responsive embed-responsive-16by9">
                <iframe class="embed-responsive-item" src="${url}" allowfullscreen></iframe>
            </div>`;
    }
}

function isAndroid() {
    return /android/i.test(navigator.userAgent);
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openStream(url) {
    try {
        window.open(url, '_blank');
    } catch (e) {
        console.error(e);
    }
}

function copyStreamUrl(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            // optional: small feedback
        }).catch(() => {
            console.error('Copy failed');
        });
    } else {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
        } catch (e) {

        }
        ta.remove();
    }
}
