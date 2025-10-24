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
  Modal,
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

  const [iosDateModalVisible, setIosDateModalVisible] = useState(false);
  const [iosTimeModalVisible, setIosTimeModalVisible] = useState(false);
  const [tempDateIOS, setTempDateIOS] = useState(new Date());
  const [tempTimeIOS, setTempTimeIOS] = useState(new Date());

  const [location, setLocation]               = useState('');
  const [tempImageUri, setTempImageUri]       = useState(null);
  const [status, setStatus]                   = useState(STATUS_OPTIONS[0].value);
  const [budget, setBudget] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);

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

  const onChangeDateAndroid = (_, selected) => {
    setShowDatePicker(false);
    if (selected) {
      const newDate = new Date(selected);
      newDate.setHours(date.getHours(), date.getMinutes(), date.getSeconds());
      setDate(newDate);
      setShowTimePicker(true);
    }
  };

  const onChangeTimeAndroid = (_, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), selectedTime.getSeconds());
      setDate(newDate);
    }
  };

  const openIOSDateModal = () => {
    setTempDateIOS(new Date(date));
    setIosDateModalVisible(true);
  };

  const confirmIOSDate = () => {
    const merged = new Date(date);
    merged.setFullYear(tempDateIOS.getFullYear(), tempDateIOS.getMonth(), tempDateIOS.getDate());
    setDate(merged);
    setIosDateModalVisible(false);
    setTempTimeIOS(new Date(merged));
    setIosTimeModalVisible(true);
  };

  const cancelIOSDate = () => {
    setIosDateModalVisible(false);
  };

  const confirmIOSTime = () => {
    const updated = new Date(date);
    updated.setHours(tempTimeIOS.getHours(), tempTimeIOS.getMinutes(), 0, 0);
    setDate(updated);
    setIosTimeModalVisible(false);
  };

  const cancelIOSTime = () => {
    setIosTimeModalVisible(false);
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
        // event_latitude:    '',
        // event_longitude:   '',
        budget:            cleanBudget,
      });

      setSuccessVisible(true);
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

  const openDateFlow = () => {
    if (submitting) return;
    if (Platform.OS === 'ios') {
      openIOSDateModal();
    } else {
      setShowDatePicker(true);
    }
  };

  const goToEvents = () => {
    setSuccessVisible(false);
    navigation.navigate('Events');
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
          onPress={openDateFlow}
          disabled={submitting}
        >
          <Ionicons name="calendar-outline" size={20} color="#4B5563" />
          <Text style={styles.dateText}>{formattedDate}</Text>
        </TouchableOpacity>

        {/* ANDROID: pickers nativos */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={onChangeDateAndroid}
          />
        )}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={onChangeTimeAndroid}
          />
        )}

        {/* iOS: MODAL FECHA */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={iosDateModalVisible}
            transparent
            animationType="fade"
            onRequestClose={cancelIOSDate}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{t('labels.select_date')}</Text>
                <DateTimePicker
                  value={tempDateIOS}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_, d) => d && setTempDateIOS(d)}
                  style={styles.pickerIOS}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, styles.btnCancel]} onPress={cancelIOSDate}>
                    <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.btnAccept]} onPress={confirmIOSDate}>
                    <Text style={styles.btnAcceptText}>{t('common.accept')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* iOS: MODAL HORA */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={iosTimeModalVisible}
            transparent
            animationType="fade"
            onRequestClose={cancelIOSTime}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{t('labels.select_time')}</Text>
                <DateTimePicker
                  value={tempTimeIOS}
                  mode="time"
                  display="spinner"
                  onChange={(_, d) => d && setTempTimeIOS(d)}
                  style={styles.pickerIOS}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, styles.btnCancel]} onPress={cancelIOSTime}>
                    <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.btnAccept]} onPress={confirmIOSTime}>
                    <Text style={styles.btnAcceptText}>{t('common.accept')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
          onChangeText={(v) => setBudget(v.replace(/[^\d.,]/g, ''))}
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


        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
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

      {/* MODAL DE ÉXITO */}
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={56}
              color="#10B981"
              style={{ alignSelf: 'center', marginBottom: 8 }}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.modalTitle}>{t('success.title')}</Text>
            <Text style={styles.successMessage}>{t('success.message')}</Text>
            <View style={[styles.modalActions, { justifyContent: 'center' }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnAccept, { minWidth: 120 }]}
                onPress={goToEvents}
                accessibilityRole="button"
              >
                <Text style={styles.btnAcceptText}>{t('success.accept')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  submitButtonDisabled: { opacity: 0.7 },
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
  dropdownFilled: { borderColor: '#6B21A8' },
  placeholder: { fontSize: 14, color: '#9CA3AF' },
  selectedText: { fontSize: 14, color: '#1F2937' },
  icon: { tintColor: '#6B21A8' },
  containerStyle: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  itemContainer: { paddingVertical: 8 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  modalCard: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center',
  },
  pickerIOS: { alignSelf: 'center' },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8,
  },
  modalBtn: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 8,
  },
  btnCancel: { backgroundColor: '#F3F4F6' },
  btnCancelText: { color: '#374151', fontWeight: '600' },
  btnAccept: { backgroundColor: '#6B21A8' },
  btnAcceptText: { color: '#FFF', fontWeight: '700', textAlign: 'center' },

  successCard: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#FFF', borderRadius: 12, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  successMessage: {
    textAlign: 'center',
    color: '#374151',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
});
