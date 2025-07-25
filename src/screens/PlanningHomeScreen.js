import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';

export default function PlanningHomeScreen({ navigation, route }) {
  const { eventId } = route.params || {};
  const { user } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([
    'Ceremonia',
    'Salón',
    'Música',
    'Banquete',
    'Fotografía',
    'Decoración',
    'Vestimenta',
    'Invitaciones',
  ]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Normaliza un texto: sin espacios extremos y en minúsculas
  const normalize = str => str.trim().toLowerCase();

  // Carga checklist y categorías dinámicas sin duplicados
  useEffect(() => {
    if (!eventId || !user) return;

    fetch(`http://192.168.1.106:8000/checklists/event/${eventId}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => {
        setTasks(data);

        // Combina estáticas + dinámicas sin duplicar (case-insensitive)
        const combined = [
          ...categories,                           // estáticas
          ...data.map(t => t.category || '')      // dinámicas
        ];

        const unique = Array.from(
          new Map(combined.map(c => [normalize(c), c.trim()])).values()
        );

        setCategories(unique);
      })
      .catch(err => console.error('Error al cargar checklist:', err));
  }, [eventId, user]);

  const iconMap = {
    Ceremonia: 'leaf-outline',
    Salón: 'business-outline',
    Música: 'musical-notes-outline',
    Banquete: 'restaurant-outline',
    Fotografía: 'camera-outline',
    Decoración: 'color-palette-outline',
    Proveedores: 'people-outline',
    Vestimenta: 'shirt-outline',
    Invitaciones: 'mail-outline',
    Proveedores: 'people-outline',
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#254236" />
          </TouchableOpacity>
          <Text style={styles.title}>Checklist</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Categorías */}
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={styles.itemButton}
            onPress={() =>
              navigation.navigate('Planning', { eventId, category: cat })
            }
          >
            <Ionicons
              name={iconMap[cat] || 'pricetag-outline'}
              size={20}
              color="#254236"
            />
            <Text style={styles.itemText}>{cat}</Text>
            <Ionicons name="chevron-forward" size={20} color="#254236" />
          </TouchableOpacity>
        ))}

        {/* Añadir categoría */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#254236" />
          <Text style={styles.addText}>Añadir categoría</Text>
        </TouchableOpacity>

        {/* Modal agregar categoría */}
        <Modal
          visible={addModalVisible}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nueva Categoría</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nombre de la categoría"
                value={newCategory}
                onChangeText={setNewCategory}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setAddModalVisible(false);
                    setNewCategory('');
                  }}
                >
                  <Text>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    const trimmed = newCategory.trim();
                    if (!trimmed) return;

                    const exists = categories.some(
                      c => normalize(c) === normalize(trimmed)
                    );
                    if (!exists) {
                      setCategories(prev => [...prev, trimmed]);
                    }
                    setNewCategory('');
                    setAddModalVisible(false);
                  }}
                >
                  <Text>Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    elevation: 1,
  },
  itemText: { flex: 1, marginLeft: 12, fontSize: 16, color: '#254236' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    elevation: 1,
  },
  addText: { flex: 1, marginLeft: 12, fontSize: 16, color: '#254236' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 8,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
  },
});