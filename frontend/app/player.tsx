import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import Slider from '@react-native-community/slider';

const { width, height } = Dimensions.get('window');

// Animated waveform component
const AnimatedWaveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const bars = Array(20).fill(0);
  const animations = useRef(bars.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (isPlaying) {
      bars.forEach((_, index) => {
        const animation = Animated.loop(
          Animated.sequence([
            Animated.timing(animations[index], {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 300 + Math.random() * 300,
              useNativeDriver: true,
            }),
            Animated.timing(animations[index], {
              toValue: 0.3,
              duration: 300 + Math.random() * 300,
              useNativeDriver: true,
            }),
          ])
        );
        animation.start();
      });
    } else {
      animations.forEach((anim) => {
        anim.stopAnimation();
        anim.setValue(0.3);
      });
    }
  }, [isPlaying]);

  return (
    <View style={waveStyles.container}>
      {bars.map((_, index) => (
        <Animated.View
          key={index}
          style={[
            waveStyles.bar,
            {
              transform: [{ scaleY: animations[index] }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginVertical: 24,
  },
  bar: {
    width: 4,
    height: 60,
    backgroundColor: 'rgba(201, 169, 97, 0.6)',
    marginHorizontal: 3,
    borderRadius: 2,
  },
});

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    playbackPosition,
    playbackDuration,
    isBuffering,
    playTrack,
    pauseTrack,
    resumeTrack,
    seekTo,
    playNext,
    playPrevious,
    isSubscribed,
    downloadTrack,
    deleteDownload,
    isTrackDownloaded,
    downloads,
  } = useAppStore();

  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);

  useEffect(() => {
    if (currentTrack) {
      const downloadStatus = downloads[currentTrack.id];
      if (downloadStatus) {
        setIsDownloading(downloadStatus.isDownloading);
        setDownloadProgress(downloadStatus.progress);
      } else {
        setIsDownloading(false);
        setDownloadProgress(0);
      }
    }
  }, [downloads, currentTrack]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseTrack();
    } else {
      if (currentTrack) {
        await resumeTrack();
      }
    }
  };

  const handleSeek = async (value: number) => {
    await seekTo(value);
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    
    if (isTrackDownloaded(currentTrack.id)) {
      // Delete download
      await deleteDownload(currentTrack.id);
    } else {
      // Download track
      setIsDownloading(true);
      await downloadTrack(currentTrack);
      setIsDownloading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No track selected</Text>
      </View>
    );
  }

  const downloaded = isTrackDownloaded(currentTrack.id);

  return (
    <LinearGradient
      colors={[currentTrack.thumbnail_color, '#1A1225', '#0D0A12']}
      style={[styles.container, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <View style={styles.downloadProgress}>
              <ActivityIndicator size="small" color="#C9A961" />
            </View>
          ) : (
            <Ionicons 
              name={downloaded ? "cloud-done" : "cloud-download-outline"} 
              size={24} 
              color={downloaded ? "#C9A961" : "#FFFFFF"} 
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Album Art / Waveform */}
      <View style={styles.artContainer}>
        <LinearGradient
          colors={[currentTrack.thumbnail_color, '#2D1F3D']}
          style={styles.artGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isBuffering ? (
            <ActivityIndicator size="large" color="#C9A961" />
          ) : (
            <Ionicons name="musical-notes" size={80} color="rgba(255, 255, 255, 0.2)" />
          )}
        </LinearGradient>
        
        <AnimatedWaveform isPlaying={isPlaying && !isBuffering} />
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{currentTrack.title}</Text>
        <View style={styles.trackMeta}>
          <View style={styles.moodTag}>
            <Text style={styles.moodTagText}>{currentTrack.mood}</Text>
          </View>
          {currentTrack.is_premium && (
            <View style={styles.premiumTag}>
              <Ionicons name="diamond" size={12} color="#C9A961" />
              <Text style={styles.premiumTagText}>Premium</Text>
            </View>
          )}
          {downloaded && (
            <View style={styles.downloadedTag}>
              <Ionicons name="cloud-done" size={12} color="#4CAF50" />
              <Text style={styles.downloadedTagText}>Offline</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%` }
              ]} 
            />
          </View>
        ) : (
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={playbackDuration}
            value={playbackPosition}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor="#C9A961"
            maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
            thumbTintColor="#C9A961"
          />
        )}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(playbackDuration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={playPrevious}
        >
          <Ionicons name="play-skip-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.8}
          disabled={isBuffering}
        >
          {isBuffering ? (
            <ActivityIndicator size="large" color="#4A3463" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={36}
              color="#4A3463"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={playNext}
        >
          <Ionicons name="play-skip-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Additional Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Sadaa Instrumentals</Text>
        <Text style={styles.footerSubtext}>Dawoodi Bohra Madeh Music</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  downloadProgress: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 20,
  },
  artGradient: {
    width: width - 100,
    height: width - 100,
    maxWidth: 280,
    maxHeight: 280,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 24,
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  moodTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moodTagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 169, 97, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumTagText: {
    color: '#C9A961',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  downloadedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  downloadedTagText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  progressContainer: {
    paddingHorizontal: 40,
    marginTop: 32,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C9A961',
    borderRadius: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 32,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C9A961',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: '500',
  },
  footerSubtext: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 12,
    marginTop: 4,
  },
});
