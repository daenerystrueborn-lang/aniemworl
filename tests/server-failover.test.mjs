import test from 'node:test';
import assert from 'node:assert/strict';
import { server1Failure, withServerTimeout } from '../src/lib/server-failover.ts';

const defaults = {
  active: true, searchStatus: 'success', searching: false, manualSearch: false,
  matchCount: 1, hasChosenTitle: true, episodesStatus: 'success', loadingEpisodes: false, matchingEpisodes: 1,
};

test('switches only on confirmed server or episode failures', () => {
  assert.equal(server1Failure(defaults), null);
  assert.match(server1Failure({ ...defaults, searchStatus: 'error' }), /could not be reached/);
  assert.match(server1Failure({ ...defaults, episodesStatus: 'error' }), /episode list/);
  assert.match(server1Failure({ ...defaults, matchingEpisodes: 0 }), /episode is unavailable/);
  assert.match(server1Failure({ ...defaults, matchCount: 0, hasChosenTitle: false }), /title is unavailable/);
  assert.equal(server1Failure({ ...defaults, active: false, searchStatus: 'error' }), null);
  assert.equal(server1Failure({ ...defaults, searchStatus: 'error', searching: true }), null);
  assert.equal(server1Failure({ ...defaults, episodesStatus: 'error', loadingEpisodes: true }), null);
});

test('allows ambiguous matches and manual searches rather than choosing a wrong show', () => {
  assert.equal(server1Failure({ ...defaults, matchCount: 3, hasChosenTitle: false }), null);
  assert.equal(server1Failure({ ...defaults, manualSearch: true, matchCount: 0, hasChosenTitle: false }), null);
});

test('timeouts abort the request and report a failure', async () => {
  let aborted = false;
  await assert.rejects(withServerTimeout((signal) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); });
  }), new AbortController().signal, 10), /took too long/);
  assert.equal(aborted, true);
});

test('navigation abort stays a cancellation, not a failure', async () => {
  const controller = new AbortController();
  const result = withServerTimeout((signal) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }), controller.signal, 1000);
  controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
});

test('completed requests return the result', async () => {
  assert.equal(await withServerTimeout(async () => 'ok', new AbortController().signal, 100), 'ok');
});
