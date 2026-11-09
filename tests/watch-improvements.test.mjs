import test from 'node:test';
import assert from 'node:assert/strict';
import { exactTitleCandidates } from '../src/lib/title-matching.ts';
import { subtitleTrackIndex } from '../src/lib/subtitles.ts';
import { resolveDownloadEpisode } from '../src/lib/episode-download.ts';

test('title matching requires an exact unique variant, including synonyms', () => {
  const candidates = [{ id: 1, titles: ['Romance Dawn Story', 'One Piece: Romance Dawn Story'] }, { id: 2, titles: ['One Piece'] }];
  assert.deepEqual(exactTitleCandidates('One Piece: Romance Dawn Story', candidates).map(x => x.id), [1]);
  assert.deepEqual(exactTitleCandidates('One Piece special', candidates), []);
  assert.equal(exactTitleCandidates('One Piece', [...candidates, { id: 3, titles: ['ONE PIECE'] }]).length, 2);
});

test('subtitle selection prefers English, then default, and handles missing tracks', () => {
  assert.equal(subtitleTrackIndex([{ lang: 'ja', default: true }, { lang: 'en-US' }]), 1);
  assert.equal(subtitleTrackIndex([{ name: 'French' }, { name: 'Default', default: true }]), 1);
  assert.equal(subtitleTrackIndex([{ name: 'Unknown' }]), 0);
  assert.equal(subtitleTrackIndex([]), -1);
});

test('download resolver uses requested episode without playback selection and rejects ambiguity', async t => {
  const old = globalThis.fetch; t.after(() => { globalThis.fetch = old; });
  let duplicate = false;
  globalThis.fetch = async raw => {
    const url = new URL(raw);
    if (url.pathname.includes('search')) return Response.json({ items: [{ id: '123', title: 'Example' }] });
    assert.equal(url.searchParams.get('animeId'), '123');
    return Response.json({ episodes: [{ id: '1', number: 1 }, { id: '8', number: 8 }, ...(duplicate ? [{ id: '9', number: 8 }] : [])] });
  };
  assert.equal(await resolveDownloadEpisode(['Example'], null, 8), '8');
  duplicate = true;
  await assert.rejects(resolveDownloadEpisode(['Example'], null, 8), /not uniquely available/);
  await assert.rejects(resolveDownloadEpisode(['Other'], null, 8), /No unique/);
});

test('a saved provider title does not fail over just because a fresh search failed', async () => {
  const { server1Failure } = await import('../src/lib/server-failover.ts');
  assert.equal(server1Failure({ active: true, searchStatus: 'error', searching: false, manualSearch: false, matchCount: 0, hasChosenTitle: true, episodesStatus: 'success', loadingEpisodes: false, matchingEpisodes: 1 }), null);
});
