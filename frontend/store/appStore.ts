import { create } from 'zustand';
import axios from 'axios';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as audioService from '../services/audioService';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export interface Instrumental {
  id: string;
  title: string;
  mood: string;
  duration: number;
  duration_formatted: string;
  is_premium: boolean;
  is_featured: boolean;
  audio_url: string | null;
  thumbnail_color: string;
  file_size: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  is_active: boolean;
  plan: string;
  price: number;
  subscribed_at: string;
  expires_at: string | null;
}

export interface User {
  id: string;
  device_id: string;
  is_subscribed: boolean;
  created_at: string;
}

export interface DownloadStatus {
  trackId: string;
  progress: number;
  isDownloading: boolean;
  isDownloaded: boolean;
}

interface AppState {
  // User state
  user: User | null;
  isSubscribed: boolean;
  
  // Data
  instrumentals: Instrumental[];
  featuredInstrumentals: Instrumental[];
  moods: string[];
  
  // UI state
  isLoading: boolean;
  selectedMood: string;
  searchQuery: string;
  
  // Player state
  currentTrack: Instrumental | null;
  isPlaying: boolean;
  playbackPosition: number;
  playbackDuration: number;
  sound: Audio.Sound | null;
  isBuffering: boolean;
  
  // Download state
  downloads: Record<string, DownloadStatus>;
  downloadedTracks: Record<string, audioService.DownloadedTrack>;
  
  // Actions
  initializeApp: () => Promise<void>;
  fetchInstrumentals: (mood?: string, search?: string) => Promise<void>;
  fetchFeaturedInstrumentals: () => Promise<void>;
  setSelectedMood: (mood: string) => void;
  setSearchQuery: (query: string) => void;
  setCurrentTrack: (track: Instrumental | null) => void;
  playTrack: (track: Instrumental) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackPosition: (position: number) => void;
  setPlaybackDuration: (duration: number) => void;
  subscribe: (plan?: string) => Promise<boolean>;
  restorePurchase: () => Promise<boolean>;
  checkSubscription: () => Promise<void>;
  downloadTrack: (track: Instrumental) => Promise<boolean>;
  deleteDownload: (trackId: string) => Promise<boolean>;
  loadDownloadedTracks: () => Promise<void>;
  isTrackDownloaded: (trackId: string) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isSubscribed: false,
  instrumentals: [],
  featuredInstrumentals: [],
  moods: ['All', 'Calm', 'Drums', 'Spiritual', 'Soft', 'Energetic'],
  isLoading: false,
  selectedMood: 'All',
  searchQuery: '',
  currentTrack: null,
  isPlaying: false,
  playbackPosition: 0,
  playbackDuration: 0,
  sound: null,
  isBuffering: false,
  downloads: {},
  downloadedTracks: {},

  initializeApp: async () => {
    set({ isLoading: true });
    try {
      // Configure audio mode for background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Get or create device ID
      const deviceId = Constants.installationId || Device.osBuildId || `device_${Date.now()}`;
      
      // Create or get user
      const userResponse = await axios.post(`${API_BASE}/api/users`, {
        device_id: deviceId
      });
      const user = userResponse.data;
      
      // Check subscription status
      const subResponse = await axios.get(`${API_BASE}/api/subscription/status/${user.id}`);
      
      set({ 
        user,
        isSubscribed: subResponse.data.is_subscribed
      });
      
      // Seed database if needed (first time setup)
      try {
        await axios.post(`${API_BASE}/api/seed`);
      } catch (e) {
        // Ignore if already seeded
      }
      
      // Load downloaded tracks
      await get().loadDownloadedTracks();
      
      // Fetch initial data
      await get().fetchFeaturedInstrumentals();
      await get().fetchInstrumentals();
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchInstrumentals: async (mood?: string, search?: string) => {
    try {
      const params: any = {};
      if (mood && mood !== 'All') params.mood = mood;
      if (search) params.search = search;
      
      const response = await axios.get(`${API_BASE}/api/instrumentals`, { params });
      set({ instrumentals: response.data });
    } catch (error) {
      console.error('Failed to fetch instrumentals:', error);
    }
  },

  fetchFeaturedInstrumentals: async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/instrumentals/featured`);
      set({ featuredInstrumentals: response.data });
    } catch (error) {
      console.error('Failed to fetch featured instrumentals:', error);
    }
  },

  setSelectedMood: (mood: string) => {
    set({ selectedMood: mood });
    get().fetchInstrumentals(mood, get().searchQuery);
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().fetchInstrumentals(get().selectedMood, query);
  },

  setCurrentTrack: (track: Instrumental | null) => {
    set({ currentTrack: track, playbackPosition: 0 });
  },

  playTrack: async (track: Instrumental) => {
    const { sound: currentSound, downloadedTracks } = get();
    
    try {
      // Unload previous sound
      if (currentSound) {
        await currentSound.unloadAsync();
      }
      
      set({ isBuffering: true, currentTrack: track, isPlaying: false });
      
      // Check if track is downloaded locally
      let audioUri = track.audio_url;
      const downloaded = downloadedTracks[track.id];
      if (downloaded) {
        audioUri = downloaded.localUri;
      }
      
      if (!audioUri) {
        console.error('No audio URL available');
        set({ isBuffering: false });
        return;
      }
      
      // Create and load new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { 
          shouldPlay: true,
          progressUpdateIntervalMillis: 500,
        },
        (status) => {
          if (status.isLoaded) {
            set({ 
              playbackPosition: status.positionMillis,
              playbackDuration: status.durationMillis || track.duration * 1000,
              isPlaying: status.isPlaying,
              isBuffering: status.isBuffering,
            });
            
            // Auto play next when finished
            if (status.didJustFinish) {
              get().playNext();
            }
          }
        }
      );
      
      set({ sound, isPlaying: true, isBuffering: false });
      
    } catch (error) {
      console.error('Error playing track:', error);
      set({ isBuffering: false, isPlaying: false });
    }
  },

  pauseTrack: async () => {
    const { sound } = get();
    if (sound) {
      await sound.pauseAsync();
      set({ isPlaying: false });
    }
  },

  resumeTrack: async () => {
    const { sound } = get();
    if (sound) {
      await sound.playAsync();
      set({ isPlaying: true });
    }
  },

  seekTo: async (position: number) => {
    const { sound } = get();
    if (sound) {
      await sound.setPositionAsync(position);
      set({ playbackPosition: position });
    }
  },

  playNext: async () => {
    const { currentTrack, instrumentals, isSubscribed } = get();
    if (!currentTrack) return;
    
    const accessibleTracks = isSubscribed 
      ? instrumentals 
      : instrumentals.filter(i => !i.is_premium);
    
    const currentIndex = accessibleTracks.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % accessibleTracks.length;
    
    if (accessibleTracks[nextIndex]) {
      await get().playTrack(accessibleTracks[nextIndex]);
    }
  },

  playPrevious: async () => {
    const { currentTrack, instrumentals, isSubscribed, playbackPosition } = get();
    if (!currentTrack) return;
    
    // If more than 3 seconds in, restart current track
    if (playbackPosition > 3000) {
      await get().seekTo(0);
      return;
    }
    
    const accessibleTracks = isSubscribed 
      ? instrumentals 
      : instrumentals.filter(i => !i.is_premium);
    
    const currentIndex = accessibleTracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? accessibleTracks.length - 1 : currentIndex - 1;
    
    if (accessibleTracks[prevIndex]) {
      await get().playTrack(accessibleTracks[prevIndex]);
    }
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  setPlaybackPosition: (position: number) => {
    set({ playbackPosition: position });
  },

  setPlaybackDuration: (duration: number) => {
    set({ playbackDuration: duration });
  },

  subscribe: async (plan: string = 'monthly') => {
    const { user } = get();
    if (!user) return false;
    
    try {
      await axios.post(`${API_BASE}/api/subscription/subscribe`, {
        user_id: user.id,
        plan: plan
      });
      set({ isSubscribed: true });
      return true;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      return false;
    }
  },

  restorePurchase: async () => {
    const { user } = get();
    if (!user) return false;
    
    try {
      const response = await axios.post(`${API_BASE}/api/subscription/restore/${user.id}`);
      if (response.data.restored) {
        set({ isSubscribed: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to restore purchase:', error);
      return false;
    }
  },

  checkSubscription: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/subscription/status/${user.id}`);
      set({ isSubscribed: response.data.is_subscribed });
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  },

  loadDownloadedTracks: async () => {
    try {
      const downloaded = await audioService.getDownloadedTracks();
      set({ downloadedTracks: downloaded });
    } catch (error) {
      console.error('Failed to load downloaded tracks:', error);
    }
  },

  downloadTrack: async (track: Instrumental) => {
    if (!track.audio_url) return false;
    
    set((state) => ({
      downloads: {
        ...state.downloads,
        [track.id]: { trackId: track.id, progress: 0, isDownloading: true, isDownloaded: false }
      }
    }));
    
    try {
      const result = await audioService.downloadAudio(
        track.id,
        track.audio_url,
        (progress) => {
          set((state) => ({
            downloads: {
              ...state.downloads,
              [track.id]: { ...state.downloads[track.id], progress }
            }
          }));
        }
      );
      
      if (result) {
        set((state) => ({
          downloads: {
            ...state.downloads,
            [track.id]: { trackId: track.id, progress: 1, isDownloading: false, isDownloaded: true }
          },
          downloadedTracks: {
            ...state.downloadedTracks,
            [track.id]: result
          }
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to download track:', error);
      set((state) => ({
        downloads: {
          ...state.downloads,
          [track.id]: { trackId: track.id, progress: 0, isDownloading: false, isDownloaded: false }
        }
      }));
      return false;
    }
  },

  deleteDownload: async (trackId: string) => {
    try {
      const success = await audioService.deleteDownloadedAudio(trackId);
      if (success) {
        set((state) => {
          const newDownloads = { ...state.downloads };
          const newDownloadedTracks = { ...state.downloadedTracks };
          delete newDownloads[trackId];
          delete newDownloadedTracks[trackId];
          return { downloads: newDownloads, downloadedTracks: newDownloadedTracks };
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete download:', error);
      return false;
    }
  },

  isTrackDownloaded: (trackId: string) => {
    return !!get().downloadedTracks[trackId];
  },
}));
