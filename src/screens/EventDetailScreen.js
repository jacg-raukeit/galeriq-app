// src/screens/EventDetailScreen.js

import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../components/Header';

export default function EventDetailScreen() {
  const navigation = useNavigation();
  const { event } = useRoute().params;  

  if (!event) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Evento no encontrado.</Text>
      </View>
    );
  }

 
  const source =
    event.event_cover?.startsWith('http')
      ? { uri: event.event_cover }
      : event.event_cover;

  return (
    <View style={styles.screen}>
      <Header title="Detalle del evento" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container}>
        {event.event_cover && <Image source={source} style={styles.cover} />}

        <View style={styles.infoBox}>
          <Text style={styles.label}>ID:</Text>
          <Text style={styles.value}>{event.event_id}</Text>

          <Text style={styles.label}>Nombre:</Text>
          <Text style={styles.value}>{event.event_name}</Text>

          <Text style={styles.label}>Descripción:</Text>
          <Text style={styles.value}>{event.event_description}</Text>

          <Text style={styles.label}>Fecha:</Text>
          <Text style={styles.value}>
            {new Date(event.event_date).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Text>

          <Text style={styles.label}>Hora:</Text>
          <Text style={styles.value}>
            {new Date(event.event_date).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>

          <Text style={styles.label}>Dirección:</Text>
          <Text style={styles.value}>{event.event_address}</Text>

          <Text style={styles.label}>Tipo:</Text>
          <Text style={styles.value}>{event.event_type}</Text>

          <Text style={styles.label}>Estado:</Text>
          <Text style={styles.value}>{event.event_status}</Text>

          <Text style={styles.label}>Latitud:</Text>
          <Text style={styles.value}>{event.event_latitude}</Text>

          <Text style={styles.label}>Longitud:</Text>
          <Text style={styles.value}>{event.event_longitude}</Text>

          <Text style={styles.label}>Creado:</Text>
          <Text style={styles.value}>
            {new Date(event.created_at).toLocaleString('es-ES')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.planButton}
          onPress={() =>
            navigation.navigate('Planning', { eventId: event.event_id })
          }
        >
          <Ionicons name="checkmark-done-circle-outline" size={24} color="#6B21A8" />
          <Text style={styles.planText}>Ir a Planeación</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-circle" size={48} color="#6B21A8" />
          <Text style={styles.closeText}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#F9FAFB' },
  empty:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText:{ fontSize: 16, color: '#6B7280' },
  container:{ padding: 16, paddingBottom: 32 },
  cover:    { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  infoBox:  { backgroundColor: '#FFF', borderRadius: 12, padding: 16, elevation: 2 },
  label:    { fontSize: 14, fontWeight: '600', color: '#4B5563', marginTop: 12 },
  value:    { fontSize: 16, color: '#111827', marginTop: 4 },
  closeButton: { marginTop: 24, alignItems: 'center' },
  closeText:   { marginTop: 4, color: '#6B21A8', fontSize: 14 },

   planButton:  {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 24,
    elevation: 1,
  },
  planText:    {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B21A8',
  },
  closeButton: { marginTop: 24, alignItems: 'center' },
  closeText:   { marginTop: 4, color: '#6B21A8', fontSize: 14 },
});

