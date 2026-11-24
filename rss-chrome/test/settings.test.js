import test from 'node:test';
import assert from 'node:assert/strict';

import {DEFAULT_SETTINGS, normalizeSettings} from '../src/lib/settings.js';

test('normalizeSettings returns defaults for empty input', () => {
  assert.deepEqual(normalizeSettings(), {
    ...DEFAULT_SETTINGS,
    backendUrl: '',
    frontendUrl: '',
  });
  assert.deepEqual(normalizeSettings(null), normalizeSettings());
  assert.deepEqual(normalizeSettings('nope'), normalizeSettings());
});

test('normalizeSettings clamps numeric fields', () => {
  const settings = normalizeSettings({pollMinutes: 0, soundVolume: 500});
  assert.equal(settings.pollMinutes, 1);
  assert.equal(settings.soundVolume, 100);

  const high = normalizeSettings({pollMinutes: 1000});
  assert.equal(high.pollMinutes, 60);
});

test('normalizeSettings keeps valid values', () => {
  const settings = normalizeSettings({
    userId: 7,
    pollMinutes: 5,
    soundVolume: 25,
    soundFile: 'media/titan.mp3',
    soundEnabled: false,
    notificationsEnabled: false,
    lastUnread: 12,
  });
  assert.equal(settings.userId, 7);
  assert.equal(settings.pollMinutes, 5);
  assert.equal(settings.soundVolume, 25);
  assert.equal(settings.soundFile, 'media/titan.mp3');
  assert.equal(settings.soundEnabled, false);
  assert.equal(settings.notificationsEnabled, false);
  assert.equal(settings.lastUnread, 12);
});

test('normalizeSettings rejects invalid userId and lastUnread', () => {
  const settings = normalizeSettings({userId: -3, lastUnread: 'x'});
  assert.equal(settings.userId, null);
  assert.equal(settings.lastUnread, null);
});

test('normalizeSettings falls back on unknown sound file', () => {
  const settings = normalizeSettings({soundFile: 'media/evil.mp3'});
  assert.equal(settings.soundFile, DEFAULT_SETTINGS.soundFile);
});

test('normalizeSettings normalizes urls and falls back on invalid ones', () => {
  const settings = normalizeSettings({
    backendUrl: 'https://rss.example.com/api/',
    frontendUrl: 'ftp://nope',
  });
  assert.equal(settings.backendUrl, 'https://rss.example.com/api');
  assert.equal(settings.frontendUrl, DEFAULT_SETTINGS.frontendUrl);

  const empty = normalizeSettings({backendUrl: '   '});
  assert.equal(empty.backendUrl, '');
});
