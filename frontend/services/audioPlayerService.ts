// Audio Player Service - Handles playback with background support
// Uses expo-audio for native (better background support) and expo-av for web
import { Platform } from 'react-native';

let audioPlayer: any = null;
let audioModule: any = null;
let currentStatusCallback: ((status: AudioStatus) => void) | null = null;
let statusInterval: NodeJS.Timeout | null = null;

export interface AudioStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish: boolean;
}

// Initialize audio module based on platform
export const initializeAudio = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      // Use expo-av for web
      const { Audio } = await import('expo-av');
      audioModule = { type: 'expo-av', Audio };
      console.log('Audio initialized with expo-av (web)');
    } else {
      // Use expo-audio for native (better background support)
      try {
        const ExpoAudio = await import('expo-audio');
        audioModule = { type: 'expo-audio', ...ExpoAudio };
        
        // Configure for background playback
        await ExpoAudio.setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'duckOthers',
        });
        console.log('Audio initialized with expo-audio (native) - background enabled');
      } catch (e) {
        // Fallback to expo-av if expo-audio fails
        console.log('expo-audio failed, falling back to expo-av:', e);
        const { Audio } = await import('expo-av');
        audioModule = { type: 'expo-av', Audio };
        
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('Audio initialized with expo-av (fallback)');
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize audio:', error);
    return false;
  }
};

// Play audio from URI
export const playAudio = async (
  uri: string,
  onStatusUpdate: (status: AudioStatus) => void,
  startPosition: number = 0
): Promise<boolean> => {
  try {
    // Stop any existing playback
    await stopAudio();
    
    currentStatusCallback = onStatusUpdate;
    
    if (!audioModule) {
      await initializeAudio();
    }
    
    if (audioModule.type === 'expo-audio') {
      // Using expo-audio (native)
      const { useAudioPlayer, AudioPlayer } = audioModule;
      
      // Create player using createAudioPlayer
      audioPlayer = audioModule.createAudioPlayer({ uri });
      
      // Set up status polling (expo-audio doesn't have callback-based updates)
      statusInterval = setInterval(() => {
        if (audioPlayer && currentStatusCallback) {
          const status: AudioStatus = {
            isLoaded: true,
            isPlaying: audioPlayer.playing,
            isBuffering: audioPlayer.isBuffering || false,
            positionMillis: (audioPlayer.currentTime || 0) * 1000,
            durationMillis: (audioPlayer.duration || 0) * 1000,
            didJustFinish: false,
          };
          
          // Check if finished
          if (audioPlayer.duration > 0 && audioPlayer.currentTime >= audioPlayer.duration - 0.5) {
            status.didJustFinish = true;
          }
          
          currentStatusCallback(status);
        }
      }, 500);
      
      // Seek to start position if needed
      if (startPosition > 0) {
        audioPlayer.seekTo(startPosition / 1000);
      }
      
      // Start playback
      audioPlayer.play();
      
      // Send initial status
      onStatusUpdate({
        isLoaded: true,
        isPlaying: true,
        isBuffering: false,
        positionMillis: startPosition,
        durationMillis: 0,
        didJustFinish: false,
      });
      
    } else {
      // Using expo-av (web or fallback)
      const { Audio } = audioModule;
      
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, positionMillis: startPosition, progressUpdateIntervalMillis: 500 },
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
      
      audioPlayer = { type: 'expo-av-sound', sound };
    }
    
    return true;
  } catch (error) {
    console.error('Error playing audio:', error);
    return false;
  }
};

// Pause playback
export const pauseAudio = async (): Promise<void> => {
  try {
    if (!audioPlayer) return;
    
    if (audioModule?.type === 'expo-audio') {
      audioPlayer.pause();
    } else if (audioPlayer.type === 'expo-av-sound') {
      await audioPlayer.sound.pauseAsync();
    }
  } catch (error) {
    console.error('Error pausing audio:', error);
  }
};

// Resume playback
export const resumeAudio = async (): Promise<void> => {
  try {
    if (!audioPlayer) return;
    
    if (audioModule?.type === 'expo-audio') {
      audioPlayer.play();
    } else if (audioPlayer.type === 'expo-av-sound') {
      await audioPlayer.sound.playAsync();
    }
  } catch (error) {
    console.error('Error resuming audio:', error);
  }
};

// Seek to position (in milliseconds)
export const seekTo = async (positionMillis: number): Promise<void> => {
  try {
    if (!audioPlayer) return;
    
    if (audioModule?.type === 'expo-audio') {
      audioPlayer.seekTo(positionMillis / 1000);
    } else if (audioPlayer.type === 'expo-av-sound') {
      await audioPlayer.sound.setPositionAsync(positionMillis);
    }
  } catch (error) {
    console.error('Error seeking:', error);
  }
};

// Stop and unload audio
export const stopAudio = async (): Promise<void> => {
  try {
    // Clear status interval
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
    
    currentStatusCallback = null;
    
    if (!audioPlayer) return;
    
    if (audioModule?.type === 'expo-audio') {
      audioPlayer.remove();
    } else if (audioPlayer.type === 'expo-av-sound') {
      await audioPlayer.sound.unloadAsync();
    }
    
    audioPlayer = null;
  } catch (error) {
    console.error('Error stopping audio:', error);
    audioPlayer = null;
  }
};

// Get current position (in milliseconds)
export const getCurrentPosition = async (): Promise<number> => {
  try {
    if (!audioPlayer) return 0;
    
    if (audioModule?.type === 'expo-audio') {
      return (audioPlayer.currentTime || 0) * 1000;
    } else if (audioPlayer.type === 'expo-av-sound') {
      const status = await audioPlayer.sound.getStatusAsync();
      return status.isLoaded ? status.positionMillis : 0;
    }
    
    return 0;
  } catch (error) {
    return 0;
  }
};

// Check if audio is playing
export const isAudioPlaying = (): boolean => {
  if (!audioPlayer) return false;
  
  if (audioModule?.type === 'expo-audio') {
    return audioPlayer.playing;
  } else if (audioPlayer.type === 'expo-av-sound') {
    // For expo-av, we rely on the status callback
    return false;
  }
  
  return false;
};
