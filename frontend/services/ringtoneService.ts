// Ringtone Service - Handles direct ringtone download and sharing
// No trimming - directly downloads and shares ringtone URL from database
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Check if we can set ringtones on this device
export const canSetRingtone = (): boolean => {
  return Platform.OS === 'android';
};

// Request storage permission on Android
export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS doesn't need this permission for downloads
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission Required',
        message: 'This app needs storage access to save the ringtone file.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('Permission error:', err);
    return false;
  }
};

// Download ringtone directly from URL
export const downloadRingtone = async (
  ringtoneUrl: string,
  trackId: string,
  trackTitle: string,
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  try {
    onProgress?.(0.1);
    
    // Create file name from track title (sanitize for file system)
    const sanitizedTitle = trackTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const extension = ringtoneUrl.split('.').pop()?.split('?')[0] || 'mp3';
    const fileName = `ringtone_${sanitizedTitle}_${Date.now()}.${extension}`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    onProgress?.(0.2);
    
    // Download the file
    const downloadResumable = FileSystem.createDownloadResumable(
      ringtoneUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress?.(0.2 + progress * 0.7); // Progress from 20% to 90%
      }
    );
    
    const result = await downloadResumable.downloadAsync();
    
    if (!result || result.status !== 200) {
      throw new Error('Failed to download ringtone');
    }
    
    onProgress?.(1);
    return result.uri;
  } catch (error) {
    console.error('Error downloading ringtone:', error);
    return null;
  }
};

// Share ringtone file
export const shareRingtone = async (
  fileUri: string,
  title: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      return {
        success: false,
        message: 'Sharing is not available on this device.',
      };
    }
    
    // Determine mime type from file extension
    const extension = fileUri.split('.').pop()?.toLowerCase();
    let mimeType = 'audio/mpeg';
    let UTI = 'public.audio';
    
    if (extension === 'm4a') {
      mimeType = 'audio/m4a';
      UTI = 'public.mpeg-4-audio';
    } else if (extension === 'wav') {
      mimeType = 'audio/wav';
      UTI = 'public.wav';
    }
    
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: `Share "${title}" Ringtone`,
      UTI,
    });
    
    return {
      success: true,
      message: Platform.OS === 'android' 
        ? 'Ringtone shared! Use your file manager to set it as ringtone.'
        : 'Ringtone shared successfully!',
    };
  } catch (error) {
    console.error('Error sharing ringtone:', error);
    return {
      success: false,
      message: 'Failed to share ringtone. Please try again.',
    };
  }
};

// Download and share ringtone in one step
export const downloadAndShareRingtone = async (
  ringtoneUrl: string,
  trackId: string,
  trackTitle: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; message: string; fileUri?: string }> => {
  try {
    // Download the ringtone
    const fileUri = await downloadRingtone(ringtoneUrl, trackId, trackTitle, onProgress);
    
    if (!fileUri) {
      return {
        success: false,
        message: 'Failed to download ringtone. Please check your internet connection.',
      };
    }
    
    // Share the downloaded file
    const shareResult = await shareRingtone(fileUri, trackTitle);
    
    return {
      ...shareResult,
      fileUri,
    };
  } catch (error) {
    console.error('Error in downloadAndShareRingtone:', error);
    return {
      success: false,
      message: 'An error occurred. Please try again.',
    };
  }
};

// Show iOS instructions
export const showIOSRingtoneInstructions = () => {
  Alert.alert(
    'Set as Ringtone on iPhone',
    'To set a custom ringtone on iPhone:\n\n' +
    '1. Download the audio file\n' +
    '2. Open GarageBand app\n' +
    '3. Import the audio file\n' +
    '4. Export as ringtone\n' +
    '5. Go to Settings > Sounds > Ringtone\n\n' +
    'Tap "Download" to save the ringtone file.',
    [
      { text: 'OK', style: 'default' },
    ]
  );
};

// Format time for display (mm:ss)
export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Format duration for display (mm:ss)
export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
