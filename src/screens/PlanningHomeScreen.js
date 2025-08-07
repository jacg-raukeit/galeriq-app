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
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';

// Mapa de iconos por categoría normalizada
const ICON_MAP = {
  proveedores: 'people-outline',
  banquete: 'restaurant-outline',
  decoracion: 'color-palette-outline',
};

// Normaliza: quita tildes y pasa a minúsculas
const normalize = str =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export default function PlanningHomeScreen({ navigation, route }) {
  const { eventId } = route.params || {};
  const { user } = useContext(AuthContext);

  // [{ id: number, name: string, tasks: ChecklistOut[] }]
  const [categories, setCategories] = useState([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // 🚨 CAMBIO AQUÍ: Función para cargar las categorías Y sus tareas
  const loadCategories = () => {
    if (!eventId || !user) return;
    
    // Primero, obtener la lista de categorías
    fetch(`http://192.168.1.106:8000/category-checklists/event/${eventId}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(async (catsData) => {
        // Para cada categoría, hacer una llamada separada para obtener sus tareas
        const categoriesWithTasks = await Promise.all(
          catsData.map(async (cat) => {
            const encodedCategoryName = encodeURIComponent(cat.name);
            const tasksRes = await fetch(
              `http://192.168.1.106:8000/checklists/event/${eventId}/category-name/${encodedCategoryName}`,
              { headers: { Authorization: `Bearer ${user.token}` } }
            );
            if (!tasksRes.ok) throw new Error(`HTTP ${tasksRes.status}`);
            const tasksData = await tasksRes.json();
            return { ...cat, tasks: tasksData };
          })
        );
        setCategories(categoriesWithTasks);
      })
      .catch(err => console.error('Error al cargar categorías y tareas:', err));
  };

  useEffect(() => {
    loadCategories();
  }, [eventId, user]);

  // Función para manejar la creación de la nueva categoría
  const handleCreateCategory = () => {
    if (!newCategoryName) {
      Alert.alert('Error', 'El nombre de la categoría no puede estar vacío.');
      return;
    }

    const payload = {
      name: newCategoryName,
      event_id: eventId,
    };

    fetch('http://192.168.1.106:8000/category-checklists/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) return res.text().then(text => Promise.reject(text));
        return res.json();
      })
      .then(() => {
        setShowAddCategoryModal(false);
        setNewCategoryName('');
        loadCategories(); // Vuelve a cargar las categorías para incluir la nueva
      })
      .catch(err => {
        console.error('Error al crear la categoría:', err);
        Alert.alert('Error', 'No se pudo crear la categoría.');
      });
  };

  // 🚨 CAMBIO AQUÍ: Ahora el cálculo del progreso global es correcto
  const total = categories.reduce((sum, cat) => sum + cat.tasks.length, 0);
  const doneCount = categories.reduce(
    (sum, cat) => sum + cat.tasks.filter(t => t.is_completed).length,
    0
  );
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

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

        {/* Progress Bar */}
        <View style={styles.progressBarBackground}>
          <View
            style={[styles.progressBarFill, { width: `${percent}%` }]}
          />
        </View>
        <Text style={styles.percentText}>{percent}% completado</Text>

        {/* Listado de categorías dinámico */}
        {categories.map(cat => {
          const norm = normalize(cat.name);
          const icon = ICON_MAP[norm] || 'folder-outline';
          const display = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.itemButton}
              onPress={() =>
                navigation.navigate('Planning', {
                  eventId,
                  category: cat,
                })
              }
            >
              <Ionicons
                name={icon}
                size={20}
                color="#254236"
              />
              <Text style={styles.itemText}>{display}</Text>
              <Ionicons name="chevron-forward" size={20} color="#254236" />
            </TouchableOpacity>
          );
        })}

        {/* Botón Añadir categoría */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddCategoryModal(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#254236" />
          <Text style={styles.addText}>Añadir categoría</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal para añadir categoría */}
      <Modal visible={showAddCategoryModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear nueva categoría</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de la categoría"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => {
                setShowAddCategoryModal(false);
                setNewCategoryName('');
              }}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateCategory}
                disabled={!newCategoryName}
              >
                <Text style={styles.buttonText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F0E7', marginTop: 15 },
  container: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '500', color: '#254236' },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#254236',
  },
  percentText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#254236',
    marginBottom: 24,
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    elevation: 1,
    borderColor: '#EAEBDB',
    borderWidth: 1,
    height: 60,
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
    color: '#1A2E2A',
    fontWeight: '500',
  },
  // Estilos para el modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  createButton: {
    backgroundColor: '#254236',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#A861B7',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});