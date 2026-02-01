// Hook for using Track Player with app state
import { useEffect, useState, useCallback } from 'react';
import TrackPlayer, {
  usePlaybackState,
  useProgress,
  useActiveTrack,
  State,
  Event,
} from 'react-native-track-player';
import { useAppStore, Instrumental } from '../store/appStore';
import { setupPlayer, formatTrack, setRepeatMode } from './playbackService';

export function useTrackPlayerSetup() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const setup = async () => {
      const isSetup = await setupPlayer();
      if (mounted) {
        setIsPlayerReady(isSetup);
      }
    };
    
    setup();
    
    return () => {
      mounted = false;
    };
  }, []);

  return isPlayerReady;
}

export function useTrackPlayerProgress() {
  const { position, duration, buffered } = useProgress(500);
  
  return {
    position: position * 1000, // Convert to milliseconds
    duration: duration * 1000,
    buffered: buffered * 1000,
    progress: duration > 0 ? position / duration : 0,
  };
}

export function useTrackPlayerState() {
  const playbackState = usePlaybackState();
  const activeTrack = useActiveTrack();
  
  const isPlaying = playbackState.state === State.Playing;
  const isBuffering = playbackState.state === State.Buffering || playbackState.state === State.Loading;
  const isPaused = playbackState.state === State.Paused;
  const isStopped = playbackState.state === State.None || playbackState.state === State.Stopped;
  const hasError = playbackState.state === State.Error;
  
  return {
    isPlaying,
    isBuffering,
    isPaused,
    isStopped,
    hasError,
    state: playbackState.state,
    activeTrack,
  };
}

// Custom hook to sync TrackPlayer with app store
export function useTrackPlayerSync() {
  const {
    currentTrack,
    isLoopEnabled,
    downloadedTracks,
    setCurrentTrack,
  } = useAppStore();
  
  const { isPlaying, isBuffering, activeTrack } = useTrackPlayerState();
  const { position, duration } = useTrackPlayerProgress();
  
  // Sync loop mode
  useEffect(() => {
    setRepeatMode(isLoopEnabled);
  }, [isLoopEnabled]);
  
  // Update store when track changes from notification controls
  useEffect(() => {
    if (activeTrack && (!currentTrack || currentTrack.id !== activeTrack.id)) {
      // Track changed from external control, update store
      const trackData = {
        id: activeTrack.id as string,
        title: activeTrack.title || '',
        mood: (activeTrack as any).mood || 'Unknown',
        duration: activeTrack.duration || 0,
        duration_formatted: formatDuration(activeTrack.duration || 0),
        is_premium: (activeTrack as any).isPremium || false,
        is_featured: false,
        audio_url: activeTrack.url || null,
        thumbnail_color: '#4A3463',
        file_size: 0,
        play_count: 0,
        created_at: new Date().toISOString(),
      };
      setCurrentTrack(trackData);
    }
  }, [activeTrack?.id]);
  
  return {
    isPlaying,
    isBuffering,
    position,
    duration,
    currentTrack: activeTrack,
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Play track with TrackPlayer
export async function playTrackWithPlayer(
  track: Instrumental,
  queue: Instrumental[],
  downloadedTracks: Record<string, any>,
  startIndex: number = 0
) {
  try {
    // Reset the queue
    await TrackPlayer.reset();
    
    // Format tracks for the queue
    const formattedQueue = queue.map((t) => {
      const downloaded = downloadedTracks[t.id];
      const localUri = downloaded?.localUri;
      return formatTrack(t, localUri);
    });
    
    // Add all tracks to the queue
    await TrackPlayer.add(formattedQueue);
    
    // Skip to the requested track
    if (startIndex > 0) {
      await TrackPlayer.skip(startIndex);
    }
    
    // Start playback
    await TrackPlayer.play();
    
    return true;
  } catch (error) {
    console.error('Error playing track:', error);
    return false;
  }
}

// Control functions
export async function pausePlayback() {
  await TrackPlayer.pause();
}

export async function resumePlayback() {
  await TrackPlayer.play();
}

export async function stopPlayback() {
  await TrackPlayer.stop();
  await TrackPlayer.reset();
}

export async function skipToNext() {
  try {
    await TrackPlayer.skipToNext();
  } catch (error) {
    // No next track, loop to beginning if needed
    const queue = await TrackPlayer.getQueue();
    if (queue.length > 0) {
      await TrackPlayer.skip(0);
      await TrackPlayer.play();
    }
  }
}

export async function skipToPrevious() {
  try {
    const position = await TrackPlayer.getProgress();
    // If more than 3 seconds in, restart current track
    if (position.position > 3) {
      await TrackPlayer.seekTo(0);
    } else {
      await TrackPlayer.skipToPrevious();
    }
  } catch (error) {
    // No previous track, just restart
    await TrackPlayer.seekTo(0);
  }
}

export async function seekTo(position: number) {
  // Position in milliseconds, convert to seconds
  await TrackPlayer.seekTo(position / 1000);
}

export async function setVolume(volume: number) {
  await TrackPlayer.setVolume(volume);
}

// Get current queue
export async function getQueue() {
  return await TrackPlayer.getQueue();
}

// Get current track index
export async function getCurrentTrackIndex() {
  return await TrackPlayer.getActiveTrackIndex();
}
