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
import * as Location from 'expo-location';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';
import { EventsContext } from '../context/EventsContext';
import { Dropdown } from 'react-native-element-dropdown';
import { useTranslation } from 'react-i18next';
import { WebView } from 'react-native-webview';





const LOCATIONIQ_API_KEY = 'pk.dc572d89c709070b0784944b1a9daba6';

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
  const [debounceTimer, setDebounceTimer] = useState(null);
const controllerRef = React.useRef(null);

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
  const webRef = React.useRef(null);
  const [userCoords, setUserCoords] = useState({ lat: 19.4326, lng: -99.1332 }); // CDMX por defecto
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);


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

  const handleSearch = async (text) => {
  if (text.length < 3) {
    setSuggestions([]);
    return;
  }

  try {
    // Cancela petición anterior si existe
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const res = await fetch(
      `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(text)}&format=json&countrycodes=mx&limit=5&addressdetails=1`,
        { signal: controller.signal }
      );
    const results = await res.json();
    setSuggestions(results || []);
  } catch (err) {
    if (err.name !== 'AbortError') console.log('Error buscando sugerencias:', err);
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
        event_latitude: selectedCoords?.latitude || null,
  event_longitude: selectedCoords?.longitude || null,
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

  React.useEffect(() => {
  (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permiso de ubicación denegado');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setUserCoords({ lat: latitude, lng: longitude });
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
    }
  })();
}, []);




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


{/* MODAL DE UBICACIÓN CON BUSCADOR Y BOTÓN DE REGRESAR */}
<Modal
  visible={showMapModal}
  transparent={false}
  animationType="slide"
  onRequestClose={() => setShowMapModal(false)}
>
  <View style={{ flex: 1, backgroundColor: '#FFF' }}>
    {/* HEADER */}
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFF', elevation: 3 }}>
      <TouchableOpacity onPress={() => setShowMapModal(false)}>
        <Ionicons name="arrow-back" size={26} color="#6B21A8" />
      </TouchableOpacity>
      <Text style={{ fontSize: 18, fontWeight: '700', marginLeft: 12, color: '#6B21A8' }}>
        Selecciona ubicación
      </Text>
    </View>



{/* BUSCADOR */}
<View style={{ paddingHorizontal: 10, paddingTop: 10, backgroundColor: '#FFF', zIndex: 3 }}>
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <TextInput
      placeholder="Buscar lugar o dirección..."
      placeholderTextColor="#9CA3AF"
      value={searchText}
      onChangeText={(text) => {
        setSearchText(text);

        // Cancelar el debounce previo
        if (debounceTimer) clearTimeout(debounceTimer);

        // Nuevo debounce
        const timer = setTimeout(() => {
          handleSearch(text);
        }, 800);

        setDebounceTimer(timer);
      }}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        backgroundColor: '#F9FAFB',
        color: '#111827',
      }}
    />

    {/* LUPA */}
    {/* <TouchableOpacity
  onPress={() => {
    // 1. ¡Cancela el timer automático pendiente!
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null); // Importante limpiar la referencia
    }
    
    // 2. Ahora sí, ejecuta la búsqueda manual
    handleSearch(searchText);
  }}
>
      <Ionicons
        name="search-outline"
        size={22}
        color="#6B21A8"
        style={{ marginLeft: 8 }}
      />
    </TouchableOpacity> */}
  </View>

  {/* LISTA DE SUGERENCIAS */}
  {suggestions.length > 0 && (
    <View
      style={{
        backgroundColor: '#FFF',
        marginTop: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        maxHeight: 180,
        zIndex: 5,
      }}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {suggestions.map((sug, idx) => (
          <TouchableOpacity
            key={idx}
            style={{
              padding: 10,
              borderBottomWidth: idx < suggestions.length - 1 ? 1 : 0,
              borderColor: '#EEE',
            }}
            onPress={() => {
              const lat = parseFloat(sug.lat);
              const lon = parseFloat(sug.lon);
              const display = sug.display_name;

              webRef.current.injectJavaScript(`
                map.setView([${lat}, ${lon}], 15);
                if (marker) map.removeLayer(marker);
                marker = L.marker([${lat}, ${lon}]).addTo(map);
              `);

              setSearchText(display.split(',')[0]);
              setLocation(display);
              setSuggestions([]);
              setSelectedCoords({ latitude: lat, longitude: lon });
            }}
          >
            <Text style={{ color: '#111827', fontWeight: '500' }}>
              {sug.display_name.split(',')[0]}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              {sug.display_name.split(',').slice(1, 3).join(', ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )}
</View>


{/* MAPA */}
<View style={{ flex: 1 }}>
  <WebView
    ref={webRef}
    originWhitelist={['*']}
    source={{
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
              html, body, #map { height: 100%; margin: 0; padding: 0; }
              .leaflet-control-attribution { font-size: 10px; color: #aaa !important; }
              .locate-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: #6B21A8;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px 10px;
                font-size: 16px;
                z-index: 9999;
              }
            </style>
          </head>
          <body>
           <button class="locate-btn" onclick="recenter()">
  <i class="fas fa-location-crosshairs" style="color: white;"></i>
</button>
            <div id="map"></div>
            <script>
              const map = L.map('map').setView([${userCoords.lat}, ${userCoords.lng}], 14);
             L.tileLayer('https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_API_KEY}', {
   maxZoom: 18,
   attribution: '© LocationIQ © OpenStreetMap'
}).addTo(map);
const style = document.createElement('style');
style.innerHTML = '.leaflet-control-attribution { display: none !important; }';
document.head.appendChild(style);
              const currentMarker = L.marker([${userCoords.lat}, ${userCoords.lng}])
                .addTo(map)
                .bindPopup('Tu ubicación actual')
                .openPopup();

              let marker = null;

              function recenter() {
                map.setView([${userCoords.lat}, ${userCoords.lng}], 14);
              }

              map.on('click', function(e) {
                const { lat, lng } = e.latlng;
                if (marker) map.removeLayer(marker);
                marker = L.marker([lat, lng]).addTo(map);
                window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
              });
            </script>
          </body>
        </html>
      `,
    }}
    onMessage={async (event) => {
      try {
        const { lat, lng } = JSON.parse(event.nativeEvent.data);
        setSelectedCoords({ latitude: lat, longitude: lng });
        const response = await fetch(
        `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lng}&format=json`
      );
        const data = await response.json();
        const address =
          data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setLocation(address);
      } catch (error) {
        console.error('Error al procesar coordenadas:', error);
      }
    }}
  />
</View>


    {/* FOOTER */}
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
