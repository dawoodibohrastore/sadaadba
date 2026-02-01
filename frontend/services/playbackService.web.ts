// Playback Service - Web stub (no-op on web)
// This file exists to prevent import errors on web

export async function PlaybackService() {
  // No-op on web
}

export async function setupPlayer(): Promise<boolean> {
  return true;
}

export function formatTrack(track: any, localUri?: string) {
  return {
    id: track.id,
    url: localUri || track.audio_url || '',
    title: track.title,
    artist: 'Sadaa Instrumentals',
    album: track.mood,
    duration: track.duration,
    artwork: undefined,
    isDownloaded: !!localUri,
    isPremium: track.is_premium,
    mood: track.mood,
  };
}
