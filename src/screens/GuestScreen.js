// src/screens/GuestScreen.js
import React, { useEffect, useState, useCallback, useContext } from 'react';
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
  Alert,
} from 'react-native';
import { List, FAB, Snackbar, Text, Portal, Provider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const onLongPressGuest = (guest) => {
    Alert.alert(
      'Acciones del invitado',
      `¿Qué deseas hacer con ${guest.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar (dueño)',
          onPress: async () => {
            try {
              const ok = await acceptGuest(guest.id);
              if (!ok) throw new Error('Respuesta false');
              await loadGuests();
              setSnackbarMsg('Invitado aceptado por el dueño');
              setSnackbarVisible(true);
            } catch (e) {
              console.error(e);
              setSnackbarMsg('No se pudo aceptar al invitado');
              setSnackbarVisible(true);
            }
          },
        },
        {
          text: 'Rechazar (dueño)',
          style: 'destructive',
          onPress: async () => {
            try {
              const ok = await rejectGuest(guest.id);
              if (!ok) throw new Error('Respuesta false');
              await loadGuests();
              setSnackbarMsg('Invitado rechazado por el dueño');
              setSnackbarVisible(true);
            } catch (e) {
              console.error(e);
              setSnackbarMsg('No se pudo rechazar al invitado');
              setSnackbarVisible(true);
            }
          },
        },
      ]
    );
  };

  const confirmedCount = guests.filter((g) => g.status === 'confirmed').length;
  const pendingCount = guests.filter((g) => g.status === 'pending').length;
  const rejectedCount = guests.filter((g) => g.status === 'rejected').length;
  const totalCount = guests.length;

  return (
    <Provider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Lista de invitados</Text>

        <View style={styles.statusBar}>
          <Pressable style={[styles.statusBox, { backgroundColor: 'blue' }]} onPress={() => setFilter('all')}>
            <Text style={styles.statusText}>👥 {totalCount}</Text>
          </Pressable>
          <Pressable style={[styles.statusBox, { backgroundColor: 'green' }]} onPress={() => setFilter('confirmed')}>
            <Text style={styles.statusText}>✅ {confirmedCount}</Text>
          </Pressable>
          <Pressable style={[styles.statusBox, { backgroundColor: 'orange' }]} onPress={() => setFilter('pending')}>
            <Text style={styles.statusText}>⏳ {pendingCount}</Text>
          </Pressable>
          <Pressable style={[styles.statusBox, { backgroundColor: 'red' }]} onPress={() => setFilter('rejected')}>
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
              <Pressable onLongPress={() => onLongPressGuest(item)}>
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
                    <Pressable onPress={() => toggleStatus(item)}>
                      <List.Icon icon={getStatusIcon(item.status)} color={getStatusColor(item.status)} />
                    </Pressable>
                  )}
                />
              </Pressable>
            )}
          />
        )}

        <Portal>
          <FAB.Group
            open={fabOpen}
            icon={fabOpen ? 'close' : 'plus'}
            actions={[
              { icon: 'account-plus', label: 'Agregar Manualmente', onPress: () => navigation.navigate('AddGuestManual', { eventId }) },
              { icon: 'file-upload', label: 'Subir CSV', onPress: () => navigation.navigate('AddGuestFromCSV', { eventId }) },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
            visible={true}
          />
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
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  statusBox: { flex: 1, padding: 8, borderRadius: 8 },
  statusText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
