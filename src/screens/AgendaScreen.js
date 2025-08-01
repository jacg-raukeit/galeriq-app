// src/screens/AgendaScreen.js

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function AgendaScreen({ navigation, route }) {
  const { eventDate } = route.params;
  const [viewMode, setViewMode] = useState('Día');

  
  const items = [
    { time: '15:00', title: 'Preparativos', icon: 'sparkles-outline', color: '#FFE8D6' },
    { time: '17:00', title: 'Ceremonia', subtitle: 'Jardín principal', icon: 'ribbon-outline', color: '#E8D2FD' },
    { time: '18:30', title: 'Recepción', icon: 'wine-outline', color: '#FFF7D6' },
    { time: '20:00', title: 'Primera danza', icon: 'musical-notes-outline', color: '#FFDAD6' },
  ];

  // Formateo de la fecha: "13 de julio de 2023"
  const formattedDate = new Date(eventDate).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#254236" />
        </TouchableOpacity>
        <Text style={styles.title}>Galeriq</Text>
        <View style={{ width: 24 }} />
      </View>
    <Text style={styles.titleSection}>Agenda</Text>
      {/* Fecha */}
      <Text style={styles.dateText}>{formattedDate}</Text>

      {/* Tabs Día / Semana / Lista */}
      <View style={styles.tabs}>
        {['Día', 'Semana', 'Lista'].map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.tab, viewMode === mode && styles.tabActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.tabText, viewMode === mode && styles.tabTextActive]}>
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timeline */}
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((it, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.time}>{it.time}</Text>
            <View style={[styles.card, { backgroundColor: it.color }]}>
              <Ionicons name={it.icon} size={20} color="#254236" />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{it.title}</Text>
                {it.subtitle && <Text style={styles.cardSubtitle}>{it.subtitle}</Text>}
              </View>
            </View>
          </View>
        ))}

        {/* Botón Agregar actividad */}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={38} color="#6F4C8C" />
          <Text style={styles.addText}>Agregar actividad</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: '#F2F0E7', marginTop: 15 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title:     { fontSize: 28, fontWeight: '500', color: '#254236' },
  titleSection: { fontSize: 24, fontWeight: '800', color: 'black', marginLeft: 16, marginBottom: 8 },
  dateText:  { fontSize: 16, color: '#254236', marginHorizontal: 16, marginBottom: 12 },
  tabs:      { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16 },
  tab:       { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center', marginRight: 8 },
  tabActive: { backgroundColor: '#E8D2FD' },
  tabText:   { color: '#254236', fontWeight: '500' },
  tabTextActive: { color: '#442D49' },
  list:      { paddingHorizontal: 16, paddingBottom: 32 },
  row:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  time:      { width: 60, fontSize: 14, color: '#254236' },
  card:      { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, elevation: 2 },
  cardText:  { marginLeft: 12 },
  cardTitle:{ fontSize: 16, fontWeight: '600', color: '#254236' },
  cardSubtitle:{ fontSize: 14, color: '#4B5563', marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center',  marginTop: 18, padding: 12, backgroundColor: '#F1E3F5', borderRadius: 25, elevation: 1, width: '85%', marginLeft: '15%', },
  addText:   { marginLeft: 8, fontSize: 16, color: '#254236', fontWeight: '500' },
});
