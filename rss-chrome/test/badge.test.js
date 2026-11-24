import test from 'node:test';
import assert from 'node:assert/strict';

import {createChromeMock, loadBackground, queueFetch} from './mocks/chrome-mock.js';

function badgeTexts(chrome) {
  return chrome.action.setBadgeText.calls.map(([arg]) => arg.text);
}

function withStoredSettings(chrome, settings) {
  chrome.storage.local.get = async () => ({settings});
}

test('badge is empty when there are no unread items', async () => {
  const chrome = createChromeMock();
  withStoredSettings(chrome, {userId: 1, backendUrl: 'http://localhost:8080'});
  queueFetch({json: {unread: 0}});
  const {chrome: c, pollNow} = await loadBackground();

  await pollNow();

  assert.deepEqual(badgeTexts(c), ['']);
});

test('badge shows the unread count', async () => {
  const chrome = createChromeMock();
  withStoredSettings(chrome, {userId: 1, backendUrl: 'http://localhost:8080'});
  queueFetch({json: {unread: 7}});
  const {chrome: c, pollNow} = await loadBackground();

  await pollNow();

  assert.deepEqual(badgeTexts(c), ['7']);
});

test('badge shows * above 99', async () => {
  const chrome = createChromeMock();
  withStoredSettings(chrome, {userId: 1, backendUrl: 'http://localhost:8080'});
  queueFetch({json: {unread: 100}});
  const {chrome: c, pollNow} = await loadBackground();

  await pollNow();

  assert.deepEqual(badgeTexts(c), ['*']);
});

test('badge shows ? and stores lastError when polling fails', async () => {
  const chrome = createChromeMock();
  withStoredSettings(chrome, {userId: 1, backendUrl: 'http://localhost:8080'});
  queueFetch({ok: false, status: 503});
  const {chrome: c, pollNow} = await loadBackground();

  const response = await pollNow();

  assert.equal(response.ok, true);
  assert.deepEqual(badgeTexts(c), ['?']);
  const saved = c.storage.local.set.calls.at(-1)[0].settings;
  assert.equal(saved.lastError, 'HTTP 503');
});

test('badge is cleared and no request is made without userId', async () => {
  createChromeMock();
  const fetchMock = queueFetch();
  const {chrome, pollNow} = await loadBackground();

  await pollNow();

  assert.equal(fetchMock.calls.length, 0);
  assert.deepEqual(badgeTexts(chrome), ['']);
});
