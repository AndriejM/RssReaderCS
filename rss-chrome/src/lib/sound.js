import { requestOffscreen } from './offscreen.js';

export const MSG_PLAY_SOUND = 'rss-chrome:play-sound';

export async function playSound(settings) {
  if (!settings.soundEnabled) return false;

  try {
    await requestOffscreen({
      type: MSG_PLAY_SOUND,
      src: settings.soundFile,
      volume: settings.soundVolume / 100,
    });
    return true;
  } catch (error) {
    console.warn('rss-chrome sound did not play:', error?.message ?? error);
    return false;
  }
}
