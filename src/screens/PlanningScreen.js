// src/screens/PlanningScreen.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../context/AuthContext';

const PRIORITY_COLORS = {
  alta: '#DC2626',
  media: '#D97706',
  baja: '#16A34A',
};


const CATEGORIES = ['Proveedores', 'Banquete', 'Decoración'];

// Normaliza: quita tildes y pasa a minúsculas
const normalizeCategory = cat =>
  cat.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function PlanningScreen({ navigation, route }) {
  const { eventId, category: initialCategory } = route.params;
  const { user } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [checklistName, setChecklistName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState(initialCategory || CATEGORIES[0]);
  const [priority, setPriority] = useState('alta');
  const [budget, setBudget] = useState('');

  useEffect(() => {
    if (!eventId || !category || !user) return;
    fetch(`http://192.168.1.71:8000/checklists/event/${eventId}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => {
        const catNorm = normalizeCategory(category);
        const filtered = data.filter(
          
          t => normalizeCategory(t.category) === catNorm
        );
        setTasks(filtered);
      })
      .catch(err => console.error('Error al cargar tareas:', err));
  }, [eventId, category, user]);

  const toggleDone = id =>
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, is_completed: !t.is_completed } : t
      )
    );

  const handleSave = () => {
    const payload = {
      event_id: eventId,
      checklist_name: checklistName,
      title,
      description,
      due_date: dueDate ? dueDate.toISOString() : null,
      category: normalizeCategory(category),
      priority,
      budget: budget ? parseFloat(budget) : undefined,
    };

    fetch('http://192.168.1.71:8000/checklists/', {
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
      .then(newTask => {
        setTasks(prev => [newTask, ...prev]);
        setShowAdd(false);
        // reset
        setChecklistName('');
        setTitle('');
        setDescription('');
        setDueDate(null);
        setCategory(initialCategory || CATEGORIES[0]);
        setPriority('alta');
        setBudget('');
      })
      .catch(err => console.error('Error al crear tarea:', err));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#254236" />
        </TouchableOpacity>
        <Text style={styles.title}>{category}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {tasks.map(task => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskRow}
            onPress={() => toggleDone(task.id)}
          >
            <Ionicons
              name={task.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={task.is_completed ? '#999' : '#CCC'}
            />
            <Text
              style={[
                styles.taskLabel,
                {
                  color: PRIORITY_COLORS[task.priority],
                  textDecorationLine: task.is_completed
                    ? 'line-through'
                    : 'none',
                },
              ]}
            >
              {task.title}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAdd(true)}
        >
          <Ionicons name="add-circle-outline" size={28} color="#254236" />
          <Text style={styles.addText}>Agregar tarea</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} animationType="slide">
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color="#254236" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nueva tarea</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            <Text style={styles.label}>Checklist Name</Text>
            <TextInput
              style={styles.input}
              value={checklistName}
              onChangeText={setChecklistName}
              placeholder="Ej. Montaje"
            />

            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Nombre de la tarea"
            />

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalles..."
            />

            <Text style={styles.label}>Fecha límite</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>
                {dueDate
                  ? dueDate.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Seleccionar fecha'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setDueDate(date);
                }}
              />
            )}

            <Text style={styles.label}>Categoría</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={styles.picker}
              >
                {CATEGORIES.map(cat => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Prioridad</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={priority}
                onValueChange={setPriority}
                style={styles.picker}
              >
                {Object.keys(PRIORITY_COLORS).map(p => (
                  <Picker.Item
                    key={p}
                    label={p.charAt(0).toUpperCase() + p.slice(1)}
                    value={p}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Budget</Text>
            <TextInput
              style={styles.input}
              value={budget}
              onChangeText={setBudget}
              placeholder="Ej. 1000.10"
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={!checklistName || !title}
            >
              <Text style={styles.saveText}>Guardar tarea</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB', marginTop: 25 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: { fontSize: 25, fontWeight: '600', color: '#254236' },
  container: { padding: 16 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  taskLabel: { marginLeft: 12, fontSize: 16 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 1,
  },
  addText: { marginLeft: 8, fontSize: 16, color: '#254236' },
  modalScreen: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContainer: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16 },
  input: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 6,
    padding: 10,
  },
  pickerWrapper: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 6,
  },
  picker: { width: '100%' },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#6B21A8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
