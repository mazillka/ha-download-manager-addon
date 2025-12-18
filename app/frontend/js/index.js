async function OnSearch() {
    var query = document.querySelector("#searchInput").value;

    const request = await fetch("api/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            query: query
        })
    });
    const response = await request.json();

    const container = document.querySelector("#cards-row");

    container.innerHTML = "";

    response.forEach((element, index) => {
        const col = document.createElement("div");
        col.className = "col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 d-flex";

        col.innerHTML = `
            <div class="card h-100 w-100 d-flex flex-column" onclick="OnParse('${element.url}', null)">
                <div class="card-body d-flex flex-column">
                <h5 class="card-title">
                    ${element.title}
                </h5>

                <div class="mt-auto d-flex justify-content-center">
                    <div style="max-height:150px; display:flex; align-items:flex-end;">
                    <img src="${element.imgSrc}" alt="${element.title}" class="img-fluid" style="max-width:100%; max-height:100%;">
                    </div>
                </div>
                </div>
            </div>
        `;

        container.appendChild(col);

        // Додаємо клас для анімації з невеликою затримкою
        setTimeout(() => {
            col.querySelector(".card").classList.add("visible");
        }, index * 100); // по 100мс між картками
    });
}

async function OnClear() {
    document.querySelector("#searchInput").value = "";
    document.querySelector("#cards-row").innerHTML = "";
}

async function OnDownload(url, filename) {
    try {
        const response = await fetch(url);
        if (!response.ok)
        {
            throw new Error('Download failed');
        }

       showSpinner();

        const blob = await response.blob();

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        URL.revokeObjectURL(a.href);
        a.remove();
    } catch (e) {
        alert('Error downloading file');
        console.error(e);
    } finally {
        hideSpinner();
    }
}

async function OnParse(url, data_translator_id) {
    const request = await fetch("api/parse", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: url,
            data_translator_id: data_translator_id
        })
    });
    const response = await request.json();
    showParseResult(response, url);
}

function hideModal() {
    const m = document.querySelector('#global-modal');
    if (!m)
        return;
    if (m._bsModal)
        return m._bsModal.hide();
    m.classList.remove('show');
    m.style.display = 'none';
}

function showModal(html, title) {
    const m = document.querySelector('#global-modal');
    if (!m)
        return;
    const body = m.querySelector('.modal-body');
    const titleEl = m.querySelector('.modal-title');
    body.innerHTML = html;
    if (titleEl)
        titleEl.innerHTML = title || '';
    if (m._bsModal)
        return m._bsModal.show();
    m.style.display = 'block';
    setTimeout(() => m.classList.add('show'), 10);
}

function showParseResult(data, url) {
    if (!data)
        return showModal('<pre>No data</pre>');

    const title = data.title || data.titleOriginal || 'No title';
    const titleOriginal = data.titleOriginal || '';
    const img = data.imgSrc ? `<div class="text-center mb-3"><img class="img-fluid" style="max-height: 250px;" src="${data.imgSrc}" alt="${title}"></div>` : '';

    const streamUrls = [];

    const streams = Array.isArray(data.streams) && data.streams.length ? `
        <h6>Streams</h6>
        <ul class="list-unstyled">
        ${data.streams.map(s => {
            const label = escapeHtml(getStreamLabel(s));
            // prefer an explicit .mp4 URL if present, otherwise convert .m3u8 -> .mp4 as a best-effort fallback
            let mp4url = '';
            const mp4match = String(s).match(/https?:\/\/[^'"\s]+?\.mp4(\?[^'"\s]*)?/i);
            if (mp4match)
                mp4url = mp4match[0];
            else if (/\.m3u8/i.test(String(s)))
                mp4url = String(s).replace(/\.m3u8/i, '.mp4');
            else
                mp4url = String(s);
            const encoded = encodeURIComponent(mp4url);
            const intentUrl = `intent:${mp4url}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`;
            const encodedIntent = encodeURIComponent(intentUrl);
            const filename = `${data.titleOriginal || data.title} [${label}].mp4`;

            streamUrls.push({
                label: label,
                url: mp4url
            });

            return `
                    <li class="mb-2">
                        [${label}] > 

                        ${isAndroid() ? `<button type="button" class="btn btn-sm btn-outline-secondary" onclick="openStream(decodeURIComponent('${encodedIntent}'))">
                            Watch External
                        </button>` : ''}
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="showPlayer(decodeURIComponent('${encoded}'))">
                            Watch
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="openStream(decodeURIComponent('${encoded}'))">
                            Open in Tab
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="copyStreamUrl(decodeURIComponent('${encoded}'))">
                            Copy Url
                        </button>




                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="OnDownload('${mp4url}', '${escapeHtml(filename)}')">
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

    const html = `
        <div>
            ${img}
            <div>
                ${videoEmbedContainer}
                ${translations}
                ${streams}
            </div>
        </div>`;
    showModal(html, `<h4><a href="${url}" target="_blank">${escapeHtml(titleOriginal)}</a></h4>`);
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

function getStreamLabel(s) {
    if (!s)
        return 'link';
    // try to find usual quality token like 360p, 720p, 1080p
    const m = String(s).match(/(\d{3,4}p)/i);
    if (m)
        return m[1].toLowerCase();
    // fallback: look for resolution numbers
    const m2 = String(s).match(/(360|480|720|1080|1440|2160)/);
    if (m2)
        return m2[1] + 'p';
    // fallback: last path segment
    try {
        const u = new URL(s);
        const parts = u.pathname.split('/').filter(Boolean);
        const last = parts.pop() || u.hostname;
        return last.split('.')[0];
    } catch (e) {
        return 'link';
    }
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
