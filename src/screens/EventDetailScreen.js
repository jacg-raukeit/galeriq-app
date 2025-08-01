// src/screens/EventDetailScreen.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';

export default function EventDetailScreen() {
  const navigation = useNavigation();
  const { event: initialEvent } = useRoute().params;
  const { user } = useContext(AuthContext);

  const [editVisible, setEditVisible] = useState(false);
  const [eventData, setEventData] = useState(null);

  // Form fields
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventAddress, setEventAddress] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLatitude, setEventLatitude] = useState('');
  const [eventLongitude, setEventLongitude] = useState('');
  const [coverUri, setCoverUri] = useState(null);

  useEffect(() => {
    if (initialEvent) {
      setEventData(initialEvent);
      setEventName(initialEvent.event_name);
      setEventDate(new Date(initialEvent.event_date));
      setEventAddress(initialEvent.event_address);
      setEventType(initialEvent.event_type);
      setEventDescription(initialEvent.event_description || '');
      setEventLatitude(String(initialEvent.event_latitude));
      setEventLongitude(String(initialEvent.event_longitude));
      setCoverUri(initialEvent.event_cover);
    }
  }, [initialEvent]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Se requieren permisos para acceder a la galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Se requieren permisos para usar la cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const onChangeDate = (_, selectedDate) => {
    if (Platform.OS === 'ios') {
      setShowDatePicker(false);
      if (selectedDate) setEventDate(selectedDate);
    } else {
      if (selectedDate) setEventDate(selectedDate);
    }
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
    try {
      const form = new FormData();
      form.append('event_name', eventName);
      form.append('event_date', eventDate.toISOString());
      form.append('event_address', eventAddress);
      form.append('event_type', eventType);
      form.append('event_description', eventDescription);
      form.append('event_latitude', eventLatitude);
      form.append('event_longitude', eventLongitude);

      let res = await fetch(
        `http://192.168.1.71:8000/events/${initialEvent.event_id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${user.token}` },
          body: form,
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();

      if (coverUri && !coverUri.startsWith('http')) {
        const coverForm = new FormData();
        const filename = coverUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const mime = match ? `image/${match[1]}` : 'image/jpeg';
        coverForm.append('event_cover', {
          uri: coverUri,
          name: filename,
          type: mime,
        });

        let coverRes = await fetch(
          `http://192.168.1.71:8000/events/${initialEvent.event_id}/cover`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${user.token}` },
            body: coverForm,
          }
        );
        if (!coverRes.ok) throw new Error(await coverRes.text());
        const coverData = await coverRes.json();
        updated.event_cover = coverData.event_cover;
      }

      setEventData(updated);
      setEditVisible(false);
    } catch (err) {
      console.error('Error al actualizar evento:', err);
    }
  };

  if (!eventData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Evento no encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Edit button */}
      <TouchableOpacity
        style={styles.editIcon}
        onPress={() => setEditVisible(true)}
      >
        <Ionicons name="pencil" size={34} color="#6F4C8C" />
      </TouchableOpacity>

      {/* Display Mode */}
      {!editVisible ? (
        <ScrollView contentContainerStyle={styles.container}>
          {eventData.event_cover && (
            <Image
              source={{ uri: eventData.event_cover }}
              style={styles.cover}
            />
          )}
          <View style={styles.infoBox}>
            <Text style={styles.label}>ID:</Text>
            <Text style={styles.value}>{eventData.event_id}</Text>

            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{eventData.event_name}</Text>

            <Text style={styles.label}>Descripción:</Text>
            <Text style={styles.value}>
              {eventData.event_description}
            </Text>

            <Text style={styles.label}>Fecha:</Text>
            <Text style={styles.value}>
              {new Date(eventData.event_date).toLocaleDateString(
                'es-ES',
                {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }
              )}
            </Text>

            <Text style={styles.label}>Hora:</Text>
            <Text style={styles.value}>
              {new Date(eventData.event_date).toLocaleTimeString(
                'es-ES',
                { hour: '2-digit', minute: '2-digit' }
              )}
            </Text>

            <Text style={styles.label}>Dirección:</Text>
            <Text style={styles.value}>{eventData.event_address}</Text>

            <Text style={styles.label}>Tipo:</Text>
            <Text style={styles.value}>{eventData.event_type}</Text>

            <Text style={styles.label}>Estado:</Text>
            <Text style={styles.value}>{eventData.event_status}</Text>

            <Text style={styles.label}>Latitud:</Text>
            <Text style={styles.value}>{eventData.event_latitude}</Text>

            <Text style={styles.label}>Longitud:</Text>
            <Text style={styles.value}>{eventData.event_longitude}</Text>

            <Text style={styles.label}>Creado:</Text>
            <Text style={styles.value}>
              {new Date(eventData.created_at).toLocaleString(
                'es-ES'
              )}
            </Text>
          </View>

          {/* Ir a Planeación */}
          <TouchableOpacity
            style={styles.planButton}
            onPress={() =>
              navigation.navigate('PlanningHome', {
                eventId: eventData.event_id,
              })
            }
          >
            <Ionicons
              name="checkmark-done-circle-outline"
              size={24}
              color="#6B21A8"
            />
            <Text style={styles.planText}>Ir a Planeación</Text>
          </TouchableOpacity>

          {/* Ir a Agenda */}
          <TouchableOpacity
            style={styles.planButton}
            onPress={() =>
             navigation.navigate('Agenda', {
               eventId: eventData.event_id,
               eventDate: eventData.event_date
             })
            }
          >
            <Ionicons
              name="checkmark-done-circle-outline"
              size={24}
              color="#6B21A8"
            />
            <Text style={styles.planText}>Ir a Agenda</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        // Edit Modal
        <Modal visible={editVisible} animationType="slide">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Ionicons name="close" size={24} color="#254236" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Evento</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            {/* Cover Picker */}
            <TouchableOpacity
              style={styles.coverPicker}
              onPress={pickImage}
            >
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.cover} />
              ) : (
                <Text>Seleccionar Portada</Text>
              )}
              <TouchableOpacity
                onPress={takePhoto}
                style={styles.cameraIcon}
              >
                <Ionicons
                  name="camera"
                  size={24}
                  color="#254236"
                />
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Name */}
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={eventName}
              onChangeText={setEventName}
            />

            {/* Date & Time */}
            <Text style={styles.label}>Fecha y Hora</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={openDateTimePicker}
            >
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

            {/* Address */}
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={eventAddress}
              onChangeText={setEventAddress}
            />

            {/* Type */}
            <Text style={styles.label}>Tipo</Text>
            <TextInput
              style={styles.input}
              value={eventType}
              onChangeText={setEventType}
            />

            {/* Description */}
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              multiline
              value={eventDescription}
              onChangeText={setEventDescription}
            />

            {/* Latitude & Longitude */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Latitud</Text>
                <TextInput
                  style={styles.input}
                  value={eventLatitude}
                  onChangeText={setEventLatitude}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.label}>Longitud</Text>
                <TextInput
                  style={styles.input}
                  value={eventLongitude}
                  onChangeText={setEventLongitude}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdate}
            >
              <Text style={styles.saveText}>Actualizar Evento</Text>
            </TouchableOpacity>
          </ScrollView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB', marginTop: 20, marginBottom: 30 },
  editIcon: { position: 'absolute', top: 16, right: 16, zIndex: 2 },
  container: { padding: 16, paddingTop: 60 },
  cover: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  infoBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 12,
  },
  value: { fontSize: 16, color: '#111827', marginTop: 4 },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 24,
    elevation: 1,
  },
  planText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B21A8',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContainer: { padding: 16 },
  coverPicker: {
    marginBottom: 16,
    alignItems: 'center',
    position: 'relative',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 4,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#254236',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280' },
});
