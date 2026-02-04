// Audio Player Service - Uses react-native-track-player for native, expo-av for web
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

let isInitialized = false;
let webSound: Audio.Sound | null = null;
let statusInterval: NodeJS.Timeout | null = null;
let currentStatusCallback: ((status: AudioStatus) => void) | null = null;
let trackPlayerModule: any = null;

export interface AudioStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish: boolean;
}

// Safely import TrackPlayer only on native
const getTrackPlayer = async () => {
  if (Platform.OS === 'web') {
    return null;
  }
  if (trackPlayerModule) {
    return trackPlayerModule;
  }
  try {
    trackPlayerModule = (await import('react-native-track-player')).default;
    return trackPlayerModule;
  } catch (e) {
    console.log('TrackPlayer not available:', e);
    return null;
  }
};

// Initialize audio system
export const initializeAudio = async (): Promise<boolean> => {
  if (isInitialized) return true;
  
  try {
    if (Platform.OS === 'web') {
      // Web uses expo-av only
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      isInitialized = true;
      console.log('Audio initialized for web (expo-av)');
      return true;
    }
    
    // Native - try to use react-native-track-player
    const TrackPlayer = await getTrackPlayer();
    
    if (TrackPlayer) {
      try {
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
        });
        
        await TrackPlayer.updateOptions({
          capabilities: [
            TrackPlayer.CAPABILITY_PLAY,
            TrackPlayer.CAPABILITY_PAUSE,
            TrackPlayer.CAPABILITY_STOP,
            TrackPlayer.CAPABILITY_SEEK_TO,
            TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
            TrackPlayer.CAPABILITY_SKIP_TO_PREVIOUS,
          ],
          compactCapabilities: [
            TrackPlayer.CAPABILITY_PLAY,
            TrackPlayer.CAPABILITY_PAUSE,
            TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
          ],
          notificationCapabilities: [
            TrackPlayer.CAPABILITY_PLAY,
            TrackPlayer.CAPABILITY_PAUSE,
            TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
            TrackPlayer.CAPABILITY_SKIP_TO_PREVIOUS,
          ],
        });
        
        isInitialized = true;
        console.log('Audio initialized for native (react-native-track-player)');
        return true;
      } catch (e) {
        console.log('TrackPlayer setup failed, using expo-av fallback:', e);
      }
    }
    
    // Fallback to expo-av for native
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    isInitialized = true;
    console.log('Audio initialized for native (expo-av fallback)');
    return true;
  } catch (error) {
    console.error('Failed to initialize audio:', error);
    return false;
  }
};

// Play audio
export const playAudio = async (
  uri: string,
  onStatusUpdate: (status: AudioStatus) => void,
  startPosition: number = 0,
  trackInfo?: { id: string; title: string; artist?: string; artwork?: string }
): Promise<boolean> => {
  try {
    await stopAudio();
    currentStatusCallback = onStatusUpdate;
    
    if (!isInitialized) {
      await initializeAudio();
    }
    
    // Web always uses expo-av
    if (Platform.OS === 'web') {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { 
          shouldPlay: true, 
          positionMillis: startPosition, 
          progressUpdateIntervalMillis: 500 
        },
        (status: any) => {
          if (status.isLoaded && currentStatusCallback) {
            currentStatusCallback({
              isLoaded: true,
              isPlaying: status.isPlaying,
              isBuffering: status.isBuffering || false,
              positionMillis: status.positionMillis || 0,
              durationMillis: status.durationMillis || 0,
              didJustFinish: status.didJustFinish || false,
            });
          }
        }
      );
      webSound = sound;
      return true;
    }
    
    // Native - try TrackPlayer first
    const TrackPlayer = await getTrackPlayer();
    
    if (TrackPlayer) {
      try {
        const { State } = await import('react-native-track-player');
        
        // Reset and add track
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: trackInfo?.id || 'current-track',
          url: uri,
          title: trackInfo?.title || 'Unknown',
          artist: trackInfo?.artist || 'Sadaa Instrumentals',
          artwork: trackInfo?.artwork,
        });
        
        // Seek to start position if needed
        if (startPosition > 0) {
          await TrackPlayer.seekTo(startPosition / 1000);
        }
        
        // Start playback
        await TrackPlayer.play();
        
        // Set up progress monitoring
        statusInterval = setInterval(async () => {
          try {
            const state = await TrackPlayer.getState();
            const progress = await TrackPlayer.getProgress();
            
            if (currentStatusCallback) {
              const isFinished = state === State.Stopped && progress.position >= progress.duration - 1;
              currentStatusCallback({
                isLoaded: true,
                isPlaying: state === State.Playing,
                isBuffering: state === State.Buffering || state === State.Loading,
                positionMillis: (progress.position || 0) * 1000,
                durationMillis: (progress.duration || 0) * 1000,
                didJustFinish: isFinished,
              });
            }
          } catch (e) {
            // Player might be destroyed
          }
        }, 500);
        
        return true;
      } catch (e) {
        console.log('TrackPlayer play error, using expo-av fallback:', e);
      }
    }
    
    // Fallback to expo-av for native
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { 
        shouldPlay: true, 
        positionMillis: startPosition, 
        progressUpdateIntervalMillis: 500 
      },
      (status: any) => {
        if (status.isLoaded && currentStatusCallback) {
          currentStatusCallback({
            isLoaded: true,
            isPlaying: status.isPlaying,
            isBuffering: status.isBuffering || false,
            positionMillis: status.positionMillis || 0,
            durationMillis: status.durationMillis || 0,
            didJustFinish: status.didJustFinish || false,
          });
        }
      }
    );
    webSound = sound;
    return true;
  } catch (error) {
    console.error('Error playing audio:', error);
    return false;
  }
};

// Pause
export const pauseAudio = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        await webSound.pauseAsync();
      }
      return;
    }
    
    const TrackPlayer = await getTrackPlayer();
    if (TrackPlayer) {
      try {
        await TrackPlayer.pause();
        return;
      } catch (e) {}
    }
    
    if (webSound) {
      await webSound.pauseAsync();
    }
  } catch (error) {
    console.error('Error pausing audio:', error);
  }
};

// Resume
export const resumeAudio = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        await webSound.playAsync();
      }
      return;
    }
    
    const TrackPlayer = await getTrackPlayer();
    if (TrackPlayer) {
      try {
        await TrackPlayer.play();
        return;
      } catch (e) {}
    }
    
    if (webSound) {
      await webSound.playAsync();
    }
  } catch (error) {
    console.error('Error resuming audio:', error);
  }
};

// Seek
export const seekTo = async (positionMillis: number): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        await webSound.setPositionAsync(positionMillis);
      }
      return;
    }
    
    const TrackPlayer = await getTrackPlayer();
    if (TrackPlayer) {
      try {
        await TrackPlayer.seekTo(positionMillis / 1000);
        return;
      } catch (e) {}
    }
    
    if (webSound) {
      await webSound.setPositionAsync(positionMillis);
    }
  } catch (error) {
    console.error('Error seeking:', error);
  }
};

// Stop and cleanup
export const stopAudio = async (): Promise<void> => {
  try {
    // Clear interval
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
    currentStatusCallback = null;
    
    // Cleanup web sound
    if (webSound) {
      try {
        await webSound.stopAsync();
        await webSound.unloadAsync();
      } catch (e) {}
      webSound = null;
    }
    
    // Cleanup TrackPlayer on native only
    if (Platform.OS !== 'web') {
      const TrackPlayer = await getTrackPlayer();
      if (TrackPlayer) {
        try {
          await TrackPlayer.stop();
          await TrackPlayer.reset();
        } catch (e) {}
      }
    }
  } catch (error) {
    console.error('Error stopping audio:', error);
  }
};

// Get current position
export const getCurrentPosition = async (): Promise<number> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        const status = await webSound.getStatusAsync();
        return status.isLoaded ? status.positionMillis : 0;
      }
      return 0;
    }
    
    const TrackPlayer = await getTrackPlayer();
    if (TrackPlayer) {
      try {
        const progress = await TrackPlayer.getProgress();
        return (progress.position || 0) * 1000;
      } catch (e) {}
    }
    
    if (webSound) {
      const status = await webSound.getStatusAsync();
      return status.isLoaded ? status.positionMillis : 0;
    }
    
    return 0;
  } catch (error) {
    return 0;
  }
};

// Check if playing
export const isAudioPlaying = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        const status = await webSound.getStatusAsync();
        return status.isLoaded && status.isPlaying;
      }
      return false;
    }
    
    const TrackPlayer = await getTrackPlayer();
    if (TrackPlayer) {
      try {
        const { State } = await import('react-native-track-player');
        const state = await TrackPlayer.getState();
        return state === State.Playing;
      } catch (e) {}
    }
    
    if (webSound) {
      const status = await webSound.getStatusAsync();
      return status.isLoaded && status.isPlaying;
    }
    
    return false;
  } catch (error) {
    return false;
  }
};
