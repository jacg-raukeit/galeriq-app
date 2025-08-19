// src/screens/EventDetailScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'http://143.198.138.35:8000';

const EVENT_TYPES = [
  'Boda',
  'Cumpleaños',
  'XV Anos',
  'Graduacion',
  'Bautizo',
  'Evento Corporativo',
  'Otro',
];

export default function EventDetailScreen() {
  const navigation = useNavigation();
  const { event: initialEvent } = useRoute().params;
  const { user } = useContext(AuthContext);

  const [editVisible, setEditVisible] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [ownerVisible, setOwnerVisible] = useState(false);

  const [eventData, setEventData] = useState(null);

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventAddress, setEventAddress] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [coverUri, setCoverUri] = useState(null);

  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [isOtherType, setIsOtherType] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    if (initialEvent) {
      setEventData(initialEvent);
      setEventName(initialEvent.event_name);
      setEventDate(new Date(initialEvent.event_date));
      setEventAddress(initialEvent.event_address);
      setEventType(initialEvent.event_type);
      setEventDescription(initialEvent.event_description || '');
      setCoverUri(initialEvent.event_cover);

      const inList = EVENT_TYPES.includes(initialEvent.event_type);
      setIsOtherType(!inList || initialEvent.event_type === 'Otro');
    }
  }, [initialEvent]);

  useEffect(() => {
    if (editVisible) {
      const inList = EVENT_TYPES.includes(eventType);
      setIsOtherType(!inList || eventType === 'Otro');
    }
  }, [editVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se requieren permisos para acceder a la galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se requieren permisos para usar la cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const onChangeDate = (_, selectedDate) => {
    if (Platform.OS === 'ios') setShowDatePicker(false);
    if (selectedDate) setEventDate(selectedDate);
  };

  const openDateTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: eventDate,
        onChange: onChangeDate,
        mode: 'datetime',
        is24Hour: true,
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const handleUpdate = async () => {
    // Validación opcional: si elige "Otro" exige que escriba algo
    if (isOtherType && !eventType.trim()) {
      Alert.alert('Tipo de evento', 'Escribe el tipo de evento cuando selecciones "Otro".');
      return;
    }

    try {
      const form = new FormData();
      form.append('event_name', eventName);
      form.append('event_date', eventDate.toISOString());
      form.append('event_address', eventAddress);
      form.append('event_type', eventType);
      form.append('event_description', eventDescription);

      let res = await fetch(`${API_URL}/events/${initialEvent.event_id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();

      if (coverUri && !String(coverUri).startsWith('http')) {
        const coverForm = new FormData();
        const filename = coverUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const mime = match ? `image/${match[1]}` : 'image/jpeg';
        coverForm.append('event_cover', { uri: coverUri, name: filename, type: mime });

        let coverRes = await fetch(`${API_URL}/events/${initialEvent.event_id}/cover`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${user.token}` },
          body: coverForm,
        });
        if (!coverRes.ok) throw new Error(await coverRes.text());
        const coverData = await coverRes.json();
        updated.event_cover = coverData.event_cover;
      }

      setEventData(updated);
      setEditVisible(false);
    } catch (err) {
      console.error('Error al actualizar evento:', err);
      Alert.alert('Error', 'No se pudo actualizar el evento.');
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const res = await fetch(`${API_URL}/user/all`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error listando usuarios:', e);
      Alert.alert('Error', 'No se pudieron cargar los usuarios.');
    } finally {
      setUsersLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (ownerVisible) {
      setSelectedUserId(null);
      setUserSearch('');
      fetchUsers();
    }
  }, [ownerVisible, fetchUsers]);

  const handleAssignOwner = async () => {
    if (!selectedUserId || !eventData?.event_id) return;
    try {
      const form = new FormData();
      form.append('user_id', String(selectedUserId));
      form.append('event_id', String(eventData.event_id));

      const res = await fetch(`${API_URL}/user/add-owner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());

      Alert.alert('Listo', 'Usuario agregado como owner.');
      setOwnerVisible(false);
    } catch (e) {
      console.error('Error asignando owner:', e);
      Alert.alert('Error', 'No se pudo asignar el usuario como owner.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    const name = (u.full_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  if (!eventData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Evento no encontrado.</Text>
      </View>
    );
  }

  const prettyDate = new Date(eventData.event_date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const prettyTime = new Date(eventData.event_date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {eventData.event_name}
          </Text>
          <TouchableOpacity onPress={() => setEditVisible(true)} style={styles.headerIcon}>
            <Ionicons name="pencil" size={22} color="#6F4C8C" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* CONTENIDO */}
      <ScrollView bounces contentContainerStyle={{ paddingBottom: 120 }}>
        {/* HERO PORTADA */}
        <View style={styles.heroWrapper}>
          <ImageBackground
            source={eventData.event_cover ? { uri: eventData.event_cover } : null}
            style={styles.hero}
            imageStyle={styles.heroImg}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroChips}>
                {!!eventData.event_type && (
                  <View style={[styles.chip, { backgroundColor: '#6F4C8C' }]}>
                    <Ionicons name="pricetag-outline" size={14} color="white" />
                    <Text style={[styles.chipText, { color: 'white' }]}>{eventData.event_type}</Text>
                  </View>
                )}
                {!!eventData.event_status && (
                  <View style={[styles.chip, { backgroundColor: '#254236' }]}>
                    <Ionicons name="ellipse-outline" size={12} color="white" />
                    <Text style={[styles.chipText, { color: 'white' }]}>{eventData.event_status}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.heroTitle} numberOfLines={2}>
                {eventData.event_name}
              </Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={16} color="#F9FAFB" />
                  <Text style={styles.metaText}>{prettyDate}</Text>
                </View>
                <View style={styles.dot} />
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#F9FAFB" />
                  <Text style={styles.metaText}>{prettyTime}</Text>
                </View>
              </View>

              {!!eventData.event_address && (
                <View style={[styles.metaItem, { marginTop: 6 }]}>
                  <Ionicons name="location-outline" size={16} color="#F9FAFB" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {eventData.event_address}
                  </Text>
                </View>
              )}
            </View>
          </ImageBackground>
        </View>

        {/* INFO SECTIONS */}
        <View style={styles.sectionCard}>
          <SectionTitle icon="document-text-outline" title="Descripción" />
          <Text style={styles.sectionText}>
            {eventData.event_description?.trim() || 'Sin descripción'}
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridCard}>
            <SectionTitle icon="id-card-outline" title="ID del evento" />
            <Text style={styles.gridValue}>{eventData.event_id}</Text>
          </View>

          <View style={styles.gridCard}>
            <SectionTitle icon="alarm-outline" title="Creado" />
            <Text style={styles.gridValue}>
              {new Date(eventData.created_at).toLocaleString('es-ES')}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionTitle icon="map-outline" title="Dirección" />
          <Text style={styles.sectionText}>{eventData.event_address || 'Sin dirección'}</Text>
        </View>
      </ScrollView>

      {/* FAB Acciones */}
      <TouchableOpacity style={styles.fab} onPress={() => setActionsVisible(true)} activeOpacity={0.9}>
        <Ionicons name="grid-outline" size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Acciones</Text>
      </TouchableOpacity>

      {/* SHEET Acciones */}
      <Modal visible={actionsVisible} transparent animationType="fade" onRequestClose={() => setActionsVisible(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setActionsVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Acciones del evento</Text>

          <ActionItem
            icon="checkmark-done-circle-outline"
            label="Ir a Planeación"
            onPress={() => {
              setActionsVisible(false);
              navigation.navigate('PlanningHome', { eventId: eventData.event_id });
            }}
          />
          <ActionItem
            icon="calendar-outline"
            label="Ir a Agenda"
            onPress={() => {
              setActionsVisible(false);
              navigation.navigate('Agenda', { eventId: eventData.event_id, eventDate: eventData.event_date });
            }}
          />
          <ActionItem
            icon="people-outline"
            label="Ir a Invitados"
            onPress={() => {
              setActionsVisible(false);
              navigation.navigate('GuestList', { eventId: eventData.event_id });
            }}
          />
          <ActionItem
            icon="images-outline"
            label="Ir a Álbumes"
            onPress={() => {
              setActionsVisible(false);
              navigation.navigate('PortadaAlbums', { eventId: eventData.event_id });
            }}
          />
          <ActionItem
            icon="images-outline"
            label="Ir a invitaciones"
            onPress={() => {
              setActionsVisible(false);
              navigation.navigate('InvitationsHome', { eventId: eventData.event_id });
            }}
          />
          <ActionItem
            icon="person-add-outline"
            label="Agregar owner"
            onPress={() => {
              setActionsVisible(false);
              setOwnerVisible(true);
            }}
          />
          <View style={{ height: 12 }} />
        </View>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal visible={editVisible} animationType="slide">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setEditVisible(false)}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Editar Evento</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalContainer}>
          {/* Cover Picker */}
          <View style={styles.coverPicker}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverPreview} />
            ) : (
              <View style={[styles.coverPreview, styles.coverPlaceholder]}>
                <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', marginTop: 6 }}>Seleccionar portada</Text>
              </View>
            )}
            <View style={styles.coverActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={pickImage}>
                <Ionicons name="images-outline" size={18} color="#254236" />
                <Text style={styles.iconBtnText}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={18} color="#254236" />
                <Text style={styles.iconBtnText}>Cámara</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Field label="Nombre">
            <TextInput
              style={styles.input}
              value={eventName}
              onChangeText={setEventName}
              placeholder="Ej. Boda de Ana y Luis"
            />
          </Field>

          <Field label="Fecha y hora">
            <TouchableOpacity style={styles.input} onPress={openDateTimePicker}>
              <Text>
                {eventDate.toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
            {Platform.OS === 'ios' && showDatePicker && (
              <DateTimePicker
                value={eventDate}
                mode="datetime"
                display="spinner"
                onChange={onChangeDate}
                minimumDate={new Date()}
              />
            )}
          </Field>

          <Field label="Dirección">
            <TextInput
              style={styles.input}
              value={eventAddress}
              onChangeText={setEventAddress}
              placeholder="Ej. Jardín El Roble, Cuernavaca"
            />
          </Field>

          {/* Tipo con selector y “Otro” */}
          <Field label="Tipo de evento">
            <TouchableOpacity
              style={styles.input}
              onPress={() => setTypePickerVisible(true)}
              activeOpacity={0.9}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: eventType ? '#111827' : '#9CA3AF' }}>
                  {eventType || 'Selecciona tipo'}
                </Text>
                <Ionicons name="chevron-down-outline" size={18} color="#6B7280" />
              </View>
            </TouchableOpacity>

            {isOtherType && (
              <>
                <Text style={styles.helperText}>Especifica el tipo de evento</Text>
                <TextInput
                  style={styles.input}
                  value={EVENT_TYPES.includes(eventType) ? '' : eventType}
                  onChangeText={setEventType}
                  placeholder="Escribe el tipo de evento"
                  autoCapitalize="sentences"
                />
              </>
            )}
          </Field>

          <Field label="Descripción">
            <TextInput
              style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
              multiline
              value={eventDescription}
              onChangeText={setEventDescription}
              placeholder="Detalles y notas del evento"
            />
          </Field>

          <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
            <Text style={styles.saveText}>Actualizar Evento</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* TYPE PICKER */}
      <Modal
        visible={typePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
        />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Selecciona el tipo de evento</Text>
            <TouchableOpacity onPress={() => setTypePickerVisible(false)}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          {EVENT_TYPES.map((opt) => {
            const selected =
              (!isOtherType && eventType === opt) || (opt === 'Otro' && isOtherType);
            return (
              <TouchableOpacity
                key={opt}
                style={styles.pickerRow}
                activeOpacity={0.85}
                onPress={() => {
                  if (opt === 'Otro') {
                    setIsOtherType(true);
                    if (EVENT_TYPES.includes(eventType)) {
                      setEventType('');
                    }
                  } else {
                    setIsOtherType(false);
                    setEventType(opt);
                  }
                  setTypePickerVisible(false);
                }}
              >
                <Text style={[styles.pickerText, selected && styles.pickerTextSelected]}>
                  {opt}
                </Text>
                {selected && <Ionicons name="checkmark" size={18} color="#6B21A8" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* MODAL OWNER */}
      <Modal visible={ownerVisible} animationType="slide" onRequestClose={() => setOwnerVisible(false)}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setOwnerVisible(false)}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Agregar owner</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.modalContainer}>
          <TextInput
            style={styles.input}
            placeholder="Buscar por nombre o email..."
            value={userSearch}
            onChangeText={setUserSearch}
          />

          {usersLoading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {filteredUsers.map((u) => {
                const selected = selectedUserId === u.user_id;
                return (
                  <TouchableOpacity
                    key={u.user_id}
                    style={styles.userRow}
                    onPress={() => setSelectedUserId(u.user_id)}
                    activeOpacity={0.9}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={selected ? '#254236' : '#9CA3AF'}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>{u.full_name || 'Sin nombre'}</Text>
                      <Text style={{ color: '#4B5563' }}>{u.email}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {filteredUsers.length === 0 && (
                <Text style={{ color: '#6B7280', marginTop: 12 }}>No hay usuarios que coincidan con la búsqueda.</Text>
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.saveButton, { opacity: selectedUserId ? 1 : 0.6, marginTop: 16 }]}
            disabled={!selectedUserId}
            onPress={handleAssignOwner}
          >
            <Text style={styles.saveText}>Asignar como owner</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={18} color="#4B5563" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ActionItem({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={20} color="#254236" />
      </View>
      <Text style={styles.actionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA', marginTop: 28 },
  safe: { backgroundColor: '#F5F7FA' },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerTitle: { flex: 1, marginHorizontal: 8, fontSize: 16, fontWeight: '700', color: '#111827' },

  heroWrapper: { paddingHorizontal: 16, marginTop: 6 },
  hero: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  heroImg: { resizeMode: 'cover' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.35)',
  },
  heroContent: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  heroChips: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  heroMetaRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#F9FAFB', fontWeight: '600' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#F9FAFB', opacity: 0.85 },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  sectionText: { fontSize: 15, color: '#334155', marginTop: 6, lineHeight: 22 },

  grid: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  gridValue: { fontSize: 15, color: '#374151', marginTop: 6, fontWeight: '600' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6B21A8',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '800' },

  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', marginVertical: 6 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
  actionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  actionIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E6EFEA', marginRight: 10,
  },
  actionText: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '600' },

  modalHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalContainer: { padding: 16 },

  coverPicker: { marginBottom: 16 },
  coverPreview: { width: '100%', height: 200, borderRadius: 14, backgroundColor: '#F3F4F6' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  coverActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  iconBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E6EFEA',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  iconBtnText: { color: '#254236', fontWeight: '700' },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },

  helperText: {
    marginTop: 6,
    marginBottom: 6,
    color: '#6B7280',
    fontSize: 12,
  },

  saveButton: {
    marginTop: 18, backgroundColor: '#254236',
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280' },

  userRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginTop: 10,
    borderColor: '#E5E7EB', borderWidth: 1,
  },

  
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pickerSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 6,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerText: {
    fontSize: 15,
    color: '#111827',
  },
  pickerTextSelected: {
    color: '#6B21A8',
    fontWeight: '800',
  },
  input: {
    placeholderTextColor: '#6B7280',
  }
});
