// Audio Service - Handles downloads and offline storage
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUDIO_DIRECTORY = FileSystem.documentDirectory + 'audio/';
const DOWNLOADS_KEY = 'downloaded_tracks';

export interface DownloadedTrack {
  id: string;
  localUri: string;
  downloadedAt: string;
  size: number;
}

// Ensure audio directory exists
export const ensureAudioDirectory = async () => {
  const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIRECTORY, { intermediates: true });
  }
};

// Get list of downloaded tracks
export const getDownloadedTracks = async (): Promise<Record<string, DownloadedTrack>> => {
  try {
    const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting downloaded tracks:', error);
    return {};
  }
};

// Save downloaded track info
export const saveDownloadedTrack = async (track: DownloadedTrack) => {
  try {
    const downloads = await getDownloadedTracks();
    downloads[track.id] = track;
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
  } catch (error) {
    console.error('Error saving downloaded track:', error);
  }
};

// Remove downloaded track info
export const removeDownloadedTrack = async (trackId: string) => {
  try {
    const downloads = await getDownloadedTracks();
    delete downloads[trackId];
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
  } catch (error) {
    console.error('Error removing downloaded track:', error);
  }
};

// Download audio file
export const downloadAudio = async (
  trackId: string,
  audioUrl: string,
  onProgress?: (progress: number) => void
): Promise<DownloadedTrack | null> => {
  try {
    await ensureAudioDirectory();
    
    const fileName = `${trackId}.mp3`;
    const localUri = AUDIO_DIRECTORY + fileName;
    
    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      const downloads = await getDownloadedTracks();
      if (downloads[trackId]) {
        return downloads[trackId];
      }
    }
    
    // Download with progress tracking
    const downloadResumable = FileSystem.createDownloadResumable(
      audioUrl,
      localUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress?.(progress);
      }
    );
    
    const result = await downloadResumable.downloadAsync();
    
    if (result?.uri) {
      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      const downloadedTrack: DownloadedTrack = {
        id: trackId,
        localUri: result.uri,
        downloadedAt: new Date().toISOString(),
        size: (fileInfo as any).size || 0,
      };
      
      await saveDownloadedTrack(downloadedTrack);
      return downloadedTrack;
    }
    
    return null;
  } catch (error) {
    console.error('Error downloading audio:', error);
    return null;
  }
};

// Delete downloaded audio file
export const deleteDownloadedAudio = async (trackId: string): Promise<boolean> => {
  try {
    const downloads = await getDownloadedTracks();
    const track = downloads[trackId];
    
    if (track) {
      const fileInfo = await FileSystem.getInfoAsync(track.localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(track.localUri);
      }
      await removeDownloadedTrack(trackId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting downloaded audio:', error);
    return false;
  }
};

// Check if track is downloaded
export const isTrackDownloaded = async (trackId: string): Promise<boolean> => {
  const downloads = await getDownloadedTracks();
  if (!downloads[trackId]) return false;
  
  // Verify file still exists
  const fileInfo = await FileSystem.getInfoAsync(downloads[trackId].localUri);
  return fileInfo.exists;
};

// Get local URI for downloaded track
export const getLocalAudioUri = async (trackId: string): Promise<string | null> => {
  const downloads = await getDownloadedTracks();
  const track = downloads[trackId];
  
  if (track) {
    const fileInfo = await FileSystem.getInfoAsync(track.localUri);
    if (fileInfo.exists) {
      return track.localUri;
    }
  }
  
  return null;
};

// Get total downloaded size
export const getTotalDownloadedSize = async (): Promise<number> => {
  const downloads = await getDownloadedTracks();
  return Object.values(downloads).reduce((total, track) => total + track.size, 0);
};

// Format bytes to human readable
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
