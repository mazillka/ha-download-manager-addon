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
    if (!m) return;
    if (m._bsModal) return m._bsModal.hide();
    m.classList.remove('show');
    m.style.display = 'none';
}

function showModal(html, title) {
    const m = document.querySelector('#global-modal');
    if (!m) return;
    const body = m.querySelector('.modal-body');
    const titleEl = m.querySelector('.modal-title');
    body.innerHTML = html;
    if (titleEl) titleEl.innerHTML = title || '';
    if (m._bsModal) return m._bsModal.show();
    m.style.display = 'block';
    setTimeout(() => m.classList.add('show'), 10);
}

function showParseResult(data, url) {
    if (!data) 
        return showModal('<pre>No data</pre>');
    
    const title = data.title || data.titleOriginal || 'No title';
    const titleOriginal = data.titleOriginal || '';
    const originalTitleHtml = titleOriginal && titleOriginal !== title ? `<p class="text-muted small">${escapeHtml(titleOriginal)}</p>` : '';
    const img = data.imgSrc ? `<div class="text-center mb-3"><img class="img-fluid" style="max-height: 250px;" src="${data.imgSrc}" alt="${title}"></div>` : '';
    const streams = Array.isArray(data.streams) && data.streams.length ? `
        <h6>Streams</h6>
        <ul class="list-unstyled">
            ${data.streams.map(s => {
                const label = escapeHtml(getStreamLabel(s));
                // prefer an explicit .mp4 URL if present, otherwise convert .m3u8 -> .mp4 as a best-effort fallback
                let mp4url = '';
                const mp4match = String(s).match(/https?:\/\/[^'"\s]+?\.mp4(\?[^'"\s]*)?/i);
                if (mp4match) mp4url = mp4match[0];
                else if (/\.m3u8/i.test(String(s))) mp4url = String(s).replace(/\.m3u8/i, '.mp4');
                else mp4url = String(s);
                const encoded = encodeURIComponent(mp4url);
                return `<li class="mb-2"><button type="button" class="btn btn-sm btn-primary me-2" onclick="openStream(decodeURIComponent('${encoded}'))">${label}</button><button type="button" class="btn btn-sm btn-outline-secondary" onclick="copyStreamUrl(decodeURIComponent('${encoded}'))">Copy</button></li>`;
            }).join('')}
        </ul>
    ` : '';
     
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
            <h4>
                <a href="${url}" target="_blank">${escapeHtml(title)}</a>
            </h4>
            ${originalTitleHtml}
            ${img}
            <div>
                ${translations}
                ${streams}
            </div>
        </div>`;
    showModal(html);
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getStreamLabel(s) {
    if (!s) return 'link';
    // try to find usual quality token like 360p, 720p, 1080p
    const m = String(s).match(/(\d{3,4}p)/i);
    if (m) return m[1].toLowerCase();
    // fallback: look for resolution numbers
    const m2 = String(s).match(/(360|480|720|1080|1440|2160)/);
    if (m2) return m2[1] + 'p';
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
    try { window.open(url, '_blank'); } catch (e) { console.error(e); }
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
        ta.value = url; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        ta.remove();
    }
}

// const tasks = {};
// async function start() {
//     const r = await fetch("api/downloads", {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//             url: url.value,
//             filename: name.value
//         })
//     });
//     const { id } = await r.json();
//     render(id);
//     poll(id);
// }

// function render(id) {
//     const d = document.createElement("div");
//     d.innerHTML = `<div class="mt-2">
//         <div class="progress mb-1"><div class="progress-bar" style="width:0%">0%</div></div>
//         <button class="btn btn-sm btn-warning" onclick="pause('${id}')">Pause</button>
//         <button class="btn btn-sm btn-success" onclick="resume('${id}')">Resume</button>
//         <button class="btn btn-sm btn-danger" onclick="cancel('${id}')">Cancel</button>
//         <pre class="status"></pre></div>`;
//     document.getElementById("tasks").appendChild(d);
//     tasks[id] = {
//         bar: d.querySelector(".progress-bar"),
//         status: d.querySelector(".status")
//     };
// }

// async function poll(id) {
//     const r = await fetch(`api/downloads/${id}`);
//     const t = await r.json();
//     if (t.total) {
//         const p = Math.floor((t.downloaded / t.total) * 100);
//         tasks[id].bar.style.width = p + "%"; tasks[id].bar.textContent = p + "%";
//     }
//     tasks[id].status.textContent = t.status;
//     if (["queued", "downloading"].includes(t.status))
//         setTimeout(() => poll(id), 1000);
// }

// function pause(id) {
//     fetch(`api/downloads/${id}/pause`, { method: "POST" })
// }

// function resume(id) {
//     fetch(`api/downloads/${id}/resume`, { method: "POST" })
// }

// function cancel(id) {
//     fetch(`api/downloads/${id}`, { method: "DELETE" })
// }

// function setSpeed() {
//     fetch("api/options", {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//             max_speed: parseInt(speed.value)
//         })
//     });
// }