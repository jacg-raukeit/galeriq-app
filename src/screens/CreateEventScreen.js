// src/screens/CreateEventScreen.js

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';
import { EventsContext } from '../context/EventsContext';
import { Dropdown } from 'react-native-element-dropdown';

const EVENT_TYPES = [
  'Boda',
  'Cumpleaños',
  'XV Años',
  'Graduación',
  'Bautizo',
  'Evento Corporativo',
  'Otro',
];

const STATUS_OPTIONS = [
  { label: 'Active',    value: 'active'    },
  { label: 'Finished',  value: 'finished'  },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function CreateEventScreen({ navigation }) {
  const { user }     = useContext(AuthContext);
  const { addEvent } = useContext(EventsContext);

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [type, setType]               = useState(EVENT_TYPES[0]);
  const [otherType, setOtherType]     = useState(''); 

  const [date, setDate]               = useState(new Date());
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [showTimePicker, setShowTimePicker]   = useState(false);

  const [location, setLocation]               = useState('');
  const [tempImageUri, setTempImageUri]       = useState(null);
  const [status, setStatus]                   = useState(STATUS_OPTIONS[0].value);

  const pad = n => String(n).padStart(2, '0');
  const formattedDate =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const pickImage = () => {
    Alert.alert(
      'Seleccionar portada',
      'Elige una opción',
      [
        { text: 'Cámara', onPress: pickFromCamera },
        { text: 'Galería', onPress: pickFromGallery },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const pickFromCamera = async () => {
    const { status: camPerm } = await ImagePicker.requestCameraPermissionsAsync();
    if (camPerm !== 'granted') {
      return Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.');
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && !result.cancelled) {
      setTempImageUri(result.assets?.[0]?.uri ?? result.uri);
    }
  };

  const pickFromGallery = async () => {
    if (Platform.OS !== 'web') {
      const { status: libPerm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libPerm !== 'granted') {
        return Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería de fotos.');
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && !result.cancelled) {
      setTempImageUri(result.assets?.[0]?.uri ?? result.uri);
    }
  };

  const onChangeDate = (_, selected) => {
    setShowDatePicker(false);
    if (selected) {
      const newDate = new Date(selected);
      newDate.setHours(date.getHours(), date.getMinutes(), date.getSeconds());
      setDate(newDate);
      setShowTimePicker(true);
    }
  };

  const onChangeTime = (_, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), selectedTime.getSeconds());
      setDate(newDate);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      return Alert.alert('Error', 'El nombre del evento es obligatorio');
    }
    const finalType = type === 'Otro' ? otherType.trim() : type;
    if (type === 'Otro' && !finalType) {
      return Alert.alert('Tipo de evento', 'Por favor, escribe el tipo de evento.');
    }

    try {
      await addEvent({
        event_name:        name,
        event_description: description,
        event_date:        `${formattedDate}:00`,
        event_address:     location,
        event_type:        finalType,
        event_coverUri:    tempImageUri,
        event_status:      status,
        event_latitude:    '',
        event_longitude:   '',
      });
      navigation.replace('Events');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo crear el evento. Intenta de nuevo.');
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      'Cancelar creación',
      '¿Deseas cancelar la creación del evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <Header title="Crear un nuevo evento" onBack={confirmCancel} />
      <Text style={styles.title}>Galeriq</Text>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Nombre del evento</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Boda de Ana y Luis"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descripción del evento"
          value={description}
          onChangeText={text => text.length <= 200 && setDescription(text)}
          multiline
          maxLength={200}
        />
        <Text style={styles.counter}>{description.length} / 200 caracteres</Text>

        <Text style={styles.label}>Tipo de evento</Text>
        <Dropdown
          data={EVENT_TYPES.map(t => ({ label: t, value: t }))}
          labelField="label"
          valueField="value"
          placeholder="Selecciona un tipo"
          value={type}
          onChange={item => {
            setType(item.value);
            if (item.value !== 'Otro') setOtherType('');
          }}
          style={[styles.dropdown, type && styles.dropdownFilled]}
          placeholderStyle={styles.placeholder}
          selectedTextStyle={styles.selectedText}
          iconStyle={styles.icon}
          containerStyle={styles.containerStyle}
          itemContainerStyle={styles.itemContainer}
          activeColor="#EDE9FE"
        />

        {/* Si eligen "Otro", input adicional para escribir el tipo */}
        {type === 'Otro' && (
          <>
            <Text style={[styles.label, { marginTop: 12 }]}>Especifica el tipo</Text>
            <TextInput
              style={[styles.input, !otherType.trim() && styles.inputWarning]}
              placeholder="Escribe el tipo de evento"
              value={otherType}
              onChangeText={setOtherType}
            />
            {!otherType.trim() && (
              <Text style={styles.helperText}>Este campo es obligatorio al elegir “Otro”.</Text>
            )}
          </>
        )}

        <Text style={styles.label}>Fecha y hora del evento</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#4B5563" />
          <Text style={styles.dateText}>{formattedDate}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={onChangeDate}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeTime}
          />
        )}

        <Text style={styles.label}>Ubicación</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Jardín El Roble, Cuernavaca, Mor."
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>Portada</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          <Ionicons name="camera-outline" size={24} color="#6B21A8" />
          <Text style={styles.imagePickerText}>
            {tempImageUri ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </Text>
        </TouchableOpacity>
        {tempImageUri && (
          <Image source={{ uri: tempImageUri }} style={styles.previewImage} />
        )}

        <Text style={styles.label}>Estado</Text>
        <Picker
          selectedValue={status}
          onValueChange={setStatus}
          style={styles.picker}
        >
          {STATUS_OPTIONS.map(o => (
            <Picker.Item key={o.value} label={o.label} value={o.value} />
          ))}
        </Picker>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Guardar evento</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F9FAFB', marginTop: 10 },
  container:     { padding: 16, paddingBottom: 32 },
  label:         { marginTop: 16, fontSize: 14, fontWeight: '600', color: '#1F2937' },
  input: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',          
    placeholderTextColor: '#6B7280',
  },
  inputWarning: { borderColor: '#F59E0B' },
  helperText: { marginTop: 6, color: '#9CA3AF', fontSize: 12 },
  textArea:      { height: 100, textAlignVertical: 'top' },
  counter:       { alignSelf: 'flex-end', marginTop: 4, color: '#6B7280', fontSize: 12 },
  picker:        { marginTop: 8, backgroundColor: '#FFF', borderRadius: 8 },

  dateButton:    {
    marginTop: 8, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  dateText:      { marginLeft: 8, color: '#1F2937' },

  imagePicker:   {
    marginTop: 8, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EDE9FE', borderRadius: 8, padding: 12,
  },
  imagePickerText:{ marginLeft: 8, color: '#6B21A8' },
  previewImage:  { marginTop: 8, width: '100%', height: 140, borderRadius: 8 },

  submitButton:  {
    marginTop: 24, backgroundColor: '#6B21A8', paddingVertical: 14,
    borderRadius: 8, alignItems: 'center', marginBottom: 19,
  },
  submitText:    { color: '#FFF', fontWeight: '600' },

  title: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 24,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },

  dropdown: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownFilled: {
    borderColor: '#6B21A8',
  },
  placeholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedText: {
    fontSize: 14,
    color: '#1F2937',
  },
  icon: {
    tintColor: '#6B21A8',
  },
  containerStyle: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  itemContainer: {
    paddingVertical: 8,
  },
});
