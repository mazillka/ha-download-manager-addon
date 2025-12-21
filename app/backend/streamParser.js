export function parseMp4Streams(data) {
    const trashList = ["@", "#", "!", "^", "$"];

    function combinations(arr, n) {
        if (n === 1) {
            return arr.map(a => [a]);
        }
        const smaller = combinations(arr, n - 1);
        return arr.flatMap(a => smaller.map(s => [...s, a]));
    }

    function unite(arr) {
        return arr.map(e => e.join(''));
    }

    const two = unite(combinations(trashList, 2));
    const three = unite(combinations(trashList, 3));
    const trashCodesSet = two.concat(three);

    let trashString = data.replace("#h", "").split("//_//").join('');
    const trashRegex = new RegExp(trashCodesSet.map(i => btoa(i)).join('|'), 'g');
    trashString = trashString.replace(trashRegex, '');

    let decoded;
    try {
        decoded = atob(trashString);
    } catch (e) {
        console.error("Failed to decode:", trashString);
        return [];
    }

    const result = [];
    const qualityRegex = /\[(\d+p[^\]]*)\]/g;
    let match;
    let lastIndex = 0;
    let currentQuality = null;

    while ((match = qualityRegex.exec(decoded)) !== null) {
        const textSegment = decoded.slice(lastIndex, match.index);
        if (currentQuality) {
            const urls = textSegment.match(/https?:\/\/[^\s,]+/g) || [];
            const mp4Url = urls.find(url => url.endsWith('.mp4')) || null;
            if (mp4Url) {
                result.push({ quality: currentQuality, mp4: mp4Url });
            }
        }
        currentQuality = match[1].trim();
        lastIndex = match.index + match[0].length;
    }

    const remainingText = decoded.slice(lastIndex);
    if (currentQuality) {
        const urls = remainingText.match(/https?:\/\/[^\s,]+/g) || [];
        const mp4Url = urls.find(url => url.endsWith('.mp4')) || null;
        if (mp4Url) {
            result.push({ quality: currentQuality, mp4: mp4Url });
        }
    }

    return result;
}
