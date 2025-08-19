// src/screens/PortadaAlbumsScreens.js
import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList,
  Image, TextInput, Modal, Alert, Platform, RefreshControl, ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'http://143.198.138.35:8000'; 

const CARD_RADIUS = 14;

export default function PortadaAlbumsScreens({ navigation, route }) {
  const { eventId } = route.params || {};
  const { user } = useContext(AuthContext);
  const token = user?.token || user?.accessToken || '';

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [albums, setAlbums] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCover, setNewCover] = useState(null);
  const [creating, setCreating] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAlbum, setMenuAlbum] = useState(null); 
  const [updatingCover, setUpdatingCover] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return albums;
    return albums.filter(a => a.name.toLowerCase().includes(query.trim().toLowerCase()));
  }, [albums, query]);

  const ensurePermission = async (fromCamera) => {
    if (fromCamera) {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      return cam.status === 'granted';
    } else {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return lib.status === 'granted';
    }
  };

  const pickImage = async (fromCamera = false) => {
    const ok = await ensurePermission(fromCamera);
    if (!ok) {
      Alert.alert('Permiso requerido', fromCamera ? 'Habilita la cámara.' : 'Habilita el acceso a fotos.');
      return null;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsMultipleSelection: false });

    if (result?.canceled) return null;
    return result.assets?.[0]?.uri ?? null;
  };

  
  const probePhotoCount = async (albumId) => {
   
    const paths = [
      `${API_URL}/albums/${albumId}/photos/count`,
      `${API_URL}/photos/album/${albumId}/count`,
      `${API_URL}/albums/${albumId}/photos`,
      `${API_URL}/photos/album/${albumId}`,
      `${API_URL}/photos?album_id=${albumId}`,
    ];

    for (const url of paths) {
      try {
        const r = await fetch(url, { headers: { ...authHeaders } });
        if (!r.ok) continue;
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await r.json();
          if (typeof data?.count === 'number') return data.count;
          if (Array.isArray(data)) return data.length;
          if (Array.isArray(data?.items)) return data.items.length;
          if (Array.isArray(data?.photos)) return data.photos.length;
          if (Array.isArray(data?.data)) return data.data.length;
        }
      } catch { /* continua */ }
    }
    return 0;
  };

  const fetchAlbums = useCallback(async () => {
    if (!eventId || !token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/albums/${eventId}`, { headers: { ...authHeaders } });
      if (!r.ok) throw new Error('No se pudo obtener los álbumes');
      const raw = await r.json();

      const base = (raw || []).map(a => {
        const id = a.album_id ?? a.id ?? a.albumId ?? a?.album_id;
        const initialCount = Number(a?.photos_count ?? a?.photo_count);
        return {
          id: String(id),
          name: a.name,
          coverUri: a.cover_url || a.coverUrl || null,
          photosCount: Number.isFinite(initialCount) ? initialCount : null, 
          raw: a,
        };
      });

      const needCount = base.filter(b => b.photosCount === null);

      const results = await Promise.allSettled(needCount.map(b => probePhotoCount(b.id)));

      const withCounts = base.map(b => {
        if (b.photosCount !== null) return b;
        const i = needCount.findIndex(n => n.id === b.id);
        const count = results[i]?.status === 'fulfilled' ? results[i].value : 0;
        return { ...b, photosCount: count };
      });

      setAlbums(withCounts);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudieron cargar los álbumes.');
    } finally {
      setLoading(false);
    }
  }, [API_URL, eventId, token]);

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlbums();
    setRefreshing(false);
  }, [fetchAlbums]);

  const saveAlbum = async () => {
    if (!newName.trim()) return Alert.alert('Falta el nombre', 'Escribe un nombre para el álbum.');
    if (!newCover) return Alert.alert('Falta la portada', 'Elige una foto de portada.');
    if (!eventId) return Alert.alert('Sin evento', 'Falta el eventId para crear el álbum.');

    try {
      setCreating(true);
      const form = new FormData();
      const filename = newCover.split('/').pop() || `cover_${Date.now()}.jpg`;

      form.append('name', newName.trim());
      form.append('event_id', String(eventId));
      form.append('cover_url', { uri: newCover, name: filename, type: 'image/jpeg' });

      const r = await fetch(`${API_URL}/albums/`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: form, 
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || 'No se pudo crear el álbum.');
      }

      setCreateOpen(false);
      setNewName(''); setNewCover(null);
      await fetchAlbums();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo crear el álbum.');
    } finally {
      setCreating(false);
    }
  };

  const patchCover = async (albumId, fileUri) => {
    try {
      setUpdatingCover(true);
      const form = new FormData();
      const filename = fileUri.split('/').pop() || `cover_${Date.now()}.jpg`;
      form.append('file', { uri: fileUri, name: filename, type: 'image/jpeg' });

      const r = await fetch(`${API_URL}/albums/${albumId}/cover`, {
        method: 'PATCH',
        headers: { ...authHeaders },
        body: form,
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || 'No se pudo actualizar la portada.');
      }
      setMenuOpen(false);
      setMenuAlbum(null);
      await fetchAlbums();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo actualizar la portada.');
    } finally {
      setUpdatingCover(false);
    }
  };

  const onChangeCoverFrom = async (fromCamera) => {
    if (!menuAlbum) return;
    const uri = await pickImage(fromCamera);
    if (!uri) return;
    await patchCover(menuAlbum.id, uri);
  };

  const AlbumCard = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Albums', {
          albumId: item.id, albumName: item.name, coverUrl: item.coverUri, eventId
        })}
      >
        <Image source={{ uri: item.coverUri }} style={styles.cover} />
      </TouchableOpacity>

      {/* Botón contextual (3 puntos) */}
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => { setMenuAlbum(item); setMenuOpen(true); }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.cardSubtitle}>
        {Number.isFinite(item.photosCount) ? `${item.photosCount} fotos` : '...'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Galeriq</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} style={{ marginRight: 6 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar"
          placeholderTextColor="#999"
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} />
          </TouchableOpacity>
        )}
      </View>

      {/* Grid */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => <AlbumCard item={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={{ padding: 32, alignItems: 'center' }}><Text style={{ color: '#666' }}>Aún no hay álbumes.</Text></View>}
        />
      )}

      {/* Botón crear */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.createText}>Crear álbum</Text>
        </TouchableOpacity>
      </View>

      {/* Modal crear */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo álbum</Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput value={newName} onChangeText={setNewName} placeholder="Ej. Preparativos" style={styles.input} />

            <Text style={[styles.label, { marginTop: 12 }]}>Portada</Text>
            <TouchableOpacity style={styles.coverPicker} activeOpacity={0.9} onPress={async () => {
              const uri = await pickImage(false); if (uri) setNewCover(uri);
            }}>
              {newCover ? (
                <Image source={{ uri: newCover }} style={styles.coverPreview} />
              ) : (
                <View style={styles.coverEmpty}>
                  <Ionicons name="image-outline" size={28} />
                  <Text style={{ marginTop: 6, color: '#666' }}>Selecciona una imagen</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.row}>
              <TouchableOpacity style={[styles.smallBtn, { flex: 1 }]} onPress={async () => {
                const uri = await pickImage(false); if (uri) setNewCover(uri);
              }}>
                <Ionicons name="images-outline" size={18} color="#fff" />
                <Text style={styles.smallBtnText}>Galería</Text>
              </TouchableOpacity>

              <View style={{ width: 10 }} />

              <TouchableOpacity style={[styles.smallBtn, { flex: 1 }]} onPress={async () => {
                const uri = await pickImage(true); if (uri) setNewCover(uri);
              }}>
                <Ionicons name="camera-outline" size={18} color="#fff" />
                <Text style={styles.smallBtnText}>Cámara</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.row, { marginTop: 14 }]}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#efeff4' }]}
                onPress={() => { setCreateOpen(false); setNewName(''); setNewCover(null); }}
                disabled={creating}
              >
                <Text style={[styles.actionText, { color: '#333' }]}>Cancelar</Text>
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity style={styles.actionBtn} onPress={saveAlbum} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Menú contextual cambiar portada */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.menuBackdrop}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>{menuAlbum?.name}</Text>

            <TouchableOpacity style={styles.menuItem} disabled={updatingCover} onPress={() => onChangeCoverFrom(false)}>
              <Ionicons name="images-outline" size={18} />
              <Text style={styles.menuText}>Cambiar portada desde galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} disabled={updatingCover} onPress={() => onChangeCoverFrom(true)}>
              <Ionicons name="camera-outline" size={18} />
              <Text style={styles.menuText}>Cambiar portada desde cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { justifyContent: 'center' }]} onPress={() => { setMenuOpen(false); setMenuAlbum(null); }}>
              <Text style={[styles.menuText, { fontWeight: '700' }]}>Cancelar</Text>
            </TouchableOpacity>

            {updatingCover && <ActivityIndicator style={{ marginTop: 10 }} />}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 8 : 0, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 22,
  },
  backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600' },

  searchBox: {
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, height: 40,
    borderRadius: 12, backgroundColor: '#f3f3f6', flexDirection: 'row', alignItems: 'center',
  },
  searchInput: { flex: 1, fontSize: 15 },

  grid: { paddingHorizontal: 12, paddingBottom: 90 },

  card: { flex: 1, margin: 6, borderRadius: CARD_RADIUS },
  cover: { width: '100%', aspectRatio: 1.1, borderRadius: CARD_RADIUS, backgroundColor: '#eee' },
  menuBtn: {
    position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { marginTop: 6, fontSize: 14, fontWeight: '600' },
  cardSubtitle: { marginTop: 2, fontSize: 12, color: '#666' },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 12, backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e7e7ee', marginBottom: 28,
  },
  createBtn: {
    height: 48, borderRadius: 12, backgroundColor: '#c9b3e6',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  createText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 6 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, color: '#666', marginBottom: 6 },
  input: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', paddingHorizontal: 12, fontSize: 15, backgroundColor: '#fafafa' },
  coverPicker: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f3' },
  coverPreview: { width: '100%', height: 180 },
  coverEmpty: { height: 180, alignItems: 'center', justifyContent: 'center' },
  row: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  smallBtn: {
    height: 42, borderRadius: 10, backgroundColor: '#c9b3e6',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },
  smallBtnText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  actionBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#7c5fbd', alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  menuCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  menuTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  menuText: { fontSize: 15 },
});
