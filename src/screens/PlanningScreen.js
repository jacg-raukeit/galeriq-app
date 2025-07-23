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
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../components/Header';

const TASKS = [
  { label: 'Cotizar el lugar',         icon: 'cash-outline',            done: true  },
  { label: 'Elegir una fecha',        icon: 'calendar-outline',        done: true  },
  { label: 'Reservar el lugar',       icon: 'locate-outline',          done: false },
  { label: 'Estructura tu presupuesto',icon: 'cash-outline',           done: false },
  { label: 'Contrata lo indispensable',icon: 'people-outline',         done: false },
  { label: 'Probar menú',             icon: 'restaurant-outline',      done: false },
  { label: 'Agendar música',          icon: 'musical-notes-outline',  done: false },
  { label: 'Contratar fotógrafo',     icon: 'camera-outline',          done: false },
];

const CATEGORIES = ['Proveedores','Banquete','Decoración'];
const PRIORITIES = [
  { label: 'Alta',   value: 'high',   color: '#DC2626' },
  { label: 'Media',  value: 'medium', color: '#D97706' },
  { label: 'Baja',   value: 'low',    color: '#16A34A' },
];

export default function PlanningScreen({ navigation, route }) {
  const total   = TASKS.length;
  const done    = TASKS.filter(t => t.done).length;
  const percent = Math.round(done / total * 100);

 
  const [showAdd, setShowAdd]           = useState(false);
  const [title, setTitle]               = useState('');
  const [desc, setDesc]                 = useState('');
  const [dueDate, setDueDate]           = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory]         = useState(CATEGORIES[0]);
  const [priority, setPriority]         = useState(PRIORITIES[0].value);

  const onChangeDue = (_, selected) => {
    setShowDatePicker(false);
    if (selected) setDueDate(selected);
  };

  const formattedDue = dueDate
    ? dueDate.toLocaleDateString('es-ES', { day:'2-digit',month:'long',year:'numeric' })
    : '';

  const handleSave = () => {
    // TODO: integrar con estado/Tu back
    console.log({ title, desc, dueDate, category, priority });
    setShowAdd(false);
    // reset
    setTitle(''); setDesc(''); setDueDate(null);
    setCategory(CATEGORIES[0]);
    setPriority(PRIORITIES[0].value);
  };


  return (
    <View style={styles.screen}>
      <Header title="Planeación" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>No olvides agregar pendientes propios 💜</Text>

        {/* Barra de progreso */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { flex: percent }]} />
          <View style={[styles.progressEmpty, { flex: 100 - percent }]} />
        </View>

        {/* Texto % y conteo */}
        <View style={styles.rowCenter}>
          <Text style={styles.percent}>{percent}%</Text>
          <Text style={styles.count}>{done} de {total} tareas completadas</Text>
        </View>

        {/* Lista de tareas */}
        {TASKS.map((t, i) => (
          <View key={i} style={styles.taskRow}>
            <Ionicons
              name={t.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={40}
              color={t.done ? '#E1B2D4' : '#D1D5DB'}
            />
            <Ionicons
              name={t.icon}
              size={20}
              color={t.done ? '#6B21A8' : '#9CA3AF'}
              style={styles.taskIcon}
            />
            <Text style={[styles.taskLabel, t.done && styles.taskDone]}>
              {t.label}
            </Text>
          </View>
        ))}

        {/* Botón Agregar tarea */}
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
        <Ionicons name="add-circle-outline" size={30} color="#FFF" />
        <Text style={styles.addText}>Agregar tarea</Text>
        </TouchableOpacity>
      </ScrollView>

        {/* Modal Agregar Tarea */}
      <Modal visible={showAdd} animationType="slide">
        <View style={styles.modalScreen}>
          <Header title="Crear tarea" onBack={() => setShowAdd(false)} />
          <ScrollView contentContainerStyle={styles.modalContainer}>
            {/* Título */}
            <Text style={styles.modalLabel}>Título <Text style={{color:'#DC2626'}}>*</Text></Text>
            <TextInput
              style={styles.modalInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Nombre de la tarea"
            />

            {/* Descripción */}
            <Text style={styles.modalLabel}>Descripción <Text style={styles.optional}>(opcional)</Text></Text>
            <TextInput
              style={styles.modalInput}
              value={desc}
              onChangeText={setDesc}
              placeholder="Detalles..."
            />

            {/* Fecha límite */}
            <Text style={styles.modalLabel}>Fecha límite <Text style={styles.optional}>(opcional)</Text></Text>
            <TouchableOpacity
              style={styles.modalInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={ formattedDue ? styles.modalText : styles.modalPlaceholder }>
                { formattedDue || 'Seleccionar fecha' }
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display={Platform.OS==='ios'?'spinner':'default'}
                minimumDate={new Date()}
                onChange={onChangeDue}
              />
            )}

            {/* Categoría */}
            <Text style={styles.modalLabel}>Categoría</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={styles.pickerModal}
              >
                {CATEGORIES.map(cat => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>

            {/* Prioridad */}
            <Text style={styles.modalLabel}>Prioridad</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={priority}
                onValueChange={setPriority}
                style={styles.pickerModal}
              >
                {PRIORITIES.map(p => (
                  <Picker.Item
                    key={p.value}
                    label={p.label}
                    value={p.value}
                    color={p.color}
                  />
                ))}
              </Picker>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={!title.trim()}
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
  screen:       { flex: 1, backgroundColor: '#F9FAFB' },
  container:    { padding: 16, paddingBottom: 32 },
  subtitle:     { fontSize: 22, fontWeight: '600', marginBottom: 12, color: '#A96489' },
  progressBar:  { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressFill: { backgroundColor: '#E674BF' },
  progressEmpty:{ backgroundColor: '#FFE6F4' },
  rowCenter:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  percent:      { fontSize: 32, fontWeight: '700', color: '#111827', marginRight: 8 },
  count:        { fontSize: 19, color: '#A96489' },
  taskRow:      { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  taskIcon:     { marginHorizontal: 8, color: 'gray' },
  taskLabel:    { fontSize: 14, color: '#111827' },
  taskDone:     { textDecorationLine: 'line-through', color: '#6B7280' },
  addButton:    {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6D0E4',
    padding: 15,
    borderRadius: 28,
    justifyContent: 'center',
    marginTop: 24,
  },
  addText:      { color: '#5A3A56', marginLeft: 8, fontWeight: '600', fontSize: 18 },

  /* Modal */
  modalScreen:   { flex: 1, backgroundColor: '#F9FAFB' },
  modalContainer:{ padding: 16, paddingBottom: 32 },

  modalLabel:    { marginTop: 16, fontSize: 14, fontWeight: '600', color: '#4B5563' },
  optional:      { fontWeight: '400', fontSize: 12, color: '#9CA3AF' },
  modalInput:    {
    marginTop: 8, backgroundColor: '#FFF',
    borderRadius: 8, padding: 10, minHeight: 44,
  },
  modalText:     { color: '#111827' },
  modalPlaceholder:{ color: '#9CA3AF' },

  pickerWrapper: { marginTop: 8, backgroundColor: '#FFF', borderRadius: 8 },
  pickerModal:   { width: '100%' },

  saveButton:    {
    marginTop: 24, backgroundColor: '#DF65AD',
    paddingVertical: 14, borderRadius: 28, alignItems: 'center',
  },
  saveText:      { color: '#FFF', fontWeight: '600', fontSize: 19 },
});

