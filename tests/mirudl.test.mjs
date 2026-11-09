import test from 'node:test';
import assert from 'node:assert/strict';
import { searchMiruTitles, exactMiruMatch, getMiruEpisodes, getMiruSession, renderUrl } from '../src/lib/mirudl.ts';
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

test('search deduplicates provider IDs and matches accented titles only when unambiguous', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => json({ items: [{ id: '100', title: 'Pokémon Horizons: The Series' }, { id: '100', title: 'Pokémon Horizons: The Series' }] });
  const result = await searchMiruTitles(['Pokémon Horizons: The Series', 'Pokemon Horizons']);
  assert.equal(result.length, 1);
  assert.equal(exactMiruMatch(['Pokemon Horizons The Series'], result)?.id, '100');
  assert.equal(exactMiruMatch(['Pokemon Horizons The Series'], [...result, { id: '101', title: 'Pokémon Horizons: The Series' }]), null);
  assert.equal(exactMiruMatch(['Unrelated'], result), null);
});

test('episodes use provider episode IDs and session requests the selected language and quality', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (raw) => {
    const url = new URL(raw);
    if (url.pathname === '/api/catalog/episodes') return json({ episodes: [{ id: '17900', number: 73, title: 'Episode 73', filler: false }] });
    assert.equal(url.pathname, '/api/mirudl/play');
    assert.equal(url.searchParams.get('episodeId'), '17900');
    assert.equal(url.searchParams.get('lang'), 'eng');
    assert.equal(url.searchParams.get('quality'), '720p');
    return json({ proxyHlsUrl: '/api/proxy/hls?token=master', proxySelectedHlsUrl: '/api/proxy/hls?token=720', downloadUrl: '/api/download?token=master', selectedQuality: '720p', variants: [{ label: '720p' }] });
  };
  const episodes = await getMiruEpisodes('1000004132');
  assert.equal(episodes[0].id, '17900');
  const session = await getMiruSession(episodes[0].id, 'dub', '720p');
  assert.equal(session.proxySelectedHlsUrl, 'https://app-decompiling.onrender.com/api/proxy/hls?token=720');
  assert.equal(session.variants[0].label, '720p');
});

test('rejects untrusted returned links and reports server errors', async (t) => {
  assert.throws(() => renderUrl('https://other.example/api/download?token=x', '/api/download'), /invalid server link/);
  assert.throws(() => renderUrl('/api/proxy/sign', '/api/download'), /invalid server link/);
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => json({ error: 'No stream for this episode' }, 404);
  await assert.rejects(getMiruSession('1', 'sub', 'auto'), /No stream for this episode/);
});

test('retains valid subtitle files supplied by a playback session', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => json({ proxyHlsUrl: '/api/proxy/hls?token=master', downloadUrl: '/api/download?token=master', subtitles: [{ lang: 'en', label: 'English', proxyUrl: '/api/proxy/subtitle?token=sub', default: true }] });
  const result = await getMiruSession('1', 'sub', 'auto');
  assert.equal(result.subtitles[0].lang, 'en');
  assert.equal(result.subtitles[0].url, 'https://app-decompiling.onrender.com/api/proxy/subtitle?token=sub');
});
