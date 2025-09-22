// src/screens/AlbumsScreen.js
import React, { useMemo, useState, useCallback, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
  Modal,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';


const API_URL = 'http://143.198.138.35:8000';

const { width: SCREEN_W } = Dimensions.get('window');
const GUTTER = 12;
const COLS = 2;
const COL_W = (SCREEN_W - (GUTTER * (COLS + 1))) / COLS;

const CREATE_ALBUM_URL = `${API_URL}/albums/`;                                      
const ALBUMS_BY_EVENT_URL = (eventId) => `${API_URL}/albums/${eventId}`;
const UPLOAD_URL = (albumId) => `${API_URL}/albums/${albumId}/photos`;    
const PHOTOS_BY_ALBUM_URL = (albumId) => `${API_URL}/photos/album/${albumId}`;
const FAVORITE_URL = (photoId) => `${API_URL}/photos/${photoId}/favorite`;
const mapAlbumFromApi = (a) => ({
  id: String(a.album_id ?? a.id ?? a.albumId),
  name: a.name,
  photos: [],
});

const mapPhotoFromApi = (p) => {
  const uri =
    p.path ||
    p.url ||
    p.photo_url ||
    p.image_url ||
    p.s3_url ||
    p.file_url ||
    p.secure_url ||
    p.uri;

  const isHttp = typeof uri === 'string' && /^https?:\/\//i.test(uri);
  if (!isHttp) return null;

  const w = p.w || p.width || 800;
  const h = p.h || p.height || 1200;

  return {
    id: String(p.photo_id ?? p.id ?? `${Date.now()}_${Math.random()}`),
    uri,
    w,
    h,
    title: p.title || p.name || '',
    fav: Boolean(p.is_favorite ?? p.favorite ?? p.fav ?? false),
  };
};

export default function AlbumsScreen({ navigation, route }) {
  const { t } = useTranslation('albums_photos');
  const { eventId, albumId: initialAlbumId } = route?.params || {};
  const { user } = useContext(AuthContext);
  const token = user?.token || user?.accessToken || '';

  const [albums, setAlbums] = useState([]);
  const [activeAlbumId, setActiveAlbumId] = useState(null);

  const [pickerBusy, setPickerBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumCover, setNewAlbumCover] = useState(null);       
  const [newAlbumBusy, setNewAlbumBusy] = useState(false);        

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState(null);

  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const normalizeToJpeg = useCallback(async (asset) => {
    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      [],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    const base = asset.fileName || asset.uri?.split('/').pop() || `image_${Date.now()}.jpg`;
    const name = base.toLowerCase().endsWith('.jpg') ? base : `${base.replace(/\.[^/.]+$/,'')}.jpg`;
    return { uri: result.uri, name, type: 'image/jpeg' };
  }, []);

  const fetchAlbums = useCallback(async () => {
    if (!eventId || !token) return;
    setLoadingAlbums(true);
    try {
      const r = await fetch(ALBUMS_BY_EVENT_URL(eventId), { headers: authHeaders });
       if (!r.ok) throw new Error('albums_load_failed');
      const data = await r.json();
      const tabs = (data || []).map(mapAlbumFromApi);
      setAlbums(tabs);
      const toSelect = initialAlbumId ? String(initialAlbumId) : tabs[0]?.id;
      setActiveAlbumId(toSelect || null);
      if (toSelect) {
        await fetchPhotos(toSelect, tabs);
      }
    } catch (e) {
      Alert.alert(t('alerts.error_title'), t('alerts.albums_load_failed'));
    } finally {
      setLoadingAlbums(false);
    }
  }, [eventId, token]);

  const fetchPhotos = useCallback(
    async (albumId, currentAlbums = albums) => {
      if (!albumId || !token) return;
      setLoadingPhotos(true);
      try {
        const r = await fetch(PHOTOS_BY_ALBUM_URL(albumId), { headers: authHeaders });
         if (!r.ok) throw new Error('photos_load_failed');
        const list = await r.json();
        const mapped = (list || []).map(mapPhotoFromApi).filter(Boolean);

        setAlbums(prev => {
          const base = currentAlbums?.length ? currentAlbums : prev;
          return base.map(a => (a.id === String(albumId) ? { ...a, photos: mapped } : a));
        });
      } catch (e) {
       Alert.alert(t('alerts.error_title'), t('alerts.photos_load_failed'));
      } finally {
        setLoadingPhotos(false);
      }
    },
    [albums, token]
  );

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const activeAlbum = useMemo(
    () => albums.find(a => a.id === activeAlbumId),
    [albums, activeAlbumId]
  );

  const columns = useMemo(() => {
    const heights = Array(COLS).fill(0);
    const cols = Array(COLS).fill(0).map(() => []);
    (activeAlbum?.photos ?? []).forEach(p => {
      const ratio = p.h && p.w ? p.h / p.w : 1.4;
      const calcH = COL_W * ratio;
      const target = heights.indexOf(Math.min(...heights));
      cols[target].push({ ...p, _h: calcH });
      heights[target] += calcH + GUTTER;
    });
    return cols;
  }, [activeAlbum]);

  const uploadOnePhoto = useCallback(
    async (asset, albumId) => {
      try {
        const file = await normalizeToJpeg(asset);
        const form = new FormData();
        form.append('file', file);

        const res = await fetch(UPLOAD_URL(albumId), {
          method: 'POST',
          headers: { ...authHeaders },
          body: form,
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Fallo al subir la foto');
        }

        await fetchPhotos(albumId);
        return true;
      } catch (e) {
        console.log('upload error:', e?.message);
        return false;
      }
    },
    [authHeaders, normalizeToJpeg, fetchPhotos]
  );


  const ensureActiveAlbumReady = useCallback(async () => {
  if (!activeAlbumId) return false;
  const exists = albums.some(a => a.id === String(activeAlbumId));
  if (exists) return true;

  await fetchAlbums();
  return albums.some(a => a.id === String(activeAlbumId));
}, [activeAlbumId, albums, fetchAlbums]);

const pickImages = useCallback(async () => {
  const ready = await ensureActiveAlbumReady();
  if (!ready) {
    Alert.alert(t('alerts.wait_title'), t('alerts.wait_desc'));
    return;
  }

  try {
    setPickerBusy(true);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('alerts.perm_title'), t('alerts.perm_photos'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.9,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (result.canceled) return;

    const assets = result.assets || [];
    if (!assets.length) return;

    let okCount = 0;
    for (const asset of assets) {
      const ok = await uploadOnePhoto(asset, activeAlbumId);
      if (ok) okCount += 1;
    }

    if (okCount > 0) {
      await fetchPhotos(activeAlbumId);
       Alert.alert(
        t('alerts.upload_done_title'),
        okCount === 1 ? t('alerts.upload_some_one') : t('alerts.upload_some_other', { count: okCount })
      );
    } else {
      Alert.alert(t('alerts.error_title'), t('alerts.upload_none'));
    }
  } catch (e) {
    console.error(e);
    Alert.alert(t('alerts.error_title'), t('alerts.photos_upload_failed'));
  } finally {
    setPickerBusy(false);
  }
}, [activeAlbumId, ensureActiveAlbumReady, uploadOnePhoto, fetchPhotos]);

  const selectNewAlbumCover = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
         Alert.alert(t('alerts.perm_title'), t('alerts.perm_cover'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: false,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled) return;
      setNewAlbumCover(result.assets?.[0] || null);
    } catch (e) {
      console.log(e);
      Alert.alert(t('alerts.error_title'), t('alerts.cover_pick_failed'));
    }
  }, []);

 const createAlbum = useCallback(async () => {
  const name = (newAlbumName || '').trim();
  if (!name) return;
  if (!eventId) {
    Alert.alert(t('alerts.missing_info_title'), t('alerts.missing_event_id'));
    return;
  }

  setNewAlbumBusy(true);
  try {
    const form = new FormData();
    form.append('name', name);
    form.append('event_id', String(eventId));
    if (newAlbumCover) {
      const file = await normalizeToJpeg(newAlbumCover);
      form.append('cover_url', file);
    }

    const res = await fetch(CREATE_ALBUM_URL, { method: 'POST', headers: { ...authHeaders }, body: form });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'create_failed');
    }
    const created = await res.json().catch(() => ({}));
    const newId = String(created?.album_id ?? created?.id ?? '');

    if (newId) {
      setAlbums(prev => [...prev, { id: newId, name, photos: [] }]);
      setActiveAlbumId(newId);
      fetchPhotos(newId);
    }

    fetchAlbums();

    setNewAlbumName('');
    setNewAlbumCover(null);
    setShowCreate(false);
  } catch (e) {
    console.error(e);
    Alert.alert(t('alerts.error_title'), t('alerts.create_failed'));
  } finally {
    setNewAlbumBusy(false);
  }
}, [newAlbumName, eventId, newAlbumCover, authHeaders, normalizeToJpeg, fetchAlbums, fetchPhotos]);


  const apiToggleFavorite = useCallback(
    async (photoId, nextFav) => {
      let res = await fetch(FAVORITE_URL(photoId), {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: nextFav }),
      });

      if (!res.ok) {
        res = await fetch(`${FAVORITE_URL(photoId)}?is_favorite=${nextFav}`, {
          method: 'PATCH',
          headers: { ...authHeaders },
        });
      }
      if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        throw new Error(errTxt || `Fav error ${res.status}`);
      }
      return res.json().catch(() => ({}));
    },
    [authHeaders]
  );

  const patchPhotoFavInState = useCallback((photoId, value) => {
    setAlbums(prev =>
      prev.map(a =>
        a.id !== activeAlbumId
          ? a
          : { ...a, photos: a.photos.map(p => (p.id === photoId ? { ...p, fav: value } : p)) }
      )
    );
    setViewerPhoto(prev => (prev && prev.id === photoId ? { ...prev, fav: value } : prev));
  }, [activeAlbumId]);

  const toggleFav = useCallback(async (photoId) => {
    const album = albums.find(a => a.id === activeAlbumId);
    if (!album) return;

    const photo = album.photos.find(p => p.id === photoId);
    if (!photo) return;

    const nextFav = !photo.fav;
    patchPhotoFavInState(photoId, nextFav);

    try {
      await apiToggleFavorite(photoId, nextFav);
    } catch (e) {
      patchPhotoFavInState(photoId, !nextFav);
      console.error('Fav error:', e?.message);
      Alert.alert(t('alerts.error_title'), t('alerts.fav_failed'));
    }
  }, [albums, activeAlbumId, patchPhotoFavInState, apiToggleFavorite]);

  const shareAlbum = useCallback(async () => {
    try {
      const a = activeAlbum;
      if (!a) return;
      await Share.share({
        message: `🎞️ Álbum "${a.name}" con ${a.photos?.length || 0} fotos. (enlace de ejemplo)`,
      });
    } catch {}
  }, [activeAlbum]);

  const sharePhoto = useCallback(async (photo) => {
    try {
      await Share.share({ message: `📸 Foto de álbum "${activeAlbum?.name}"`, url: photo.uri });
    } catch {}
  }, [activeAlbum?.name]);

  const downloadPhoto = useCallback(async (photo) => {
  try {
    const ok = await ensureWritePermission();
    if (!ok) {
      Alert.alert(t('alerts.perm_title'), t('alerts.download_perm'));
      return;
    }

    let ext = 'jpg';
    try {
      const u = new URL(photo.uri);
      const match = (u.pathname || '').match(/\.(\w+)(?:$|\?)/i);
      if (match?.[1]) {
        ext = match[1].toLowerCase();
        if (ext === 'jpeg' || ext === 'heic') ext = 'jpg';
      }
    } catch {}

    const fileUri = FileSystem.documentDirectory + `${photo.id}.${ext}`;
    const { uri } = await FileSystem.downloadAsync(photo.uri, fileUri);
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert(t('alerts.download_ok_title'), t('alerts.download_ok_desc'));
  } catch (e) {
    console.error(e);
    Alert.alert(t('alerts.error_title'), t('alerts.download_failed'));
  }
}, [ensureWritePermission]);


  const openViewer = (p) => {
    setViewerPhoto(p);
    setViewerOpen(true);
  };



const ensureWritePermission = useCallback(async () => {
  let perm = await MediaLibrary.getPermissionsAsync();
  if (!perm.granted) {
    perm = await MediaLibrary.requestPermissionsAsync(); 
  }
  return perm.granted;
}, []);

useEffect(() => {
  (async () => {
    try {
      await ensureWritePermission();
    } catch (e) {
    }
  })();
}, [ensureWritePermission]);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={24} color="#6F4C8C" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('brand')}</Text>
        <TouchableOpacity onPress={shareAlbum}>
          <Ionicons name="share-outline" size={22} color="#6F4C8C" />
        </TouchableOpacity>
      </View>

      <Text style={styles.titleSection}>{t('section.photos')}</Text>

      {/* Tabs de álbumes */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        contentInsetAdjustmentBehavior="never"
        style={{ flexGrow: 0 }}
      >
        {loadingAlbums ? (
          <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 }}>
            <ActivityIndicator />
          </View>
        ) : (
          albums.map((a) => {
            const active = a.id === activeAlbumId;
            return (
              <TouchableOpacity
                key={a.id}
                onPress={async () => {
                  setActiveAlbumId(a.id);
                  await fetchPhotos(a.id);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {a.name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* Botón Nuevo álbum */}
        <TouchableOpacity
          style={[styles.chipOutline, (newAlbumBusy || loadingAlbums) && { opacity: 0.6 }]}
          onPress={() => !newAlbumBusy && setShowCreate(true)}
          disabled={newAlbumBusy || loadingAlbums}
        >
          <Ionicons name="add" size={18} color="#6F4C8C" />
         <Text style={styles.chipOutlineText}>{t('tabs.new_album')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Grid tipo Pinterest */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 0 }}>
        {loadingPhotos && (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        )}
        <View style={styles.masonryRow}>
          {columns.map((col, i) => (
            <View key={`col-${i}`} style={{ width: COL_W }}>
              {col.map((p) => (
                <View key={p.id} style={{ marginBottom: GUTTER }}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => openViewer(p)} style={styles.card}>
                    <Image source={{ uri: p.uri }} style={{ width: '100%', height: p._h, borderRadius: 12 }} />
                    <TouchableOpacity
                      style={styles.favBtn}
                      onPress={() => toggleFav(p.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name={p.fav ? 'heart' : 'heart-outline'} size={20} color={p.fav ? '#E11D48' : '#fff'} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                 {p.title ? (
  <Text style={styles.caption} numberOfLines={1}>{p.title}</Text>
) : null}

                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.action} onPress={() => sharePhoto(p)}>
                      <Ionicons name="share-social-outline" size={16} color="#6F4C8C" />
                      {/* <Text style={styles.actionText}>Compartir</Text> */}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.action} onPress={() => downloadPhoto(p)}>
                      <Ionicons name="download-outline" size={16} color="#6F4C8C" />
                      {/* <Text style={styles.actionText}>Descargar</Text> */}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Botón Agregar fotos */}
        <TouchableOpacity style={styles.addButton} onPress={pickImages} disabled={pickerBusy }>
          {pickerBusy ? (
            <ActivityIndicator />
          ) : (
            <>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.addText}>{t('actions.add_photos')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal crear álbum */}
      <Modal visible={showCreate} animationType="fade" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
             <Text style={styles.modalTitle}>{t('modal.create_title')}</Text>

            <TextInput
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              placeholder={t('modal.album_name_ph')}
              style={styles.input}
              editable={!newAlbumBusy}
            />

            {/* Selector de portada */}
            <TouchableOpacity
              style={styles.coverPicker}
              onPress={selectNewAlbumCover}
              disabled={newAlbumBusy}
            >
              <Ionicons name="image-outline" size={18} color="#6F4C8C" />
              <Text style={styles.coverPickerText}>
                {newAlbumCover ? t('actions.change_cover') : t('actions.pick_cover')}
              </Text>
            </TouchableOpacity>

            {newAlbumCover && (
              <View style={styles.coverPreviewRow}>
                <Image source={{ uri: newAlbumCover.uri }} style={styles.coverPreview} />
                <TouchableOpacity onPress={() => setNewAlbumCover(null)} disabled={newAlbumBusy} style={styles.removeCoverBtn}>
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#E5E7EB' }]}
                onPress={() => !newAlbumBusy && setShowCreate(false)}
                disabled={newAlbumBusy}
              >
                <Text style={[styles.btnText, { color: '#111827' }]}>{t('actions.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#6F4C8C', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]}
                onPress={createAlbum}
                disabled={!newAlbumName.trim() || newAlbumBusy}
              >
                {newAlbumBusy ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                <Text style={styles.btnText}>{newAlbumBusy ? t('actions.creating') : t('actions.create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Visor de foto */}
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.viewerBg}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerOpen(false)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          {viewerPhoto && (
            <>
              <Image source={{ uri: viewerPhoto.uri }} style={styles.viewerImage} resizeMode="contain" />
              <View style={styles.viewerActions}>
                <TouchableOpacity onPress={() => toggleFav(viewerPhoto.id)} style={styles.viewerActionBtn}>
                  <Ionicons name={viewerPhoto.fav ? 'heart' : 'heart-outline'} size={22} color="#fff" />
                  <Text style={styles.viewerActionTxt}>{t('actions.favorite')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => sharePhoto(viewerPhoto)} style={styles.viewerActionBtn}>
                  <Ionicons name="share-social-outline" size={22} color="#fff" />
                  <Text style={styles.viewerActionTxt}>{t('actions.share')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => downloadPhoto(viewerPhoto)} style={styles.viewerActionBtn}>
                  <Ionicons name="download-outline" size={22} color="#fff" />
                  <Text style={styles.viewerActionTxt}>{t('actions.download')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5EEF7', marginTop: 20 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#6F4C8C' },

  tabs: { paddingHorizontal: 12, paddingBottom: 12, gap: 8, paddingTop: 4, height: 55, flexGrow: 0, marginBottom: 15 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EADAF3' },
  chipActive: { backgroundColor: '#C7A7E0' },
  chipText: { color: '#6F4C8C', fontWeight: '600' },
  chipTextActive: { color: '#3E2757' },
  chipOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7A7E0',
    marginLeft: 4,
    gap: 4,
    backgroundColor: '#FFF',
  },
  chipOutlineText: { color: '#6F4C8C', fontWeight: '600' },
  titleSection: { fontSize: 25, fontWeight: '700', color: 'black', marginLeft: 16, marginTop: 12, marginBottom: 8 },

  masonryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#ddd' },
  favBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#0008', padding: 6, borderRadius: 24 },
  caption: { marginTop: 6, marginLeft: 4, color: '#4B5563', fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: 14, paddingLeft: 4, marginTop: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: '#6F4C8C', fontWeight: '600', fontSize: 10 },

  addButton: {
    marginTop: 16,
    marginBottom: 32,
    marginHorizontal: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#C7A7E0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '85%', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#3E2757' },
  input: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },

  coverPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8F5FB',
    borderWidth: 1,
    borderColor: '#E5D9F2',
  },
  coverPickerText: { color: '#6F4C8C', fontWeight: '600' },

  coverPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coverPreview: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#EEE' },
  removeCoverBtn: { backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },

  viewerBg: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 40, right: 20, padding: 8 },
  viewerImage: { width: SCREEN_W, height: '70%' },
  viewerActions: { position: 'absolute', bottom: 40, flexDirection: 'row', gap: 24 },
  viewerActionBtn: { alignItems: 'center' },
  viewerActionTxt: { color: '#fff', marginTop: 6, fontWeight: '600' },

  btn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
