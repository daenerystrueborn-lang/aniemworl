import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRenderStream } from '../src/lib/render-download.ts';

const options = () => ({ animeId: '900', malId: 80, titles: ['Example'], episodeNumber: 2, track: 'sub', signal: new AbortController().signal });
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

test('matches anime by external IDs and resolves the selected episode', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (raw, opts = {}) => {
    const url = new URL(raw);
    if (url.pathname === '/api/anifam/search') return json({ data: [{ id: 3, title: 'Other' }, { id: 4, title: 'Example' }] });
    if (url.pathname === '/api/anifam/anime/4') return json({ mal_id: 80 });
    if (url.pathname === '/api/anifam/episodes/4') return json({ data: [{ id: 20, number: 2, has_sub: true }] });
    if (url.pathname === '/api/anifam/play') {
      assert.deepEqual(JSON.parse(opts.body), { episodeId: 20, track: 'sub' });
      return json({ status: 'ready', mode: 'hls', proxyHlsUrl: '/api/proxy/hls?token=test' });
    }
    throw new Error(`Unexpected endpoint: ${url}`);
  };
  assert.equal(await resolveRenderStream(options()), 'https://app-decompiling.onrender.com/api/proxy/hls?token=test');
});

test('refuses a title match with the wrong external ID', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (raw) => new URL(raw).pathname.endsWith('/search') ? json({ data: [{ id: 4, title: 'Example' }] }) : json({ anilist_id: 901, mal_id: 80 });
  await assert.rejects(resolveRenderStream(options()), /could not be matched/);
});

test('rejects a web embed and an untrusted playlist URL', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let mode = 'iframe';
  globalThis.fetch = async (raw) => {
    const path = new URL(raw).pathname;
    if (path.endsWith('/search')) return json({ data: [{ id: 4, title: 'Example' }] });
    if (path.endsWith('/anime/4')) return json({ anilist_id: 900 });
    if (path.endsWith('/episodes/4')) return json({ data: [{ id: 20, number: 2, has_sub: true }] });
    return json({ status: 'ready', mode, proxyHlsUrl: 'https://other.example/api/proxy/hls?token=test' });
  };
  await assert.rejects(resolveRenderStream(options()), /embedded player/);
  mode = 'hls';
  await assert.rejects(resolveRenderStream(options()), /invalid playlist link/);
});

test('does not download a missing or unavailable episode', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (raw) => {
    const path = new URL(raw).pathname;
    if (path.endsWith('/search')) return json({ data: [{ id: 4, title: 'Example' }] });
    if (path.endsWith('/anime/4')) return json({ mal_id: 80 });
    if (path.endsWith('/episodes/4')) return json({ data: [{ id: 20, number: 2, has_sub: false }] });
    throw new Error('Should not request playback');
  };
  await assert.rejects(resolveRenderStream(options()), /not available in SUB/);
});

test('returns subtitle files from the same verified playback source', async (t) => {
  const { resolveRenderPlayback } = await import('../src/lib/render-download.ts');
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (raw) => {
    const path = new URL(raw).pathname;
    if (path.endsWith('/search')) return json({ data: [{ id: 4, title: 'Example' }] });
    if (path.endsWith('/anime/4')) return json({ anilist_id: 900 });
    if (path.endsWith('/episodes/4')) return json({ data: [{ id: 20, number: 2, has_sub: true }] });
    return json({ status: 'ready', mode: 'hls', proxyHlsUrl: '/api/proxy/hls?token=stream', subtitles: [
      { lang: 'en', label: 'English', proxyUrl: '/api/proxy/subtitle?token=subtitle' },
      { lang: 'ja', proxyUrl: 'https://other.example/api/proxy/subtitle?token=bad' },
    ] });
  };
  const playback = await resolveRenderPlayback(options());
  assert.equal(playback.url, 'https://app-decompiling.onrender.com/api/proxy/hls?token=stream');
  assert.equal(playback.subtitles.length, 1);
  assert.equal(playback.subtitles[0].url, 'https://app-decompiling.onrender.com/api/proxy/subtitle?token=subtitle');
});
