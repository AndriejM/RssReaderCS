import { MSG_PLAY_SOUND } from './lib/sound.js';

const DEFAULT_SOUND_FILE = 'media/beep.mp3';

let alertAudio = null;
let playback = null;

function getAlertAudio(src) {
  if (alertAudio && alertAudio.dataset.src === src) return alertAudio;

  const player = new Audio(chrome.runtime.getURL(src));
  player.preload = 'auto';
  player.dataset.src = src;
  player.addEventListener('error', () => {
    console.warn('rss-chrome could not load the sound file:', src);
    if (alertAudio === player) alertAudio = null;
  });

  playback = null;
  alertAudio = player;
  return player;
}

function wasInterrupted(error) {
  return error?.name === 'NotSupportedError' && /interrupted/i.test(String(error?.message ?? ''));
}

async function playSoundFile(src = DEFAULT_SOUND_FILE, volume = 1) {
  const player = getAlertAudio(src);
  const fraction = Number(volume);
  player.volume = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 1;

  const pending = playback;
  if (pending === null) {
    player.pause();
    player.currentTime = 0;
  }

  const started = pending ?? player.play();
  playback = started;

  const forget = () => {
    if (playback === started) playback = null;
  };

  const settled = started.then(forget, forget);

  try {
    await settled;
  } catch (error) {
    if (!wasInterrupted(error)) throw error;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== MSG_PLAY_SOUND) return false;

  (async () => {
    try {
      await playSoundFile(message.src ?? DEFAULT_SOUND_FILE, message.volume ?? 1);
      sendResponse({ ok: true });
    } catch (error) {
      console.warn('rss-chrome could not play the sound:', error?.message ?? error);
      sendResponse({ ok: false, error: error?.message ?? String(error) });
    }
  })();

  return true;
});
