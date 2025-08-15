// src/screens/AlbumsScreen.js
import React, { useMemo, useState, useCallback } from 'react';
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

const { width: SCREEN_W } = Dimensions.get('window');
const GUTTER = 12; // separación entre tarjetas
const COLS = 2;
const COL_W = (SCREEN_W - (GUTTER * (COLS + 1))) / COLS;

// --- Datos de ejemplo (sin backend) ---
const seed = {
  Preparativos: [
    { id: 'p1', uri: 'https://picsum.photos/id/1/200/300', w: 800, h: 1000, title: 'Ramo', fav: false },
    { id: 'p2', uri: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9', w: 800, h: 1200, title: 'Makeup', fav: true },
  ],
  Ceremonia: [
    { id: 'c1', uri: 'https://images.unsplash.com/photo-1519741497674-611481863552', w: 1000, h: 700, title: 'Votos', fav: false },
    { id: 'c2', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', w: 700, h: 1000, title: 'Anillos', fav: false },
  ],
  Fiesta: [
    { id: 'f1', uri: 'https://picsum.photos/id/3/200/300', w: 1000, h: 1200, title: 'Brindis', fav: false },
    { id: 'f2', uri: 'https://images.unsplash.com/photo-1519741497674-611481863552', w: 900, h: 1200, title: 'Baile', fav: true },
  ],
};

const toAlbumsArray = (obj) =>
  Object.entries(obj).map(([name, photos], idx) => ({
    id: String(idx + 1),
    name,
    photos,
  }));

export default function AlbumsScreen({ navigation }) {
  const [albums, setAlbums] = useState(() => toAlbumsArray(seed));
  const [activeAlbumId, setActiveAlbumId] = useState(albums[0]?.id);
  const [pickerBusy, setPickerBusy] = useState(false);

  // crear álbum personalizado
  const [showCreate, setShowCreate] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  // visor de foto
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState(null);

  const activeAlbum = useMemo(
    () => albums.find(a => a.id === activeAlbumId),
    [albums, activeAlbumId]
  );

  // Grid tipo Pinterest (balancea por altura)
  const columns = useMemo(() => {
    const heights = Array(COLS).fill(0);
    const cols = Array(COLS).fill(0).map(() => []);
    (activeAlbum?.photos ?? []).forEach(p => {
      const ratio = p.h && p.w ? p.h / p.w : 1.4; // fallback si no hay dimensiones
      const calcH = COL_W * ratio;
      const target = heights.indexOf(Math.min(...heights));
      cols[target].push({ ...p, _h: calcH });
      heights[target] += calcH + GUTTER;
    });
    return cols;
  }, [activeAlbum]);

  const pickImages = useCallback(async () => {
    try {
      setPickerBusy(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Necesito acceso a tu galería para subir fotos.');
        return;
      }

      // Nota: en algunos entornos allowsMultipleSelection no está disponible.
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled) return;

      const assets = result.assets || [];
      if (!assets.length) return;

      setAlbums(prev =>
        prev.map(a => {
          if (a.id !== activeAlbumId) return a;
          const newPhotos = assets.map((as, i) => ({
            id: `${Date.now()}_${i}`,
            uri: as.uri,
            w: as.width || 800,
            h: as.height || 1200,
            title: 'Foto',
            fav: false,
          }));
          return { ...a, photos: [...newPhotos, ...(a.photos || [])] };
        })
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudieron cargar las fotos.');
    } finally {
      setPickerBusy(false);
    }
  }, [activeAlbumId]);

  const createAlbum = useCallback(() => {
    const name = (newAlbumName || '').trim();
    if (!name) return;
    setAlbums(prev => [{ id: `${Date.now()}`, name, photos: [] }, ...prev]);
    setActiveAlbumId(`${Date.now()}`); // opcional: auto-seleccionar
    setNewAlbumName('');
    setShowCreate(false);
  }, [newAlbumName]);

  const toggleFav = useCallback((photoId) => {
    setAlbums(prev =>
      prev.map(a =>
        a.id !== activeAlbumId
          ? a
          : { ...a, photos: a.photos.map(p => p.id === photoId ? { ...p, fav: !p.fav } : p) }
      )
    );
  }, [activeAlbumId]);

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
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Necesito permiso para guardar en tu galería.');
        return;
      }
      const fileUri = FileSystem.documentDirectory + `${photo.id}.jpg`;
      const { uri } = await FileSystem.downloadAsync(photo.uri, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Descargada', 'La foto se guardó en tu galería.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo descargar la foto.');
    }
  }, []);

  const openViewer = (p) => {
    setViewerPhoto(p);
    setViewerOpen(true);
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={24} color="#6F4C8C" />
        </TouchableOpacity>
        <Text style={styles.title}>Galeriq</Text>
        <TouchableOpacity onPress={shareAlbum}>
          <Ionicons name="share-outline" size={22} color="#6F4C8C" />
        </TouchableOpacity>
        
      </View>
    <Text style={styles.titleSection}>Fotos</Text>
      {/* Chips de categorías + crear álbum */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        contentInsetAdjustmentBehavior="never"   // ← evita insets automáticos
  style={{ flexGrow: 0 }}
      >
        {albums.map((a) => {
          const active = a.id === activeAlbumId;
          return (
            <TouchableOpacity
              key={a.id}
              onPress={() => setActiveAlbumId(a.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {a.name}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.chipOutline} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={18} color="#6F4C8C" />
          <Text style={styles.chipOutlineText}>Nuevo álbum</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Grid tipo Pinterest */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 0 }}>
        <View style={styles.masonryRow}>
          {columns.map((col, i) => (
            <View key={`col-${i}`} style={{ width: COL_W }}>
              {col.map((p) => (
                <View key={p.id} style={{ marginBottom: GUTTER }}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => openViewer(p)} style={styles.card}>
                    <Image source={{ uri: p.uri }} style={{ width: '100%', height: p._h, borderRadius: 12 }} />
                    {/* Fav */}
                    <TouchableOpacity
                      style={styles.favBtn}
                      onPress={() => toggleFav(p.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name={p.fav ? 'heart' : 'heart-outline'} size={20} color={p.fav ? '#E11D48' : '#fff'} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  <Text style={styles.caption} numberOfLines={1}>{p.title || 'Foto'}</Text>

                  {/* Acciones rápidas */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.action} onPress={() => sharePhoto(p)}>
                      <Ionicons name="share-social-outline" size={16} color="#6F4C8C" />
                      <Text style={styles.actionText}>Compartir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.action} onPress={() => downloadPhoto(p)}>
                      <Ionicons name="download-outline" size={16} color="#6F4C8C" />
                      <Text style={styles.actionText}>Descargar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Botón Agregar fotos */}
        <TouchableOpacity style={styles.addButton} onPress={pickImages} disabled={pickerBusy}>
          {pickerBusy ? (
            <ActivityIndicator />
          ) : (
            <>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.addText}>Agregar fotos</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal crear álbum */}
      <Modal visible={showCreate} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Crear álbum</Text>
            <TextInput
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              placeholder="Nombre del álbum"
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#E5E7EB' }]} onPress={() => setShowCreate(false)}>
                <Text style={[styles.btnText, { color: '#111827' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#6F4C8C' }]}
                onPress={createAlbum}
                disabled={!newAlbumName.trim()}
              >
                <Text style={styles.btnText}>Crear</Text>
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
                  <Text style={styles.viewerActionTxt}>Favorito</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => sharePhoto(viewerPhoto)} style={styles.viewerActionBtn}>
                  <Ionicons name="share-social-outline" size={22} color="#fff" />
                  <Text style={styles.viewerActionTxt}>Compartir</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => downloadPhoto(viewerPhoto)} style={styles.viewerActionBtn}>
                  <Ionicons name="download-outline" size={22} color="#fff" />
                  <Text style={styles.viewerActionTxt}>Descargar</Text>
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

  viewerBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 40, right: 20, padding: 8 },
  viewerImage: { width: SCREEN_W, height: '70%' },
  viewerActions: { position: 'absolute', bottom: 40, flexDirection: 'row', gap: 24 },
  viewerActionBtn: { alignItems: 'center' },
  viewerActionTxt: { color: '#fff', marginTop: 6, fontWeight: '600' },

  btn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
