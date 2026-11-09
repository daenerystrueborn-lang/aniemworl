import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchQualities, parseMediaPlaylist, unwrapSegment, downloadHls } from '../src/lib/download.ts';

test('quality list resolves URLs and does not offer variants with separate audio', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(`#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="external",URI="audio.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720,AUDIO="external"
720.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480
../480.m3u8`);
  assert.deepEqual(await fetchQualities('https://example.test/show/master.m3u8'), [{ label: '480p', bandwidth: 1000000, url: 'https://example.test/480.m3u8' }]);
});

test('media parsing rejects encrypted, live, range and unsupported playlists', () => {
  const root = 'https://example.test/path/list.m3u8';
  assert.throws(() => parseMediaPlaylist('#EXTM3U\n#EXTINF:5,\na.ts', root), /Live/);
  assert.throws(() => parseMediaPlaylist('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXTINF:5,\na.ts\n#EXT-X-ENDLIST', root), /Encrypted/);
  assert.throws(() => parseMediaPlaylist('#EXTM3U\n#EXT-X-BYTERANGE:10@0\n#EXTINF:5,\na.ts\n#EXT-X-ENDLIST', root), /cannot be safely/);
  assert.deepEqual(parseMediaPlaylist('#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:5,\n../a.m4s\n#EXT-X-ENDLIST', root), { initUrl: 'https://example.test/path/init.mp4', segments: ['https://example.test/a.m4s'] });
});

test('unwrapping strips only recognized image headers with valid TS sync', () => {
  const image = new Uint8Array(600);
  image.set([0x89, 0x50, 0x4e, 0x47]);
  image[20] = image[208] = image[396] = 0x47;
  assert.equal(unwrapSegment(image).length, 580);
  assert.throws(() => unwrapSegment(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), /unsupported image/);
});

test('concurrent segment downloads are saved in playlist order', async (t) => {
  const oldFetch = globalThis.fetch;
  const oldDocument = globalThis.document;
  const oldCreate = URL.createObjectURL;
  const oldRevoke = URL.revokeObjectURL;
  const oldTimeout = globalThis.setTimeout;
  let saved, filename, clicked = false;
  t.after(() => { globalThis.fetch = oldFetch; globalThis.document = oldDocument; URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; globalThis.setTimeout = oldTimeout; });
  const ts = (n) => { const b = new Uint8Array(564); b[0] = b[188] = b[376] = 0x47; b[1] = n; return b; };
  globalThis.fetch = async (url) => {
    if (url.endsWith('playlist')) return new Response('#EXTM3U\n#EXTINF:1,\na.ts\n#EXTINF:1,\nb.ts\n#EXT-X-ENDLIST');
    if (url.endsWith('a.ts')) await new Promise((resolve) => oldTimeout(resolve, 10));
    return new Response(ts(url.endsWith('a.ts') ? 1 : 2));
  };
  URL.createObjectURL = (blob) => { saved = blob; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  globalThis.setTimeout = (fn, delay) => { if (delay === 10000) return 0; return oldTimeout(fn, delay); };
  globalThis.document = { body: { appendChild() {} }, createElement: () => ({ set download(v) { filename = v; }, click() { clicked = true; }, remove() {} }) };
  const progress = [];
  await downloadHls('https://example.test/playlist', 'Show - Episode 1', (p) => progress.push(p));
  assert.equal(clicked, true);
  assert.equal(filename, 'Show - Episode 1.ts');
  const result = new Uint8Array(await saved.arrayBuffer());
  assert.equal(result[1], 1);
  assert.equal(result[565], 2);
  assert.equal(progress.at(-1).percent, 100);
});

test('failed segment does not trigger a partial save', async (t) => {
  const oldFetch = globalThis.fetch;
  const oldDocument = globalThis.document;
  t.after(() => { globalThis.fetch = oldFetch; globalThis.document = oldDocument; });
  globalThis.fetch = async (url) => url.endsWith('playlist')
    ? new Response('#EXTM3U\n#EXTINF:1,\na.ts\n#EXT-X-ENDLIST')
    : new Response('', { status: 403 });
  globalThis.document = { createElement: () => { throw new Error('should not save'); } };
  await assert.rejects(downloadHls('https://example.test/playlist', 'Episode', () => {}), /HTTP 403/);
});

test('cancelling a download does not save a partial file', async (t) => {
  const oldFetch = globalThis.fetch;
  const oldDocument = globalThis.document;
  t.after(() => { globalThis.fetch = oldFetch; globalThis.document = oldDocument; });
  globalThis.fetch = async (url, options = {}) => {
    if (url.endsWith('playlist')) return new Response('#EXTM3U\n#EXTINF:1,\na.ts\n#EXT-X-ENDLIST');
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  };
  globalThis.document = { createElement: () => { throw new Error('should not save'); } };
  const controller = new AbortController();
  const downloading = downloadHls('https://example.test/playlist', 'Episode', () => {}, controller.signal);
  await new Promise((resolve) => setTimeout(resolve, 10));
  controller.abort();
  await assert.rejects(downloading, { name: 'AbortError' });
});

test('rejects session-encrypted master playlists', async (t) => {
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = async () => new Response('#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="key"\n#EXT-X-STREAM-INF:BANDWIDTH=1\na.m3u8');
  await assert.rejects(fetchQualities('https://example.test/master'), /Encrypted/);
});
