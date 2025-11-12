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
import MapView, { Marker, UrlTile } from 'react-native-maps';


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
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [tempDateIOS, setTempDateIOS] = useState(new Date());
  const [tempTimeIOS, setTempTimeIOS] = useState(new Date());

  const [location, setLocation]               = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [tempImageUri, setTempImageUri]       = useState(null);
  const [status, setStatus]                   = useState(STATUS_OPTIONS[0].value);
  const [budget, setBudget] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);


  const [successVisible, setSuccessVisible] = useState(false);

  const pad = n => String(n).padStart(2, '0');
  const formattedDate =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const pickImage = () => {
  setShowImagePickerModal(true);
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
  setCancelModalVisible(true);
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
<TouchableOpacity
  onPress={() => !submitting && setShowMapModal(true)}
  disabled={submitting}
>
  <TextInput
    style={styles.input}
    placeholder={t('placeholders.location')}
    value={location}
    editable={false} // evita escribir manualmente
    pointerEvents="none"
  />
</TouchableOpacity>


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

      {showImagePickerModal && (
  <Modal
    visible={showImagePickerModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowImagePickerModal(false)}
  >
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{t('cover.picker_title')}</Text>
        
        <TouchableOpacity 
          style={styles.modalOption}
          onPress={async () => {
            setShowImagePickerModal(false);
            await pickFromCamera();
          }}
        >
          <Ionicons name="camera-outline" size={24} color="#6B21A8" />
          <Text style={styles.modalOptionText}>{t('cover.camera')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.modalOption}
          onPress={async () => {
            setShowImagePickerModal(false);
            await pickFromGallery();
          }}
        >
          <Ionicons name="images-outline" size={24} color="#6B21A8" />
          <Text style={styles.modalOptionText}>{t('cover.gallery')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modalOption, { borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}
          onPress={() => setShowImagePickerModal(false)}
        >
          <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>
            {t('cover.cancel')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}

  {/* MODAL DE CONFIRMACIÓN CANCELAR */}
<Modal
  visible={cancelModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setCancelModalVisible(false)}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.modalCard}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color="#F59E0B"
        style={{ alignSelf: 'center', marginBottom: 12 }}
      />
      <Text style={styles.modalTitle}>{t('cancel_create.title')}</Text>
      <Text style={styles.cancelMessage}>{t('cancel_create.message')}</Text>
      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalBtn, styles.btnCancel]}
          onPress={() => setCancelModalVisible(false)}
        >
          <Text style={styles.btnCancelText}>{t('cancel_create.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalBtn, styles.btnAccept]}
          onPress={() => {
            setCancelModalVisible(false);
            navigation.goBack();
          }}
        >
          <Text style={styles.btnAcceptText}>{t('cancel_create.accept')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


{/* MODAL SELECCIONAR UBICACIÓN */}
<Modal
  visible={showMapModal}
  transparent={false}
  animationType="slide"
  onRequestClose={() => setShowMapModal(false)}
>
  <View style={{ flex: 1 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFF', elevation: 3 }}>
      <TouchableOpacity onPress={() => setShowMapModal(false)}>
        <Ionicons name="arrow-back" size={26} color="#6B21A8" />
      </TouchableOpacity>
      <Text style={{ fontSize: 18, fontWeight: '700', marginLeft: 12, color: '#6B21A8' }}>
        Selecciona ubicación
      </Text>
    </View>

    <MapView
      style={{ flex: 1 }}
      provider={null} // usa default, no Google
      initialRegion={{
        latitude: 19.4326, // CDMX como punto base
        longitude: -99.1332,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      onPress={async (e) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setSelectedCoords({ latitude, longitude });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocation(address);
        } catch (error) {
          console.log('Reverse geocode error:', error);
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      }}
    >
      <UrlTile
        urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
      />
      {selectedCoords && (
        <Marker coordinate={selectedCoords} />
      )}
    </MapView>

    <View style={{ padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#E5E7EB' }}>
      <Text style={{ color: '#374151', marginBottom: 8 }}>
        {location ? `Dirección: ${location}` : 'Toca en el mapa para seleccionar ubicación'}
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: '#6B21A8',
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: 'center',
        }}
        onPress={() => setShowMapModal(false)}
      >
        <Text style={{ color: '#FFF', fontWeight: '700' }}>Guardar ubicación</Text>
      </TouchableOpacity>
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
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 8,
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

  modalOption: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 16,
  paddingHorizontal: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#E5E7EB',
},
modalOptionText: {
  marginLeft: 12,
  fontSize: 16,
  color: '#374151',
  fontWeight: '500',
},

cancelMessage: {
  textAlign: 'center',
  color: '#6B7280',
  fontSize: 14,
  marginTop: 8,
  marginBottom: 16,
  lineHeight: 20,
},

});
