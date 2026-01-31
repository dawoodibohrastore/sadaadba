// Audio Service - Handles downloads and offline storage
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const AUDIO_DIRECTORY = FileSystem.documentDirectory ? FileSystem.documentDirectory + 'audio/' : '';
const DOWNLOADS_KEY = 'downloaded_tracks';

export interface DownloadedTrack {
  id: string;
  localUri: string;
  downloadedAt: string;
  size: number;
}

// Check if downloads are supported on this platform
export const isDownloadSupported = (): boolean => {
  return Platform.OS !== 'web' && !!FileSystem.documentDirectory;
};

// Ensure audio directory exists
export const ensureAudioDirectory = async () => {
  if (!isDownloadSupported()) return;
  
  try {
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(AUDIO_DIRECTORY, { intermediates: true });
    }
  } catch (error) {
    console.error('Error creating audio directory:', error);
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
  // Check if downloads are supported
  if (!isDownloadSupported()) {
    console.log('Downloads not supported on this platform');
    // For web, just store the URL as "downloaded"
    const downloadedTrack: DownloadedTrack = {
      id: trackId,
      localUri: audioUrl, // Use remote URL on web
      downloadedAt: new Date().toISOString(),
      size: 0,
    };
    await saveDownloadedTrack(downloadedTrack);
    onProgress?.(1);
    return downloadedTrack;
  }

  try {
    await ensureAudioDirectory();
    
    const fileName = `${trackId}.mp3`;
    const localUri = AUDIO_DIRECTORY + fileName;
    
    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      const downloads = await getDownloadedTracks();
      if (downloads[trackId]) {
        onProgress?.(1);
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
      const newFileInfo = await FileSystem.getInfoAsync(result.uri);
      const downloadedTrack: DownloadedTrack = {
        id: trackId,
        localUri: result.uri,
        downloadedAt: new Date().toISOString(),
        size: (newFileInfo as any).size || 0,
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
      // Only delete file on native platforms
      if (isDownloadSupported() && track.localUri.startsWith('file://')) {
        const fileInfo = await FileSystem.getInfoAsync(track.localUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(track.localUri);
        }
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
  
  // On web, just check if it's in storage
  if (!isDownloadSupported()) return true;
  
  // On native, verify file still exists
  try {
    const fileInfo = await FileSystem.getInfoAsync(downloads[trackId].localUri);
    return fileInfo.exists;
  } catch {
    return false;
  }
};

// Get local URI for downloaded track
export const getLocalAudioUri = async (trackId: string): Promise<string | null> => {
  const downloads = await getDownloadedTracks();
  const track = downloads[trackId];
  
  if (!track) return null;
  
  // On web, return the stored URL
  if (!isDownloadSupported()) return track.localUri;
  
  // On native, verify and return
  try {
    const fileInfo = await FileSystem.getInfoAsync(track.localUri);
    if (fileInfo.exists) {
      return track.localUri;
    }
  } catch {}
  
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
