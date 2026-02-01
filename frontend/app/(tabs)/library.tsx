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
  const [activeTab, setActiveTab] = useState<'all' | 'downloads'>('all');
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
    Alert.alert('Delete Playlist', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(playlistId) }
    ]);
  };

  const handlePlayAll = async (tracks: Instrumental[]) => {
    const playableTracks = isOnline ? tracks : tracks.filter(t => isTrackDownloaded(t.id));
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
            <TouchableOpacity style={styles.playAllButton} onPress={() => handlePlayAll(playlistTracks)}>
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
            playlistTracks.map(track => (
              <TouchableOpacity key={track.id} style={styles.trackRow} onPress={() => handleTrackPress(track)}>
                <LinearGradient colors={[track.thumbnail_color, COLORS.cardBg]} style={styles.trackThumbnail}>
                  <Ionicons name="musical-note" size={18} color="rgba(255, 255, 255, 0.5)" />
                </LinearGradient>
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.trackMeta}>{track.mood} • {track.duration_formatted}</Text>
                </View>
                <Ionicons name="play" size={20} color={COLORS.accentBlue} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <IslamicPatternBg />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="musical-notes" size={20} color={COLORS.accentGold} />
          </View>
          <Text style={styles.headerTitle}>Library</Text>
        </View>
        <View style={styles.headerRight}>
          {!isOnline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline" size={14} color={COLORS.offline} />
            </View>
          )}
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'downloads' && styles.activeTab]}
          onPress={() => setActiveTab('downloads')}
        >
          <Text style={[styles.tabText, activeTab === 'downloads' && styles.activeTabText]}>Downloads</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'all' ? (
          <>
            {/* Playlists Section */}
            <Text style={styles.sectionTitle}>Playlists</Text>
            
            {/* Create New Playlist Card */}
            <TouchableOpacity style={styles.createPlaylistCard} onPress={() => setShowCreateModal(true)}>
              <View style={styles.createPlaylistIconContainer}>
                <Ionicons name="add" size={24} color={COLORS.textPrimary} />
              </View>
              <View style={styles.createPlaylistInfo}>
                <Text style={styles.createPlaylistTitle}>Create A New Playlist</Text>
                <Text style={styles.createPlaylistSubtext}>Add tracks to create a new playlist</Text>
              </View>
            </TouchableOpacity>

            {/* Favourites Card */}
            <TouchableOpacity 
              style={styles.favouritesCard}
              onPress={() => {
                if (favorites.length > 0) handlePlayAll(favorites);
              }}
            >
              <View style={styles.favouritesIconContainer}>
                <Ionicons name="heart" size={24} color={COLORS.textPrimary} />
              </View>
              <View style={styles.favouritesInfo}>
                <Text style={styles.favouritesTitle}>Favourites</Text>
                <Text style={styles.favouritesSubtext}>{favorites.length} tracks</Text>
              </View>
            </TouchableOpacity>

            {/* User Playlists */}
            {playlists.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={styles.playlistCard}
                onPress={() => handlePlaylistPress(playlist)}
              >
                <LinearGradient colors={[playlist.cover_color, COLORS.cardBg]} style={styles.playlistCover}>
                  <Ionicons name="musical-notes" size={20} color="rgba(255, 255, 255, 0.5)" />
                </LinearGradient>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{playlist.name}</Text>
                  <Text style={styles.playlistTrackCount}>{playlist.track_ids.length} tracks</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}

            {/* View All Button */}
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Downloads Section */}
            {downloadedTracksList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cloud-download-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No downloads yet</Text>
                <Text style={styles.emptySubtext}>Download tracks for offline listening</Text>
              </View>
            ) : (
              <>
                <View style={styles.downloadsHeader}>
                  <Text style={styles.downloadsCount}>{downloadedTracksList.length} tracks available offline</Text>
                </View>
                {downloadedTracksList.map(track => (
                  <TouchableOpacity key={track.id} style={styles.trackRow} onPress={() => handleTrackPress(track)}>
                    <LinearGradient colors={[track.thumbnail_color, COLORS.cardBg]} style={styles.trackThumbnail}>
                      <Ionicons name="musical-note" size={18} color="rgba(255, 255, 255, 0.5)" />
                    </LinearGradient>
                    <View style={styles.trackInfo}>
                      <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                      <View style={styles.trackMetaRow}>
                        <Text style={styles.trackMeta}>{track.mood} • {track.duration_formatted}</Text>
                        <View style={styles.downloadedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color={COLORS.downloaded} />
                          <Text style={styles.downloadedText}>Offline</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="play" size={20} color={COLORS.accentBlue} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Create Playlist Modal */}
      <Modal visible={showCreateModal} animationType="fade" transparent={true} onRequestClose={() => setShowCreateModal(false)}>
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
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setNewPlaylistName(''); setShowCreateModal(false); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreate} onPress={handleCreatePlaylist}>
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
    paddingTop: 12,
    paddingBottom: 12,
    zIndex: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
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
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.buttonSecondary,
  },
  activeTab: {
    backgroundColor: COLORS.accentBlue,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  createPlaylistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  createPlaylistIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPlaylistInfo: {
    flex: 1,
    marginLeft: 14,
  },
  createPlaylistTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  createPlaylistSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  favouritesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  favouritesIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.accentRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favouritesInfo: {
    flex: 1,
    marginLeft: 14,
  },
  favouritesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  favouritesSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
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
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 14,
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.buttonSecondary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  downloadsHeader: {
    marginBottom: 16,
  },
  downloadsCount: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  trackThumbnail: {
    width: 44,
    height: 44,
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
  // Playlist Detail Styles
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
