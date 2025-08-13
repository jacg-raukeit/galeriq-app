

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

export default function AddExpenseScreen() {
  const { eventId, category } = useRoute().params;
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const [selectedCategory, setSelectedCategory] = useState(category.id);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState('Pendiente');
  const [date, setDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const onChangeDate = (_, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const openDatePicker = () => {
    setShowPicker(true);
  };

  const handleSave = async () => {
    const payload = {
      event_id: eventId,
      category_id: selectedCategory,
      name: name.trim(),
      budget: cost ? parseFloat(cost) : null,
      status,
      payment_date: date ? date.toISOString() : null,
    };

    try {
      const res = await fetch('http://192.168.1.71:8000/expenses/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      navigation.goBack();
    } catch (err) {
      console.error('Error creando gasto:', err);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Agregar gasto</Text>
      </View>

      {/* Formulario */}
      <View style={styles.form}>
        {/* Categoría */}
        <Text style={styles.label}>Categoría</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={value => setSelectedCategory(value)}
          >
            <Picker.Item label={category.name} value={category.id} />
          </Picker>
        </View>

        {/* Nombre */}
        <Text style={styles.label}>Nombre del gasto / concepto</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Alquiler de sillas"
          value={name}
          onChangeText={setName}
        />

        {/* Costo estimado */}
        <Text style={styles.label}>Costo estimado</Text>
        <TextInput
          style={styles.input}
          placeholder="No definido"
          keyboardType="numeric"
          value={cost}
          onChangeText={setCost}
        />

        {/* Estado */}
        <Text style={styles.label}>Estado</Text>
        <TextInput
          style={styles.input}
          value={status}
          editable={false}
        />

        {/* Fecha de pago */}
        <Text style={styles.label}>Fecha de pago</Text>
        <TouchableOpacity style={styles.input} onPress={openDatePicker}>
          <Text style={{ color: date ? '#111827' : '#9CA3AF' }}>
            {date
              ? date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
              : '—'}
          </Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )}
      </View>

      {/* Botón Guardar */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Guardar gasto</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
    color: '#111827',
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  label: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 4,
  },
  pickerWrapper: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
  },
  saveButton: {
    margin: 16,
    backgroundColor: '#6B21A8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
