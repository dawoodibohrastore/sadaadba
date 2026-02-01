import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useAppStore, Instrumental, Playlist } from '../../store/appStore';
import { COLORS, APP_NAME } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Islamic Pattern Background
const IslamicPatternBg = () => {
  const size = 45;
  const rows = Math.ceil(height / size) + 2;
  const cols = Math.ceil(width / size) + 2;
  
  const elements = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * size + (row % 2 === 0 ? 0 : size / 2);
      const y = row * size;
      
      elements.push(
        <Path
          key={`d-${row}-${col}`}
          d={`M ${x} ${y - size/3} L ${x + size/3} ${y} L ${x} ${y + size/3} L ${x - size/3} ${y} Z`}
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={0.5}
          fill="none"
        />
      );
    }
  }
  
  return (
    <View style={patternStyles.container} pointerEvents="none">
      <Svg width={width} height={height * 2} style={patternStyles.svg}>
        {elements}
      </Svg>
    </View>
  );
};

const patternStyles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  svg: { position: 'absolute', top: 0, left: 0 },
});

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    instrumentals,
    isSubscribed,
    initializeApp,
    playTrack,
    playPreview,
    favorites,
    playlists,
    createPlaylist,
    deletePlaylist,
    getPlaylistTracks,
    downloadedTracks,
    isOnline,
    downloadTrack,
    canPlayTrack,
    isTrackDownloaded,
    downloads,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'favorites' | 'playlists' | 'downloads'>('favorites');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Instrumental[]>([]);

  useEffect(() => {
    const load = async () => {
      if (instrumentals.length === 0) {
        await initializeApp();
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleTrackPress = async (track: Instrumental) => {
    const { canPlay, reason } = canPlayTrack(track.id);
    
    if (!canPlay) {
      Alert.alert('Offline', reason || 'Cannot play this track');
      return;
    }
    
    if (track.is_premium && !isSubscribed) {
      if (track.preview_start !== null && track.preview_end !== null) {
        await playPreview(track);
        router.push('/preview');
      } else {
        router.push('/subscription');
      }
    } else {
      await playTrack(track);
      router.push('/player');
    }
  };

  const handleDownload = async (track: Instrumental) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to download this audio.');
      return;
    }
    
    const success = await downloadTrack(track);
    if (success) {
      Alert.alert('Downloaded', `"${track.title}" is now available offline.`);
    } else {
      Alert.alert('Error', 'Failed to download. Please try again.');
    }
  };

  const handlePlaylistPress = async (playlist: Playlist) => {
    const tracks = await getPlaylistTracks(playlist.id);
    setPlaylistTracks(tracks);
    setSelectedPlaylist(playlist);
  };

  const handleCreatePlaylist = async () => {
    if (newPlaylistName.trim()) {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  const handleDeletePlaylist = (playlistId: string, name: string) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deletePlaylist(playlistId)
        }
      ]
    );
  };

  const handlePlayAll = async (tracks: Instrumental[]) => {
    const playableTracks = isOnline 
      ? tracks 
      : tracks.filter(t => isTrackDownloaded(t.id));
    
    if (playableTracks.length === 0) {
      Alert.alert('Offline', 'No downloaded tracks available to play offline.');
      return;
    }
    
    if (playableTracks.length > 0) {
      await playTrack(playableTracks[0], playableTracks);
      router.push('/player');
    }
  };

  const getDownloadedTracksList = (): Instrumental[] => {
    const trackIds = Object.keys(downloadedTracks);
    const tracks: Instrumental[] = [];
    
    for (const trackId of trackIds) {
      const fromInstrumentals = instrumentals.find(i => i.id === trackId);
      if (fromInstrumentals) {
        tracks.push(fromInstrumentals);
      } else {
        const downloadInfo = downloadedTracks[trackId];
        if (downloadInfo.trackMetadata) {
          tracks.push(downloadInfo.trackMetadata);
        }
      }
    }
    
    return tracks;
  };

  const downloadedTracksList = getDownloadedTracksList();

  const renderTrackRow = (track: Instrumental, showDownloadButton: boolean = true) => {
    const downloaded = isTrackDownloaded(track.id);
    const isDownloading = downloads[track.id]?.isDownloading;
    const downloadProgress = downloads[track.id]?.progress || 0;
    
    return (
      <View key={track.id} style={styles.trackRow}>
        <TouchableOpacity
          style={styles.trackContent}
          onPress={() => handleTrackPress(track)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[track.thumbnail_color, COLORS.cardBg]}
            style={styles.trackThumbnail}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="musical-note" size={18} color="rgba(255, 255, 255, 0.5)" />
            {!isOnline && !downloaded && (
              <View style={styles.offlineOverlay}>
                <Ionicons name="cloud-offline" size={14} color="#FFFFFF" />
              </View>
            )}
          </LinearGradient>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, !isOnline && !downloaded && styles.trackTitleOffline]} numberOfLines={1}>
              {track.title}
            </Text>
            <View style={styles.trackMetaRow}>
              <Text style={styles.trackMeta}>{track.mood} • {track.duration_formatted}</Text>
              {downloaded && (
                <View style={styles.downloadedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.downloaded} />
                  <Text style={styles.downloadedText}>Offline</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {showDownloadButton && !downloaded && (
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={() => handleDownload(track)}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <View style={styles.downloadingIndicator}>
                <ActivityIndicator size="small" color={COLORS.accentBlue} />
                <Text style={styles.downloadingText}>{Math.round(downloadProgress * 100)}%</Text>
              </View>
            ) : (
              <Ionicons name="cloud-download-outline" size={22} color={COLORS.accentBlue} />
            )}
          </TouchableOpacity>
        )}
        
        {downloaded && (
          <Ionicons name="play" size={20} color={COLORS.accentBlue} style={styles.playIcon} />
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <IslamicPatternBg />
        <ActivityIndicator size="large" color={COLORS.accentBlue} />
      </View>
    );
  }

  // Playlist Detail View
  if (selectedPlaylist) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <IslamicPatternBg />
        <View style={styles.playlistHeader}>
          <TouchableOpacity onPress={() => setSelectedPlaylist(null)}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.playlistTitle}>{selectedPlaylist.name}</Text>
          <TouchableOpacity onPress={() => handleDeletePlaylist(selectedPlaylist.id, selectedPlaylist.name)}>
            <Ionicons name="trash-outline" size={22} color={COLORS.accentRed} />
          </TouchableOpacity>
        </View>

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={16} color={COLORS.offline} />
            <Text style={styles.offlineBannerText}>You're offline. Only downloaded tracks can be played.</Text>
          </View>
        )}

        <View style={styles.playlistStats}>
          <Text style={styles.playlistCount}>{playlistTracks.length} tracks</Text>
          {playlistTracks.length > 0 && (
            <TouchableOpacity 
              style={styles.playAllButton}
              onPress={() => handlePlayAll(playlistTracks)}
            >
              <Ionicons name="play" size={16} color={COLORS.textPrimary} />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.tracksList}>
          {playlistTracks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No tracks in this playlist</Text>
              <Text style={styles.emptySubtext}>Add tracks from the player screen</Text>
            </View>
          ) : (
            playlistTracks.map(track => renderTrackRow(track, true))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <IslamicPatternBg />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        <View style={styles.headerRight}>
          {!isOnline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline" size={16} color={COLORS.offline} />
            </View>
          )}
          {!isSubscribed && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/subscription')}
            >
              <Ionicons name="diamond" size={14} color={COLORS.accentGold} />
              <Text style={styles.upgradeText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color={COLORS.offline} />
          <Text style={styles.offlineBannerText}>You're offline. Showing saved data.</Text>
        </View>
      )}

      {/* Tabs - Original 3-tab layout */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
          onPress={() => setActiveTab('favorites')}
        >
          <Ionicons 
            name="heart" 
            size={18} 
            color={activeTab === 'favorites' ? COLORS.textPrimary : COLORS.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
            Favorites
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
          onPress={() => setActiveTab('playlists')}
        >
          <Ionicons 
            name="list" 
            size={18} 
            color={activeTab === 'playlists' ? COLORS.textPrimary : COLORS.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'playlists' && styles.activeTabText]}>
            Playlists
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'downloads' && styles.activeTab]}
          onPress={() => setActiveTab('downloads')}
        >
          <Ionicons 
            name="cloud-done" 
            size={18} 
            color={activeTab === 'downloads' ? COLORS.textPrimary : COLORS.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'downloads' && styles.activeTabText]}>
            Downloads
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <View>
            {favorites.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No favorites yet</Text>
                <Text style={styles.emptySubtext}>Tap the heart icon on a track to add it here</Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionCount}>{favorites.length} tracks</Text>
                  <TouchableOpacity 
                    style={styles.playAllSmall}
                    onPress={() => handlePlayAll(favorites)}
                  >
                    <Ionicons name="play" size={14} color={COLORS.accentBlue} />
                    <Text style={styles.playAllSmallText}>Play All</Text>
                  </TouchableOpacity>
                </View>
                {favorites.map(track => renderTrackRow(track, true))}
              </>
            )}
          </View>
        )}

        {/* Playlists Tab */}
        {activeTab === 'playlists' && (
          <View>
            <TouchableOpacity 
              style={styles.createPlaylistButton}
              onPress={() => setShowCreateModal(true)}
            >
              <View style={styles.createPlaylistIcon}>
                <Ionicons name="add" size={24} color={COLORS.textPrimary} />
              </View>
              <Text style={styles.createPlaylistText}>Create New Playlist</Text>
            </TouchableOpacity>

            {playlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="albums-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No playlists yet</Text>
                <Text style={styles.emptySubtext}>Create your first playlist above</Text>
              </View>
            ) : (
              playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.playlistCard}
                  onPress={() => handlePlaylistPress(playlist)}
                >
                  <LinearGradient
                    colors={[playlist.cover_color, COLORS.cardBg]}
                    style={styles.playlistCover}
                  >
                    <Ionicons name="musical-notes" size={24} color="rgba(255, 255, 255, 0.5)" />
                  </LinearGradient>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistTrackCount}>{playlist.track_ids.length} tracks</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Downloads Tab */}
        {activeTab === 'downloads' && (
          <View>
            {downloadedTracksList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cloud-download-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No downloads yet</Text>
                <Text style={styles.emptySubtext}>Download tracks for offline listening</Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionCount}>{downloadedTracksList.length} tracks available offline</Text>
                </View>
                {downloadedTracksList.map(track => renderTrackRow(track, false))}
              </>
            )}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Create Playlist Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor={COLORS.textMuted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancel}
                onPress={() => {
                  setNewPlaylistName('');
                  setShowCreateModal(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalCreate}
                onPress={handleCreatePlaylist}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBg,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offlineIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  upgradeText: {
    color: COLORS.accentGold,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.offline,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.cardBg,
    gap: 6,
  },
  activeTab: {
    backgroundColor: COLORS.accentBlue,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  playAllSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playAllSmallText: {
    fontSize: 14,
    color: COLORS.accentBlue,
    fontWeight: '500',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  trackContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  offlineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  trackTitleOffline: {
    color: COLORS.textMuted,
  },
  trackMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  trackMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  downloadedText: {
    fontSize: 11,
    color: COLORS.downloaded,
    fontWeight: '500',
  },
  downloadButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadingIndicator: {
    alignItems: 'center',
  },
  downloadingText: {
    fontSize: 9,
    color: COLORS.accentBlue,
    marginTop: 2,
  },
  playIcon: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  createPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  createPlaylistIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPlaylistText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.accentBlue,
    marginLeft: 12,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  playlistCover: {
    width: 52,
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  playlistTrackCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  playlistTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  playlistStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  playlistCount: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  playAllText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  tracksList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.secondaryBg,
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  modalCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
  modalCreate: {
    backgroundColor: COLORS.accentBlue,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCreateText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
});
