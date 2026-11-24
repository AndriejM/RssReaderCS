import test, {after, before, mock} from 'node:test';
import assert from 'node:assert/strict';

import {createChromeMock, loadBackground, queueFetch} from './mocks/chrome-mock.js';

before(() => {
  mock.timers.enable({apis: ['setTimeout']});
});

after(() => {
  mock.timers.reset();
});

function withStoredSettings(chrome, settings) {
  chrome.storage.local.get = async () => ({settings});
}

function savedSettings(chrome) {
  return chrome.storage.local.set.calls.at(-1)[0].settings;
}

test('sound and notification fire only when unread increases', async () => {
  const chrome = createChromeMock();
  withStoredSettings(chrome, {userId: 1, backendUrl: 'http://localhost:8080', lastUnread: 2});
  queueFetch({json: {unread: 5}});
  const {pollNow} = await loadBackground();

  await pollNow();

  const play = chrome.runtime.sendMessage.calls.find(([msg]) => msg?.type === 'rss-chrome:play-sound');
  assert.ok(play, 'expected play-sound message');
  assert.equal(play[0].src, 'media/beep.mp3');
  assert.equal(play[0].volume, 0.6);

  assert.equal(chrome.notifications.create.calls.length, 1);
  const [id, options] = chrome.notifications.create.calls[0];
  assert.ok(id.startsWith('rss-chrome:unread:'));
  assert.equal(options.message, '3 new unread items');
  assert.equal(savedSettings(chrome).lastUnread, 5);
});

test('first poll does not notify when lastUnread is unknown', async () => {
  const chrome = createChromeMock();
  withStoredSettings(chrome, {userId: 1, backendUrl: 'http://localhost:8080'});
  queueFetch({json: {unread: 9}});
  const {pollNow} = await loadBackground();

  await pollNow();

  assert.equal(chrome.notifications.create.calls.length, 0);
  assert.equal(chrome.runtime.sendMessage.calls.length, 0);
});

test('no sound or notification when unread does not increase', async () => {
  const chrome = createChromeMock();
  withStoredSettings(chrome, {userId: 1, backendUrl: 'http://localhost:8080', lastUnread: 5});
  queueFetch({json: {unread: 5}});
  const {pollNow} = await loadBackground();

  await pollNow();

  assert.equal(chrome.notifications.create.calls.length, 0);
  assert.equal(chrome.runtime.sendMessage.calls.length, 0);
});

test('notification is skipped when notificationsEnabled is false', async () => {
  const chrome = createChromeMock();
  withStoredSettings(chrome, {
    userId: 1,
    backendUrl: 'http://localhost:8080',
    lastUnread: 0,
    notificationsEnabled: false,
  });
  queueFetch({json: {unread: 1}});
  const {pollNow} = await loadBackground();

  await pollNow();

  assert.equal(chrome.notifications.create.calls.length, 0);
  assert.equal(chrome.runtime.sendMessage.calls.length, 1);
});

test('sound is skipped when soundEnabled is false', async () => {
  const chrome = createChromeMock();
  withStoredSettings(chrome, {
    userId: 1,
    backendUrl: 'http://localhost:8080',
    lastUnread: 0,
    soundEnabled: false,
  });
  queueFetch({json: {unread: 1}});
  const {pollNow} = await loadBackground();

  await pollNow();

  assert.equal(chrome.runtime.sendMessage.calls.length, 0);
  assert.equal(chrome.notifications.create.calls.length, 1);
});
