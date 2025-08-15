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
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'http://192.168.1.106:8000';

const PRIORITY_COLORS = {
  alta: '#DC2626',
  media: '#D97706',
  baja: '#16A34A',
};

export default function PlanningScreen({ navigation, route }) {
  const { eventId, category: categoryParam } = route.params;
  const { user } = useContext(AuthContext);

  const [tasks, setTasks] = useState(categoryParam.tasks || []);
  const [showAdd, setShowAdd] = useState(false);
  const [checklistName, setChecklistName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState('baja');
  const [budget, setBudget] = useState('');
  const [isExpense, setIsExpense] = useState(false); 

  useEffect(() => {
    if (!eventId || !categoryParam?.name || !user?.token) return;
    const categoryNameEscaped = encodeURIComponent(categoryParam.name);
    fetch(
      `${API_URL}/checklists/event/${eventId}/category-name/${categoryNameEscaped}`,
      { headers: { Authorization: `Bearer ${user.token}` } }
    )
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setTasks(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Error al cargar tareas:', err));
  }, [eventId, categoryParam?.name, user?.token]);

  const toggleDone = async (task) => {
    const optimistic = tasks.map(t =>
      t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
    );
    setTasks(optimistic);

    try {
      const res = await fetch(`${API_URL}/checklists/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ is_completed: !task.is_completed }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      
    } catch (err) {
      console.error('Error al actualizar tarea:', err);
      setTasks(tasks); 
      Alert.alert('Error', 'No se pudo actualizar la tarea.');
    }
  };

  
const handleSave = async () => {
  if (!checklistName || !title || !description || !dueDate) {
    Alert.alert(
      'Error',
      'Por favor, completa los campos: Checklist, Título, Descripción y Fecha límite.'
    );
    return;
  }
  if (isExpense && !budget) {
    Alert.alert('Falta presupuesto', 'Indica el budget estimado para el gasto.');
    return;
  }

  const payload = {
    event_id: eventId,
    checklist_name: checklistName,
    title,
    description,
    due_date: dueDate ? dueDate.toISOString().slice(0, 16) : null, 
    category: categoryParam.name,
    priority,
    is_expense: isExpense ? true : false, 
    ...(isExpense && budget ? { budget: parseFloat(budget) } : {}),
  };

  try {
    const res = await fetch(`${API_URL}/checklists/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || `HTTP ${res.status}`);
    }
    const newTask = await res.json();
    setTasks(prev => [newTask, ...prev]);

    setShowAdd(false);
    setChecklistName('');
    setTitle('');
    setDescription('');
    setDueDate(null);
    setPriority('baja');
    setBudget('');
    setIsExpense(false);
  } catch (err) {
    console.error('Error al crear tarea:', err);
    Alert.alert('Error', 'No se pudo crear la tarea. Verifica los datos.');
  }
};

  const handleDelete = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/checklists/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
    } catch (err) {
      console.error('Error al eliminar tarea:', err);
      Alert.alert('Error', 'No se pudo eliminar la tarea.');
    }
  };

  const ExpenseCheckbox = () => (
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={() => setIsExpense(prev => !prev)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isExpense ? 'checkbox-outline' : 'square-outline'}
        size={22}
        color="#A861B7"
        style={{ marginRight: 8 }}
      />
      <Text style={styles.labelText}>¿Es gasto?</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#254236" />
        </TouchableOpacity>
        <Text style={styles.title}>{categoryParam.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>No olvides agregar pendientes propios. ❤️</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {tasks.map(task => (
          <View key={task.id} style={styles.taskRowWrap}>
            <TouchableOpacity
              style={styles.taskRow}
              onPress={() => toggleDone(task)}
            >
              <Ionicons
                name={task.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
                size={34}
                color={task.is_completed ? '#AF64BC' : '#CCC'}
              />
              <Text
                style={[
                  styles.taskLabel,
                  {
                    color: PRIORITY_COLORS[task.priority] || '#254236',
                    textDecorationLine: task.is_completed ? 'line-through' : 'none',
                  },
                ]}
              >
                {task.title}
              </Text>
            </TouchableOpacity>

            {/* Botón Eliminar */}
             <TouchableOpacity onPress={() => handleDelete(task.id)}>
              <Ionicons name="trash-outline" size={22} color="#DC2626" />
            </TouchableOpacity> 
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
          <Ionicons name="add-circle-outline" size={28} color="#254236" />
          <Text style={styles.addText}>Agregar tarea</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal crear tarea */}
      <Modal visible={showAdd} animationType="fade">
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color="#A861B7" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Crear tarea</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContainer}>
            <View style={styles.labelWithIcon}>
              <Ionicons name="list-outline" size={20} color="#A861B7" style={styles.icon} />
              <Text style={styles.labelText}>Checklist</Text>
            </View>
            <TextInput
              style={styles.input}
              value={checklistName}
              onChangeText={setChecklistName}
              placeholder="Ej. Montaje"
            />

            <View style={styles.labelWithIcon}>
              <Ionicons name="pencil-outline" size={20} color="#A861B7" style={styles.icon} />
              <Text style={styles.labelText}>Título</Text>
            </View>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Nombre de la tarea"
            />

            <View style={styles.labelWithIcon}>
              <Ionicons name="document-text-outline" size={20} color="#A861B7" style={styles.icon} />
              <Text style={styles.labelText}>Descripción</Text>
            </View>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalles..."
            />

            <View style={styles.labelWithIcon}>
              <Ionicons name="calendar-outline" size={20} color="#A861B7" style={styles.icon} />
              <Text style={styles.labelText}>Fecha límite</Text>
            </View>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
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

            <View style={styles.labelWithIcon}>
              <Ionicons name="flag-outline" size={20} color="#A861B7" style={styles.icon} />
              <Text style={styles.labelText}>Prioridad</Text>
            </View>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={priority} onValueChange={setPriority} style={styles.picker}>
                {Object.entries(PRIORITY_COLORS).map(([p]) => (
                  <Picker.Item
                    key={p}
                    label={p.charAt(0).toUpperCase() + p.slice(1)}
                    value={p}
                  />
                ))}
              </Picker>
            </View>

            {/* Checkbox de gasto */}
            <View style={{ marginTop: 16 }}>
              <ExpenseCheckbox />
            </View>

            {/* Budget solo si es gasto */}
            {isExpense && (
              <>
                <View style={styles.labelWithIcon}>
                  <Ionicons name="cash-outline" size={20} color="#A861B7" style={styles.icon} />
                  <Text style={styles.labelText}>Budget</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={budget}
                  onChangeText={setBudget}
                  placeholder="Ej. 1000.10"
                  keyboardType="numeric"
                />
              </>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 25, fontWeight: '600', color: '#254236' },
  container: { padding: 16 },
  descriptionContainer: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  description: { fontSize: 18, fontWeight: '600', color: '#815485' },

  taskRowWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, flex: 1 },
  taskLabel: { marginLeft: 12, fontSize: 12 },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    padding: 12,
    backgroundColor: '#E6D0EA',
    borderRadius: 8,
    elevation: 1,
  },
  addText: { marginLeft: 8, fontSize: 16, color: '#254236', fontWeight: '500' },

  // Modal
  modalScreen: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF' },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContainer: { padding: 16 },
  labelWithIcon: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  icon: { marginRight: 8 },
  labelText: { fontSize: 17, fontWeight: '600' },
  input: { marginTop: 8, backgroundColor: '#FFF', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: '#EEE' },
  pickerWrapper: { marginTop: 8, backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#EEE' },
  picker: { width: '100%' },
  saveButton: { marginTop: 24, backgroundColor: '#AF64BC', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '600', fontSize: 16 },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
