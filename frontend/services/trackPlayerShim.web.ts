// Web shim for react-native-track-player
// This provides mock implementations for web platform where TrackPlayer is not available

import { Platform } from 'react-native';

// Mock state values
export const State = {
  None: 'none',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  Stopped: 'stopped',
  Buffering: 'buffering',
  Loading: 'loading',
  Error: 'error',
};

export const RepeatMode = {
  Off: 0,
  Track: 1,
  Queue: 2,
};

export const Capability = {
  Play: 'play',
  Pause: 'pause',
  Stop: 'stop',
  SeekTo: 'seekTo',
  Skip: 'skip',
  SkipToNext: 'skipToNext',
  SkipToPrevious: 'skipToPrevious',
};

export const AppKilledPlaybackBehavior = {
  StopPlaybackAndRemoveNotification: 0,
  ContinuePlayback: 1,
};

export const Event = {
  PlaybackState: 'playback-state',
  PlaybackActiveTrackChanged: 'playback-active-track-changed',
  PlaybackError: 'playback-error',
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteStop: 'remote-stop',
  RemoteNext: 'remote-next',
  RemotePrevious: 'remote-previous',
  RemoteSeek: 'remote-seek',
};

// Mock hooks for web
export const useProgress = (updateInterval?: number) => {
  return { position: 0, duration: 0, buffered: 0 };
};

export const usePlaybackState = () => {
  return { state: State.None };
};

export const useActiveTrack = () => {
  return null;
};

// Mock TrackPlayer methods
const TrackPlayer = {
  setupPlayer: async () => true,
  updateOptions: async () => {},
  add: async () => {},
  remove: async () => {},
  skip: async () => {},
  skipToNext: async () => {},
  skipToPrevious: async () => {},
  reset: async () => {},
  play: async () => {},
  pause: async () => {},
  stop: async () => {},
  seekTo: async () => {},
  setVolume: async () => {},
  setRepeatMode: async () => {},
  getQueue: async () => [],
  getActiveTrack: async () => null,
  getActiveTrackIndex: async () => null,
  getProgress: async () => ({ position: 0, duration: 0, buffered: 0 }),
  getPlaybackState: async () => ({ state: State.None }),
  registerPlaybackService: () => {},
  addEventListener: () => ({ remove: () => {} }),
};

export default TrackPlayer;
