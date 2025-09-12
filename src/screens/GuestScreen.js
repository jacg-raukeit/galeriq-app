import React, { useEffect, useState, useCallback, useContext, useRef, memo } from 'react';
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { List, FAB, Snackbar, Text, Portal, Provider } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';

import { SafeAreaView } from 'react-native-safe-area-context';
// Se importan los hooks desde la librería de navegación
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'http://143.198.138.35:8000';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'confirmed': return 'check-circle';
    case 'rejected': return 'close-circle';
    default: return 'clock-outline';
  }
};
const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed': return 'green';
    case 'rejected': return 'red';
    default: return 'orange';
  }
};
const mapRSVPToStatus = (rsvp) => {
  if (rsvp === 1 || rsvp === '1' || rsvp === 'accepted' || rsvp === 'confirmed') return 'confirmed';
  if (rsvp === 2 || rsvp === '2' || rsvp === 'rejected') return 'rejected';
  return 'pending';
};
const statusToCode = (status) => (status === 'confirmed' ? 1 : status === 'rejected' ? 2 : 0);

const adaptGuest = (g) => ({
  id: g.guest_id ?? g.id,
  nombre: g.full_name ?? g.name ?? '',
  correo: g.email ?? '',
  telefono: g.phone ?? g.telefono ?? '',
  alias: g.alias ?? '',
  status: mapRSVPToStatus(g.rsvp_status ?? g.status),
  avatar: g.avatar_url ?? g.avatar ?? '',
});

/** ===== Fila con Swipe (usa hooks aquí, no en renderItem) ===== */
const ACTION_WIDTH = 96;

const GuestRow = memo(function GuestRow({ item, onToggleStatus, onRequestDelete }) {
  const swipeRef = useRef(null);

  const confirmDelete = () => {
    Alert.alert(
      'Confirmar eliminación',
      `Esta acción eliminará a ${item.nombre} de la lista. ¿Deseas continuar?`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => swipeRef.current?.close?.() },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await onRequestDelete(item.id);
            swipeRef.current?.close?.();
          },
        },
      ]
    );
  };

  const RightActions = () => (
    <View style={styles.rightActions}>
      <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete} activeOpacity={0.85}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.deleteText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={RightActions}
      overshootRight={false}
    >
      <Pressable>
        <List.Item
          title={item.nombre}
          description={item.alias || item.correo || item.telefono}
          left={() => (
            <Image
              source={item.avatar ? { uri: item.avatar } : require('../assets/images/google.png')}
              style={styles.avatar}
            />
          )}
          right={() => (
            <Pressable onPress={() => onToggleStatus(item)}>
              <List.Icon icon={getStatusIcon(item.status)} color={getStatusColor(item.status)} />
            </Pressable>
          )}
        />
      </Pressable>
    </Swipeable>
  );
});

export default function GuestScreen({ route }) {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { eventId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [filter, setFilter] = useState('all');

  const [fabOpen, setFabOpen] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const token = user?.token || user?.accessToken || '';

  const applyFilter = useCallback((filterStatus, dataList) => {
    if (filterStatus === 'all') setFilteredGuests(dataList);
    else setFilteredGuests(dataList.filter((g) => g.status === filterStatus));
  }, []);

  const fetchGuestsFromAPI = useCallback(async () => {
    if (!eventId) throw new Error('Falta eventId');
    const url = `${API_URL}/guests/event/${eventId}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`Error ${resp.status}: ${t || 'No se pudieron obtener los invitados'}`);
    }
    const json = await resp.json();
    return Array.isArray(json) ? json.map(adaptGuest) : [];
  }, [eventId, token]);

  const loadGuests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGuestsFromAPI();
      setGuests(data);
    } catch (e) {
      console.log('Error cargando invitados', e);
      setSnackbarMsg('Error al obtener invitados del servidor');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  }, [fetchGuestsFromAPI]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => { if (active) await loadGuests(); })();
      return () => { active = false; };
    }, [loadGuests])
  );

  useEffect(() => {
    applyFilter(filter, guests);
  }, [filter, guests, applyFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGuests();
    setRefreshing(false);
  };

  const updateGuestRSVP = async (guestId, rsvpCode) => {
    const url = `${API_URL}/guests/${guestId}/rsvp`;
    const body = new FormData();
    body.append('rsvp_status', String(rsvpCode));
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body,
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`RSVP falló (${resp.status}): ${t}`);
    }
    return resp.json();
  };

  const acceptGuest = async (guestId) => {
    const url = `${API_URL}/guests/${guestId}/accept`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`Aceptar falló (${resp.status}): ${t}`);
    }
    return resp.json();
  };

  const rejectGuest = async (guestId) => {
    const url = `${API_URL}/guests/${guestId}/reject`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`Rechazar falló (${resp.status}): ${t}`);
    }
    return resp.json();
  };

  const deleteGuest = async (guestId) => {
    const url = `${API_URL}/guests/${guestId}`;
    const resp = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`Eliminar falló (${resp.status}): ${t || 'No se pudo eliminar invitado'}`);
    }
    try { await resp.json(); } catch (_) {}
    return true;
  };

  const toggleStatus = async (guest) => {
    const next =
      guest.status === 'pending' ? 'confirmed' :
      guest.status === 'confirmed' ? 'rejected' : 'pending';
    try {
      await updateGuestRSVP(guest.id, statusToCode(next));
      await loadGuests();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const estadoEsp = next === 'confirmed' ? 'Confirmado' : next === 'rejected' ? 'Rechazado' : 'Pendiente';
      setSnackbarMsg(`RSVP actualizado: ${estadoEsp}`);
      setSnackbarVisible(true);
    } catch (e) {
      console.error(e);
      setSnackbarMsg('No se pudo actualizar RSVP');
      setSnackbarVisible(true);
    }
  };

  const handleDelete = async (guestId) => {
    try {
      await deleteGuest(guestId);
      setGuests((prev) => {
        const next = prev.filter((g) => g.id !== guestId);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        return next;
      });
      setSnackbarMsg('Invitado eliminado');
      setSnackbarVisible(true);
    } catch (e) {
      console.error(e);
      setSnackbarMsg('No se pudo eliminar al invitado');
      setSnackbarVisible(true);
    }
  };

  const confirmedCount = guests.filter((g) => g.status === 'confirmed').length;
  const pendingCount = guests.filter((g) => g.status === 'pending').length;
  const rejectedCount = guests.filter((g) => g.status === 'rejected').length;
  const totalCount = guests.length;

  return (
    <Provider>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#254236" />
        </TouchableOpacity>
        <Text style={styles.title}>Lista de invitados</Text>

        <View style={styles.statusBar}>
          <Pressable style={[styles.statusBox, { backgroundColor: '#093FB4' }]} onPress={() => setFilter('all')}>
            <Text style={styles.statusText}>👥 {totalCount}</Text>
          </Pressable>
          <Pressable style={[styles.statusBox, { backgroundColor: '#78C841' }]} onPress={() => setFilter('confirmed')}>
            <Text style={styles.statusText}>✅ {confirmedCount}</Text>
          </Pressable>
          <Pressable style={[styles.statusBox, { backgroundColor: '#FFCC00' }]} onPress={() => setFilter('pending')}>
            <Text style={styles.statusText}>⏳ {pendingCount}</Text>
          </Pressable>
          <Pressable style={[styles.statusBox, { backgroundColor: '#EA2264' }]} onPress={() => setFilter('rejected')}>
            <Text style={styles.statusText}>❌ {rejectedCount}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8 }}>Cargando invitados...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredGuests}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <GuestRow
                item={item}
                onToggleStatus={toggleStatus}
                onRequestDelete={handleDelete}
              />
            )}
          />
        )}

        <Portal>
          {fabOpen && (
            <Pressable style={styles.backdrop} onPress={() => setFabOpen(false)} />
          )}

          <View style={styles.fabContainer} pointerEvents="box-none">
            <FAB.Group
              open={fabOpen}
              icon={fabOpen ? 'close' : 'plus'}
              actions={[
                { icon: 'account-plus', label: 'Agregar Manualmente', onPress: () => navigation.navigate('AddGuestManual', { eventId }) },
                { icon: 'file-upload', label: 'Subir CSV', onPress: () => navigation.navigate('AddGuestFromCSV', { eventId }) },
              ]}
              onStateChange={({ open }) => setFabOpen(open)}
              visible={true}
              fabStyle={styles.fabButton}
            />
          </View>
        </Portal>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={2200}
          action={{ label: 'OK', onPress: () => setSnackbarVisible(false) }}>
          {snackbarMsg}
        </Snackbar>
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, marginTop: 8, color: '#254236' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  statusBox: { flex: 1, padding: 8, borderRadius: 8 },
  statusText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  rightActions: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E11D48',
    marginVertical: 4,
    borderRadius: 8,
  },
  deleteButton: {
    width: ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  deleteText: { color: '#fff', fontWeight: 'bold', marginTop: 4 },

  fabContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingBottom: 80,
  },
  fabButton: {
    backgroundColor: '#5E35B1',
    borderRadius: 28,
    height: 56,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 80,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

