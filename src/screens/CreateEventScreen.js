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
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';
import { EventsContext } from '../context/EventsContext';
import { Dropdown } from 'react-native-element-dropdown';
import { useTranslation } from 'react-i18next';

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
  const insets = useSafeAreaInsets();
  const { user }     = useContext(AuthContext);
  const { addEvent } = useContext(EventsContext);
  const { t } = useTranslation('create_event');

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
  const [budget, setBudget] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const pad = n => String(n).padStart(2, '0');
  const formattedDate =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const pickImage = () => {
   Alert.alert(
      t('cover.picker_title'),
      t('cover.picker_message'),
      [
        { text: t('cover.camera'), onPress: pickFromCamera },
        { text: t('cover.gallery'), onPress: pickFromGallery },
        { text: t('cover.cancel'), style: 'cancel' },
      ]
    );
  };

  const pickFromCamera = async () => {
    const { status: camPerm } = await ImagePicker.requestCameraPermissionsAsync();
    if (camPerm !== 'granted') {
      return Alert.alert(t('permissions.title'), t('permissions.camera'));
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
        return Alert.alert(t('permissions.title'), t('permissions.gallery'));
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
    if (submitting) return;

    if (!name.trim()) {
       return Alert.alert(t('errors.title'), t('errors.name_required'));
    }
    const finalType = type === 'Otro' ? otherType.trim() : type;
    if (type === 'Otro' && !finalType) {
       return Alert.alert(t('errors.type_title'), t('errors.type_required'));
    }

    const cleanBudget = budget?.trim()
  ? budget.trim().replace(/\./g, '').replace(',', '.')
  : '';

    try {
      setSubmitting(true);

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
        budget:            cleanBudget,
      });

      navigation.replace('EventCreated');
    } catch (e) {
      console.error(e);
      Alert.alert(t('errors.title'), t('errors.create_failed'));
    } finally {
      setSubmitting(false); 
    }
  };

  const confirmCancel = () => {
    if (submitting) return;
     Alert.alert(
      t('cancel_create.title'),
      t('cancel_create.message'),
      [
        { text: t('cancel_create.cancel'), style: 'cancel' },
        { text: t('cancel_create.accept'), onPress: () => navigation.goBack() },
      ]
    );
  };

  return (
    <View style={[styles.screen, { marginTop: insets.top }]}>
      <Header title={t('header_title')} onBack={confirmCancel} />
      <Text style={styles.title}>{t('brand')}</Text>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>{t('labels.name')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('placeholders.name')}
          value={name}
          editable={!submitting}
          onChangeText={setName}
        />

        <Text style={styles.label}>{t('labels.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('placeholders.description')}
          value={description}
          editable={!submitting}
          onChangeText={text => text.length <= 200 && setDescription(text)}
          multiline
          maxLength={200}
        />
        <Text style={styles.counter}>{t('counter', { count: description.length, max: 200 })}</Text>

        <Text style={styles.label}>{t('labels.type')}</Text>
        <Dropdown
          data={EVENT_TYPES.map(t => ({ label: t, value: t }))}
          labelField="label"
          valueField="value"
          placeholder={t('placeholders.type')}
          value={type}
          disable={submitting}
          onChange={item => {
            setType(item.value);
            if (item.value !== 'Otro') setOtherType('');
          }}
          style={[styles.dropdown, type && styles.dropdownFilled, submitting && { opacity: 0.7 }]}
          placeholderStyle={styles.placeholder}
          selectedTextStyle={styles.selectedText}
          iconStyle={styles.icon}
          containerStyle={styles.containerStyle}
          itemContainerStyle={styles.itemContainer}
          activeColor="#EDE9FE"
        />

        {type === 'Otro' && (
          <>
            <Text style={[styles.label, { marginTop: 12 }]}>{t('labels.specify_type')}</Text>
            <TextInput
              style={[styles.input, !otherType.trim() && styles.inputWarning]}
              placeholder={t('placeholders.specify_type')}
              value={otherType}
              editable={!submitting}
              onChangeText={setOtherType}
            />
            {!otherType.trim() && (
             <Text style={styles.helperText}>{t('errors.type_required')}</Text>
            )}
          </>
        )}

        <Text style={styles.label}>{t('labels.datetime')}</Text>
        <TouchableOpacity
          style={[styles.dateButton, submitting && { opacity: 0.7 }]}
          onPress={() => !submitting && setShowDatePicker(true)}
          disabled={submitting}
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

        <Text style={styles.label}>{t('labels.location')}</Text>
        <TextInput
          style={styles.input}
         placeholder={t('placeholders.location')}
          value={location}
          editable={!submitting}
          onChangeText={setLocation}
        />

        {/* Presupuesto */}
<Text style={styles.label}>{t('labels.budget')}</Text>
<TextInput
  style={styles.input}
  placeholder={t('placeholders.budget')}
  value={budget}
  keyboardType="numeric"
  editable={!submitting}
  onChangeText={(t) => setBudget(t.replace(/[^\d.,]/g, ''))}
/>

        <Text style={styles.label}>{t('labels.cover')}</Text>
        <TouchableOpacity
          style={[styles.imagePicker, submitting && { opacity: 0.7 }]}
          onPress={!submitting ? pickImage : undefined}
          disabled={submitting}
        >
          <Ionicons name="camera-outline" size={24} color="#6B21A8" />
          <Text style={styles.imagePickerText}>
            {tempImageUri ? t('cover.change_image') : t('cover.select_image')}
          </Text>
        </TouchableOpacity>
        {tempImageUri && (
          <Image source={{ uri: tempImageUri }} style={styles.previewImage} />
        )}

        {/* Estado */}
        <Text style={styles.label}>{t('labels.status')}</Text>
        <Dropdown
         data={STATUS_OPTIONS.map(o => ({ ...o, label: t(`status.options.${o.value}`) }))}
          labelField="label"
          valueField="value"
         placeholder={t('placeholders.status')}
          value={status}
          disable={submitting}
          onChange={item => setStatus(item.value)}
          style={[styles.dropdown, status && styles.dropdownFilled, submitting && { opacity: 0.7 }]}
          placeholderStyle={styles.placeholder}
          selectedTextStyle={styles.selectedText}
          iconStyle={styles.icon}
          containerStyle={styles.containerStyle}
          itemContainerStyle={styles.itemContainer}
          activeColor="#EDE9FE"
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitText}>{t('submit')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F9FAFB' },
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
  submitButtonDisabled: {
    opacity: 0.7,
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
