// src/screens/PortadaAlbumsScreens.js
import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList,
  Image, TextInput, Modal, Alert, Platform, RefreshControl, ActivityIndicator, Animated
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'http://143.198.138.35:8000';

const CARD_RADIUS = 14;

const PHOTO_COUNT_URL   = (albumId) => `${API_URL}/photos/album/${albumId}/count`;
const ALBUM_BY_ID_URL   = (albumId) => `${API_URL}/albums/get_one/${albumId}`;
const ALBUMS_BY_EVENT   = (eventId) => `${API_URL}/albums/${eventId}`;
const DELETE_ALBUM_URL  = (albumId) => `${API_URL}/albums/${albumId}`;

function toLocalTimeLabel(hms) {
  if (!hms || typeof hms !== 'string') return null;
  const [hh, mm = '00', ss = '00'] = hms.split(':');
  const h = Number(hh), m = Number(mm), s = Number(ss);
  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) return null;

  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s));
  try {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}`;
  }
}

function pickTimesFromObject(obj) {
  if (!obj || typeof obj !== 'object') return { start: null, end: null };
  const s = obj.start_time ?? obj.startTime ?? obj.start ?? null;
  const e = obj.end_time   ?? obj.endTime   ?? obj.end   ?? null;
  return { start: typeof s === 'string' ? s : null, end: typeof e === 'string' ? e : null };
}

function extractTimes(albumTime) {
  if (albumTime && !Array.isArray(albumTime) && typeof albumTime === 'object') {
    const { start, end } = pickTimesFromObject(albumTime);
    return { startRaw: start, endRaw: end };
  }
  if (Array.isArray(albumTime)) {
    let minStart = null;
    let maxEnd   = null;
    for (const item of albumTime) {
      const { start, end } = pickTimesFromObject(item);
      if (start && /^\d{2}:\d{2}(:\d{2})?$/.test(start)) {
        if (minStart === null || start < minStart) minStart = start;
      }
      if (end && /^\d{2}:\d{2}(:\d{2})?$/.test(end)) {
        if (maxEnd === null || end > maxEnd) maxEnd = end;
      }
    }
    return { startRaw: minStart, endRaw: maxEnd };
  }
  return { startRaw: null, endRaw: null };
}

function isAllDayTimes(start, end) {
  const s = (start || '').trim();
  const e = (end || '').trim();
  return (s === '00:00:00' && (e === '23:59:59' || e === '23:59:00' || e === '23:59')) ||
         (s === '00:00'    && (e === '23:59'));
}

export default function PortadaAlbumsScreens({ navigation, route }) {
  const { eventId } = route.params || {};
  const { user } = useContext(AuthContext);

  const token = user?.token || user?.access_token || user?.accessToken || '';
  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

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

  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const toastY = useState(new Animated.Value(-60))[0];
  const toastOpacity = useState(new Animated.Value(0))[0];

  const [deletingId, setDeletingId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    Animated.parallel([
      Animated.timing(toastY, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastY, { toValue: -60, duration: 220, useNativeDriver: true }),
          Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start();
      }, 1500);
    });
  };

  const toRoleNumber = (data) => {
    if (typeof data === 'number') return data;
    if (typeof data === 'string') {
      const n = parseInt(data, 10);
      return Number.isFinite(n) ? n : null;
    }
    if (data && typeof data === 'object') {
      if (data.role_id != null) return parseInt(String(data.role_id), 10);
      if (data.role != null) return parseInt(String(data.role), 10);
    }
    return null;
  };

  const fetchRole = useCallback(async (eid) => {
    if (!eid) return null;
    try {
      const res = await fetch(`${API_URL}/user/role?event_id=${encodeURIComponent(eid)}`, {
        headers: { ...authHeaders },
      });
      const raw = await res.text();
      if (!res.ok) throw new Error(raw || `HTTP ${res.status}`);
      let data; try { data = JSON.parse(raw); } catch { data = raw; }
      const r = toRoleNumber(data);
      if (r != null) return r;
      throw new Error('role parse error');
    } catch {
      try {
        const res2 = await fetch(`${API_URL}/user/role`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ event_id: String(eid) }).toString(),
        });
        const raw2 = await res2.text();
        if (!res2.ok) throw new Error(raw2 || `HTTP ${res2.status}`);
        let data2; try { data2 = JSON.parse(raw2); } catch { data2 = raw2; }
        return toRoleNumber(data2);
      } catch {
        return null;
      }
    }
  }, [authHeaders]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!eventId) return;
      setRoleLoading(true);
      const r = await fetchRole(eventId);
      if (mounted) { setRole(r); setRoleLoading(false); }
    })();
    return () => { mounted = false; };
  }, [eventId, fetchRole]);

  const isOwner = role === 1;

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

  const fetchCountsForAlbums = useCallback(async (list) => {
    if (!list?.length) return;
    const results = await Promise.allSettled(
      list.map(async (a) => {
        const r = await fetch(PHOTO_COUNT_URL(a.id), { headers: { ...authHeaders } });
        if (!r.ok) throw new Error('count error');
        const json = await r.json(); // { album_id, photo_count }
        return { id: String(a.id), count: Number(json?.photo_count ?? 0) };
      })
    );
    const byId = new Map();
    results.forEach(res => {
      if (res.status === 'fulfilled') byId.set(res.value.id, res.value.count);
    });
    setAlbums(prev =>
      prev.map(a => ({
        ...a,
        photosCount: byId.has(String(a.id)) ? byId.get(String(a.id)) : a.photosCount ?? null,
      }))
    );
  }, [authHeaders]);

  const fetchTimesForAlbums = useCallback(async (list) => {
    if (!list?.length) return;
    const results = await Promise.allSettled(
      list.map(async (a) => {
        const r = await fetch(ALBUM_BY_ID_URL(a.id), { headers: { ...authHeaders } });
        if (!r.ok) throw new Error('time error');
        const json = await r.json();

        const { startRaw, endRaw } = extractTimes(json?.album_time);
        const allDay = isAllDayTimes(startRaw, endRaw);

        return {
          id: String(a.id),
          startTimeRaw:   startRaw,
          endTimeRaw:     endRaw,
          startTimeLabel: allDay ? null : toLocalTimeLabel(startRaw),
          endTimeLabel:   allDay ? null : toLocalTimeLabel(endRaw),
        };
      })
    );

    const byId = new Map();
    results.forEach(res => {
      if (res.status === 'fulfilled') byId.set(res.value.id, res.value);
    });

    setAlbums(prev =>
      prev.map(a => {
        const t = byId.get(String(a.id));
        if (!t) return a;
        return {
          ...a,
          startTimeRaw:   t.startTimeRaw ?? null,
          endTimeRaw:     t.endTimeRaw ?? null,
          startTimeLabel: t.startTimeLabel ?? null,
          endTimeLabel:   t.endTimeLabel ?? null,
        };
      })
    );
  }, [authHeaders]);

  const fetchAlbums = useCallback(async () => {
    if (!eventId || !token) return;
    setLoading(true);
    try {
      const r = await fetch(ALBUMS_BY_EVENT(eventId), { headers: { ...authHeaders } });
      if (!r.ok) throw new Error('No se pudo obtener los álbumes');
      const raw = await r.json();

      const mapped = (raw || []).map(a => {
        const id = a.album_id ?? a.id ?? a.albumId;
        return {
          id: String(id),
          name: a.name,
          coverUri: a.cover_url || a.coverUrl || null,
          photosCount: null,
          startTimeRaw: null,
          endTimeRaw: null,
          startTimeLabel: null,
          endTimeLabel: null,
          raw: a,
        };
      });

      setAlbums(mapped);
      fetchCountsForAlbums(mapped);
      fetchTimesForAlbums(mapped);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudieron cargar los álbumes.');
    } finally {
      setLoading(false);
    }
  }, [eventId, token, authHeaders, fetchCountsForAlbums, fetchTimesForAlbums]);

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

  const confirmDelete = (album) => {
    if (!isOwner) return;
    if (album.photosCount !== 0) {
      Alert.alert('No se puede eliminar', 'Solo puedes eliminar álbumes vacíos.');
      return;
    }
    Alert.alert(
      'Eliminar álbum',
      `¿Seguro que quieres eliminar “${album.name}”? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteAlbum(album.id) },
      ]
    );
  };

  const deleteAlbum = async (albumId) => {
    try {
      setMenuOpen(false);
      setMenuAlbum(null);
      setDeletingId(albumId);
      const r = await fetch(DELETE_ALBUM_URL(albumId), {
        method: 'DELETE',
        headers: { ...authHeaders },
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || 'No se pudo eliminar el álbum.');
      }
      setAlbums(prev => prev.filter(a => String(a.id) !== String(albumId)));
      showToast('Álbum eliminado', 'success');
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo eliminar el álbum.');
      showToast('Error al eliminar', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const AlbumCard = ({ item }) => {
    const hasTimes = !!(item.startTimeLabel && item.endTimeLabel);
    const isDeleting = String(deletingId) === String(item.id);
    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Albums', {
            albumId: item.id, albumName: item.name, coverUrl: item.coverUri, eventId
          })}
        >
          <Image source={{ uri: item.coverUri }} style={styles.cover} />
          {isDeleting && (
            <View style={styles.cardOverlay}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.overlayTxt}>Eliminando…</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => { setMenuAlbum(item); setMenuOpen(true); }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          disabled={isDeleting}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>

        {hasTimes && (
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={12} color="#555" style={{ marginRight: 4 }} />
            <Text style={styles.timeText} numberOfLines={1}>
              {item.startTimeLabel} — {item.endTimeLabel}
            </Text>
          </View>
        )}

        {Number.isFinite(item.photosCount) ? (
          <Text style={styles.cardSubtitle}>{`${item.photosCount} fotos`}</Text>
        ) : (
          <Text style={[styles.cardSubtitle, { color: '#aaa' }]}>—</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            transform: [{ translateY: toastY }],
            opacity: toastOpacity,
            backgroundColor: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
            borderColor: toast.type === 'error' ? '#fecaca' : '#bbf7d0',
          },
        ]}
      >
        <Ionicons
          name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
          size={18}
          color={toast.type === 'error' ? '#b91c1c' : '#16a34a'}
        />
        <Text style={[styles.toastTxt, { color: toast.type === 'error' ? '#7f1d1d' : '#166534' }]}>
          {toast.msg}
        </Text>
      </Animated.View>

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
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: '#666' }}>Aún no hay álbumes.</Text>
            </View>
          }
        />
      )}

      {/* Botón crear — oculto para invitados (rol 2) */}
      {isOwner && !roleLoading && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreateOpen(true)}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.createText}>Crear álbum</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal crear */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo álbum</Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput value={newName} onChangeText={setNewName} placeholder="Ej. Preparativos" style={styles.input} />

            <Text style={[styles.label, { marginTop: 12 }]}>Portada</Text>
            <TouchableOpacity
              style={styles.coverPicker}
              activeOpacity={0.9}
              onPress={async () => { const uri = await pickImage(false); if (uri) setNewCover(uri); }}
            >
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
              <TouchableOpacity
                style={[styles.smallBtn, { flex: 1 }]}
                onPress={async () => { const uri = await pickImage(false); if (uri) setNewCover(uri); }}
              >
                <Ionicons name="images-outline" size={18} color="#fff" />
                <Text style={styles.smallBtnText}>Galería</Text>
              </TouchableOpacity>

              <View style={{ width: 10 }} />

              <TouchableOpacity
                style={[styles.smallBtn, { flex: 1 }]}
                onPress={async () => { const uri = await pickImage(true); if (uri) setNewCover(uri); }}
              >
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

      {/* Menú contextual */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.menuBackdrop}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>{menuAlbum?.name}</Text>

            <TouchableOpacity style={styles.menuItem} disabled={updatingCover || !!deletingId} onPress={() => onChangeCoverFrom(false)}>
              <Ionicons name="images-outline" size={18} />
              <Text style={styles.menuText}>Cambiar portada desde galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} disabled={updatingCover || !!deletingId} onPress={() => onChangeCoverFrom(true)}>
              <Ionicons name="camera-outline" size={18} />
              <Text style={styles.menuText}>Cambiar portada desde cámara</Text>
            </TouchableOpacity>

            {/* Eliminar: solo propietario y álbum vacío */}
            {isOwner && menuAlbum?.photosCount === 0 && (
              <TouchableOpacity
                style={[styles.menuItem]}
                disabled={!!deletingId}
                onPress={() => confirmDelete(menuAlbum)}
              >
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                <Text style={[styles.menuText, { color: '#dc2626' }]}>Eliminar álbum</Text>
              </TouchableOpacity>
            )}

            {isOwner && Number(menuAlbum?.photosCount) > 0 && (
              <View style={[styles.menuItem, { opacity: 0.6 }]}>
                <Ionicons name="lock-closed-outline" size={18} />
                <Text style={styles.menuText}>No se puede eliminar (tiene fotos)</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.menuItem, { justifyContent: 'center' }]}
              onPress={() => { setMenuOpen(false); setMenuAlbum(null); }}
            >
              <Text style={[styles.menuText, { fontWeight: '700' }]}>Cancelar</Text>
            </TouchableOpacity>

            {(updatingCover || !!deletingId) && <ActivityIndicator style={{ marginTop: 10 }} />}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },

  toast: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    zIndex: 20,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  toastTxt: { fontWeight: '700', fontSize: 13 },

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

  grid: { paddingHorizontal: 12, paddingBottom: 120 },

  card: { flex: 1, margin: 6, borderRadius: CARD_RADIUS },
  cover: { width: '100%', aspectRatio: 1.1, borderRadius: CARD_RADIUS, backgroundColor: '#eee' },
  menuBtn: {
    position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },

  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CARD_RADIUS,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTxt: { marginTop: 6, color: '#fff', fontWeight: '700' },

  cardTitle: { fontSize: 14, fontWeight: '600', marginTop: 6, marginBottom: 2 },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
    backgroundColor: '#f1eff8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  timeText: { fontSize: 11, color: '#555' },

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
