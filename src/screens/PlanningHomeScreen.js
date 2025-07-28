import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';


const CATEGORIES = ['Proveedores', 'Banquete', 'Decoración'];

// Normaliza: quita tildes y pasa a minúsculas
const normalize = str =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export default function PlanningHomeScreen({ navigation, route }) {
  const { eventId } = route.params || {};
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!eventId || !user) return;
    fetch(`http://192.168.1.71:8000/checklists/event/${eventId}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => {
        // Filtrar solo tareas cuya categoría sea una de las tres
        const validCats = CATEGORIES.map(normalize);
        const filtered = data.filter(t => validCats.includes(t.category));
        setTasks(filtered);
      })
      .catch(err => console.error('Error al cargar checklist:', err));
  }, [eventId, user]);

  const iconMap = {
    Proveedores: 'people-outline',
    Banquete: 'restaurant-outline',
    Decoración: 'color-palette-outline',
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#254236" />
          </TouchableOpacity>
          <Text style={styles.title}>Checklist</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Botones de las 3 categorías */}
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={styles.itemButton}
            onPress={() =>
              navigation.navigate('Planning', {
                eventId,
                category: cat,
              })
            }
          >
            <Ionicons
              name={iconMap[cat]}
              size={20}
              color="#254236"
            />
            <Text style={styles.itemText}>{cat}</Text>
            <Ionicons name="chevron-forward" size={20} color="#254236" />
          </TouchableOpacity>
        ))}

        {/* Añadir categoría (solo UI, no persistente) */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // Podrías implementar un modal para sugerir nuevas categorías aquí…
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#254236" />
          <Text style={styles.addText}>Añadir categoría</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F0E7' },
  container: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '500', color: '#254236' },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    elevation: 1,
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#254236',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    elevation: 1,
  },
  addText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#254236',
  },
});
