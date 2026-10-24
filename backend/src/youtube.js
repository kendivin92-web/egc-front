const SUNDAY_TITLE_PATTERN = /\bdimanche\b|\bculte\b.*\bdimanche\b|\bdimanche\b.*\bculte\b/i;
const DATE_PATTERN = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/;

function decodeXml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function getElement(entry, name) {
  const match = entry.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return match ? decodeXml(match[1].trim()) : "";
}

function getSundayDate(title, published) {
  const titleDate = title.match(DATE_PATTERN);
  if (titleDate) {
    return `${titleDate[3]}-${titleDate[2].padStart(2, "0")}-${titleDate[1].padStart(2, "0")}`;
  }
  const date = new Date(published);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function parseSundayVideos(xml, limit = 4) {
  const videos = [];
  const seenDates = new Set();
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = getElement(entry, "yt:videoId");
    const title = getElement(entry, "title");
    const published = getElement(entry, "published");
    if (!/^[\w-]{11}$/.test(id) || !title || !SUNDAY_TITLE_PATTERN.test(title)) continue;

    const date = getSundayDate(title, published);
    if (!date || seenDates.has(date)) continue;
    seenDates.add(date);
    videos.push({ id, title, published, date });
    if (videos.length === limit) break;
  }
  return videos;
}
