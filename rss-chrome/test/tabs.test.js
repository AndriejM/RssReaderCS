import test from 'node:test';
import assert from 'node:assert/strict';

import {createChromeMock} from './mocks/chrome-mock.js';
import {focusOrCreateTab, isHttpUrl} from '../src/lib/tabs.js';

test('isHttpUrl accepts only http and https', () => {
  assert.equal(isHttpUrl('http://example.com'), true);
  assert.equal(isHttpUrl('https://example.com'), true);
  assert.equal(isHttpUrl('chrome-extension://abc/options.html'), false);
  assert.equal(isHttpUrl('not a url'), false);
});

test('focusOrCreateTab creates a tab when no match exists', async () => {
  const chrome = createChromeMock();

  const tab = await focusOrCreateTab('http://localhost:5173');

  assert.equal(tab.url, 'http://localhost:5173');
  assert.equal(chrome.tabs.create.calls.length, 1);
  assert.deepEqual(chrome.tabs.create.calls[0][0], {url: 'http://localhost:5173'});
  assert.equal(chrome.tabs.update.calls.length, 0);
});

test('focusOrCreateTab activates the matching tab and focuses its window', async () => {
  const chrome = createChromeMock();
  chrome.tabs.query = async () => [{id: 5, windowId: 10, url: 'http://localhost:5173'}];

  const target = await focusOrCreateTab('http://localhost:5173');

  assert.equal(target.id, 5);
  assert.deepEqual(chrome.tabs.update.calls[0], [5, {active: true}]);
  assert.deepEqual(chrome.windows.update.calls[0], [10, {focused: true}]);
  assert.equal(chrome.tabs.create.calls.length, 0);
});

test('focusOrCreateTab prefers the tab in the preferred window', async () => {
  const chrome = createChromeMock();
  chrome.tabs.query = async () => [
    {id: 1, windowId: 10, url: 'http://localhost:5173'},
    {id: 2, windowId: 20, url: 'http://localhost:5173'},
  ];

  const target = await focusOrCreateTab('http://localhost:5173', 20);

  assert.equal(target.id, 2);
  assert.deepEqual(chrome.tabs.update.calls[0], [2, {active: true}]);
});

test('focusOrCreateTab falls back to create when activation fails', async () => {
  const chrome = createChromeMock();
  chrome.tabs.query = async () => [{id: 5, windowId: 10, url: 'http://localhost:5173'}];
  chrome.tabs.update = async () => {
    throw new Error('tab is gone');
  };

  const tab = await focusOrCreateTab('http://localhost:5173');

  assert.equal(tab.url, 'http://localhost:5173');
  assert.equal(chrome.tabs.create.calls.length, 1);
});

test('focusOrCreateTab ignores non-http urls', async () => {
  const chrome = createChromeMock();

  const result = await focusOrCreateTab('chrome-extension://abc/src/options.html');

  assert.equal(result, null);
  assert.equal(chrome.tabs.create.calls.length, 0);
  assert.equal(chrome.tabs.query.calls.length, 0);
});
