// src/screens/invitations/InviteEditorScreen.js
import React, { useMemo, useRef, useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ImageBackground, Image,
  Dimensions, ScrollView, Alert, TextInput, InteractionManager, ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

const API_URL = 'http://143.198.138.35:8000';

import { EventsContext } from '../../context/EventsContext';
import { AuthContext } from '../../context/AuthContext';

const FONT_OPTIONS = [
  { key: 'System',     label: 'System',           family: undefined },
  { key: 'Montserrat', label: 'Montserrat',       family: 'Montserrat_700Bold' },
  { key: 'Lato',       label: 'Lato',             family: 'Lato_700Bold' },
  { key: 'Playfair',   label: 'Playfair',         family: 'PlayfairDisplay_700Bold' },
  { key: 'Lobster',    label: 'Lobster',          family: 'Lobster_400Regular' },
  { key: 'Pacifico',   label: 'Pacifico',         family: 'Pacifico_400Regular' },
  { key: 'Dancing',    label: 'Dancing Script',   family: 'DancingScript_700Bold' },
];
const getFontFamily = (key) => FONT_OPTIONS.find(f => f.key === key)?.family;

const STICKER_CATEGORIES = {
  Flowers: [
    require('../../assets/stickers/flowers/flowers1.png'),
    require('../../assets/stickers/flowers/flowers2.png'),
    require('../../assets/stickers/flowers/flowers3.png'),
    require('../../assets/stickers/flowers/flower5.png'),
    require('../../assets/stickers/flowers/flower6.png'),
    require('../../assets/stickers/flowers/flower7.png'),
    require('../../assets/stickers/flowers/flower8.png'),
    require('../../assets/stickers/flowers/flower9.png'),
    require('../../assets/stickers/flowers/flower10.png'),
    require('../../assets/stickers/flowers/flower11.png'),
    require('../../assets/stickers/flowers/flower12.png'),
    require('../../assets/stickers/flowers/flower13.png'),
    require('../../assets/stickers/flowers/flower14.png'),
    require('../../assets/stickers/flowers/flower15.png'),
    require('../../assets/stickers/flowers/flower16.png'),
  ],
  Balloons: [
    require('../../assets/stickers/balloons/ballon1.png'),
    require('../../assets/stickers/balloons/ballon2.png'),
    require('../../assets/stickers/balloons/ballon6.png'),
    require('../../assets/stickers/balloons/ballon7.png'),
    require('../../assets/stickers/balloons/ballon8.png'),
    require('../../assets/stickers/balloons/ballon9.png'),
    require('../../assets/stickers/balloons/ballon10.png'),
    require('../../assets/stickers/balloons/ballon11.png'),
    require('../../assets/stickers/balloons/ballon12.png'),
    require('../../assets/stickers/balloons/ballon14.png'),
    require('../../assets/stickers/balloons/ballon15.png'),
  ],
  Borders: [
    require('../../assets/stickers/borders/border1.png'),
    require('../../assets/stickers/borders/border2.png'),
    require('../../assets/stickers/borders/border3.png'),
    require('../../assets/stickers/borders/border4.png'),
    require('../../assets/stickers/borders/border5.png'),
    require('../../assets/stickers/borders/border6.png'),
    require('../../assets/stickers/borders/border7.png'),
  ],
  Cake: [
    require('../../assets/stickers/cake/cake1.png'),
    require('../../assets/stickers/cake/cake6.png'),
    require('../../assets/stickers/cake/cake7.png'),
    require('../../assets/stickers/cake/cake8.png'),
  ],
};

const { width } = Dimensions.get('window');
const CANVAS_W = width - 32;
const CANVAS_H = CANVAS_W * 1.4;

const clamp255 = (n, min = 0, max = 255) => Math.max(min, Math.min(max, Math.round(n)));
const hexToRgb = (hex) => {
  if (!hex) return { r: 17, g: 24, b: 39 };
  let h = (hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return { r: 17, g: 24, b: 39 };
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const rgbToHex = ({ r, g, b }) => '#' + [r, g, b].map(v => clamp255(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

// ========== MODAL DE CONFIRMACIÓN ==========
function ConfirmModal({ visible, title, message, onCancel, onConfirm, confirmText, cancelText }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#6B21A8" style={{ marginBottom: 16 }} />
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={onCancel}>
              <Text style={styles.modalBtnTextSecondary}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={onConfirm}>
              <Text style={styles.modalBtnTextPrimary}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ========== MODAL DE ÉXITO (con cierre automático) ==========
function SuccessModal({ visible, title, message, onClose }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" style={{ marginBottom: 16 }} />
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}


function InlineColorPicker({ value, onChange, onClose }) {
  const [hex, setHex] = useState(value || '#111827');
  const [rgb, setRgb] = useState(hexToRgb(value));

  useEffect(() => {
    if (!value) return;
    if ((value || '').toUpperCase() !== (hex || '').toUpperCase()) {
      setHex(value);
      setRgb(hexToRgb(value));
    }
  }, [value]);

  const commitToParent = (nextHex) => {
    if ((nextHex || '').toUpperCase() !== (hex || '').toUpperCase()) {
      setHex(nextHex);
      setRgb(hexToRgb(nextHex));
    }
    onChange(nextHex);
  };

  const onHexChange = (txt) => {
    const t = txt.startsWith('#') ? txt : '#' + txt;
    setHex(t);
    const h = t.replace('#', '').trim();
    if (/^[0-9A-Fa-f]{6}$/.test(h) || /^[0-9A-Fa-f]{3}$/.test(h)) {
      const rgbVal = hexToRgb(t);
      setRgb(rgbVal);
      commitToParent(rgbToHex(rgbVal));
    }
  };

  const handleSlideChange = (k, v) => {
    const next = { ...rgb, [k]: clamp255(v, 0, 255) };
    setRgb(next);
    setHex(rgbToHex(next));
  };
  const handleSlideComplete = (k, v) => {
    const next = { ...rgb, [k]: clamp255(v, 0, 255) };
    commitToParent(rgbToHex(next));
  };

  return (
    <View style={styles.customWrap}>
      <Text style={styles.panelTitle}>Color personalizado</Text>
      <View style={{ alignSelf: 'stretch', marginBottom: 12 }}>
        <View style={{ height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: hex }} />
        <Text style={{ marginTop: 8, color: '#6B7280' }}>{hex}</Text>
      </View>
      <View style={{ alignSelf: 'stretch', marginBottom: 8 }}>
        <Text style={{ fontWeight: '700', color: '#111827', marginBottom: 6 }}>HEX</Text>
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10 }}>
          <TextInput
            value={hex}
            onChangeText={onHexChange}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="#FFFFFF"
            placeholderTextColor="#9CA3AF"
            style={{ height: 44, color: '#111827', letterSpacing: 1 }}
          />
        </View>
      </View>
      {(['r','g','b']).map((k, idx) => (
        <View key={k} style={{ alignSelf: 'stretch', marginTop: idx ? 8 : 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontWeight: '700', color: '#111827' }}>{k.toUpperCase()}</Text>
            <Text style={{ color: '#6B7280' }}>{rgb[k]}</Text>
          </View>
          <Slider
            minimumValue={0} maximumValue={255} step={1}
            value={rgb[k]}
            onValueChange={(v) => handleSlideChange(k, v)}
            onSlidingComplete={(v) => handleSlideComplete(k, v)}
          />
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, alignSelf: 'stretch' }}>
        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]} onPress={onClose}>
          <Text style={[styles.modalBtnText, { color: '#111827' }]}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// aqui va el Texto arrastrable
function DraggableText({
  id, text, color, size, weight, align, font, x, y,
  onSelect, selected, onDragEnd, clampW, clampH, hideSelection,
}) {
  const xSV = useSharedValue(x);
  const ySV = useSharedValue(y);
  useEffect(() => { xSV.value = x; }, [x]);
  useEffect(() => { ySV.value = y; }, [y]);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => { startX.value = xSV.value; startY.value = ySV.value; runOnJS(onSelect)(id); })
    .onUpdate((e) => {
      const nx = Math.max(0, Math.min(clampW, startX.value + e.translationX));
      const ny = Math.max(0, Math.min(clampH, startY.value + e.translationY));
      xSV.value = nx; ySV.value = ny;
    })
    .onEnd(() => { runOnJS(onDragEnd)(id, xSV.value, ySV.value); });

  const aStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    transform: [{ translateX: xSV.value }, { translateY: ySV.value }],
  }));

  const family = getFontFamily(font);
  const weightStyle = family ? 'normal' : (weight || '700');

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[aStyle, { paddingHorizontal: 4, maxWidth: CANVAS_W - 8 }]}>
        <Text
          onPress={() => onSelect(id)}
          style={{ color, fontSize: size, fontWeight: weightStyle, textAlign: align, fontFamily: family }}
        >
          {text}
        </Text>
        {!hideSelection && selected && (
          <View style={{ height: 2, backgroundColor: '#6B21A8', marginTop: 2 }} />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// aqui va el Sticker arrastrable
function DraggableSticker({
  id, uri, x, y, scale = 1, rotate = 0, base = 160, locked = false,
  gesturesEnabled = true,
  onSelect, selected, onUpdate, clampW, clampH, hideSelection,
}) {
  const xSV = useSharedValue(x);
  const ySV = useSharedValue(y);
  const sSV = useSharedValue(scale);
  const rSV = useSharedValue(rotate);

  useEffect(() => { xSV.value = x; ySV.value = y; sSV.value = scale; rSV.value = rotate; }, [x, y, scale, rotate]);

  const start = {
    x: useSharedValue(0), y: useSharedValue(0),
    s: useSharedValue(1), r: useSharedValue(0),
  };

  const pan = Gesture.Pan()
    .enabled(gesturesEnabled && !locked)
    .onBegin(() => { start.x.value = xSV.value; start.y.value = ySV.value; runOnJS(onSelect)(id); })
    .onUpdate((e) => {
      const nx = Math.max(0, Math.min(clampW, start.x.value + e.translationX));
      const ny = Math.max(0, Math.min(clampH, start.y.value + e.translationY));
      xSV.value = nx; ySV.value = ny;
    })
    .onEnd(() => { runOnJS(onUpdate)(id, { x: xSV.value, y: ySV.value, scale: sSV.value, rotate: rSV.value }); });

  const pinch = Gesture.Pinch()
    .enabled(gesturesEnabled && !locked)
    .onBegin(() => { start.s.value = sSV.value; })
    .onUpdate((e) => { sSV.value = Math.max(0.25, Math.min(4, start.s.value * e.scale)); })
    .onEnd(() => { runOnJS(onUpdate)(id, { x: xSV.value, y: ySV.value, scale: sSV.value, rotate: rSV.value }); });

  const rotation = Gesture.Rotation()
    .enabled(gesturesEnabled && !locked)
    .onBegin(() => { start.r.value = rSV.value; })
    .onUpdate((e) => { rSV.value = start.r.value + e.rotation; })
    .onEnd(() => { runOnJS(onUpdate)(id, { x: xSV.value, y: ySV.value, scale: sSV.value, rotate: rSV.value }); });

  const composed = Gesture.Simultaneous(pan, pinch, rotation);

  const aStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    transform: [
      { translateX: xSV.value },
      { translateY: ySV.value },
      { scale: sSV.value },
      { rotate: `${rSV.value * Math.PI / 180}rad` },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={aStyle}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => onSelect(id)}>
          <Image
            source={typeof uri === 'string' ? { uri } : uri}
            style={{ width: base, height: base }}
            resizeMode="contain"
          />
          {locked && (
            <View style={{ position:'absolute', right:4, top:4, backgroundColor:'rgba(0,0,0,0.35)', borderRadius:8, padding:2 }}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        {!hideSelection && selected && (
          <View style={{ height: 2, backgroundColor: '#6B21A8', marginTop: 2 }} />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function SizeSlider({ value, onChange, min = 10, max = 64 }) {
  return (
    <View style={{ width: '100%', paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontWeight: '700' }}>−</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: '800', color: '#111827' }}>{Math.round(value)}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontWeight: '700' }}>＋</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ marginTop: 8, textAlign: 'center', color: '#6B7280' }}>Toca +/- para ajustar</Text>
    </View>
  );
}

function LiveSlider({ title, value, min, max, step = 1, format = (v) => v.toFixed?.(2) ?? String(v), onStart, onLive, onCommit }) {
  const [local, setLocal] = useState(value ?? 0);
  const slidingRef = useRef(false);
  const rafRef = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => { if (!slidingRef.current) setLocal(value ?? 0); }, [value]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const tick = () => {
    rafRef.current = null;
    if (pendingRef.current != null) {
      onLive?.(pendingRef.current);
      pendingRef.current = null;
    }
  };

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text style={{ fontWeight:'700', color:'#111827' }}>{title}</Text>
        <Text style={{ color:'#6B7280' }}>{format(local)}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        value={local}
        step={step}
        onSlidingStart={() => { slidingRef.current = true; onStart?.(); }}
        onValueChange={(v) => {
          setLocal(v);
          pendingRef.current = v;
          if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
        }}
        onSlidingComplete={(v) => {
          slidingRef.current = false;
          if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
          pendingRef.current = null;
          setLocal(v);
          onLive?.(v);
          onCommit?.(v);
        }}
      />
    </View>
  );
}

export default function InviteEditorScreen() {
  const { t, i18n } = useTranslation('invite_editor');
  const navigation = useNavigation();
  const route = useRoute();
  const template = route.params?.template;

  const { events } = useContext(EventsContext);
  const { user } = useContext(AuthContext);

  const activeEventId = useMemo(() => {
    const p1 = route.params?.eventId;
    const p2 = route.params?.event?.event_id;
    if (p1 != null) return Number(p1);
    if (p2 != null) return Number(p2);
    if (Array.isArray(events) && events.length === 1) return Number(events[0].event_id);
    return null;
  }, [route.params?.eventId, route.params?.event?.event_id, events]);

  const currentEvent = useMemo(() => {
    if (activeEventId != null && Array.isArray(events)) {
      const found = events.find(e => Number(e.event_id) === Number(activeEventId));
      if (found) return found;
    }
    return route.params?.event || null;
  }, [activeEventId, events, route.params?.event]);

  const eventName        = currentEvent?.event_name || t('placeholders.templateDefaults.newEvent');
  const eventType        = currentEvent?.event_type ?? t('placeholders.templateDefaults.eventType');
  const eventDescription = currentEvent?.event_description ?? t('placeholders.templateDefaults.descPending');
  const eventDateISO     = currentEvent?.event_date ?? null;

  const formattedDateTime = useMemo(() => {
    if (!eventDateISO) return t('placeholders.templateDefaults.dateTbd');
    const d = new Date(eventDateISO);
    const fecha = d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${capitalize(fecha)} · ${hora}`;
  }, [eventDateISO]);

  const baseLayers = useMemo(() => ([
    { kind: 'text', id: 't1', text: t('placeholders.templateDefaults.inviteLead'), x: CANVAS_W * 0.29, y: CANVAS_H * 0.18, size: 18, color: '#4B5563', weight: '700', align: 'center', font: 'System' },
    { kind: 'text', id: 't2', text: String(eventType).toUpperCase(), x: CANVAS_W * 0.10, y: CANVAS_H * 0.26, size: 18, color: '#5B2B2B', weight: '900', align: 'left',   font: 'Montserrat' },
    { kind: 'text', id: 't3', text: eventDescription,                x: CANVAS_W * 0.10, y: CANVAS_H * 0.42, size: 24, color: '#6B2A4A', weight: '800', align: 'center', font: 'Pacifico' },
    { kind: 'text', id: 't4', text: formattedDateTime,               x: CANVAS_W * 0.06, y: CANVAS_H * 0.60, size: 14, color: '#374151', weight: '700', align: 'left',   font: 'Lato' },
    { kind: 'text', id: 't5', text: eventName,                       x: CANVAS_W * 0.33, y: CANVAS_H * 0.76, size: 14, color: '#374151', weight: '700', align: 'left',   font: 'Lato' },
  ]), [eventType, eventDescription, formattedDateTime, eventName, i18n.language]);

  const [layers, setLayers] = useState(baseLayers);
  const [initializedFromEvent, setInitializedFromEvent] = useState(false);
  useEffect(() => {
    if (currentEvent && !initializedFromEvent) {
      setLayers(baseLayers);
      setInitializedFromEvent(true);
    }
  }, [currentEvent, baseLayers, initializedFromEvent]);

  const [selectedId, setSelectedId] = useState('t3');
  const [hideSelection, setHideSelection] = useState(false);
  const selected = useMemo(() => layers.find(l => l.id === selectedId), [layers, selectedId]);

  const shotRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const [panel, setPanel] = useState('edit');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Estados para los modales personalizados
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [pendingUploadUri, setPendingUploadUri] = useState(null);

  const PREV_W = width - 32;
  const PREV_H = PREV_W * 1.4;
  const pScale = useSharedValue(1);
  const pStartScale = useSharedValue(1);
  const pTX = useSharedValue(0);
  const pTY = useSharedValue(0);
  const pStartX = useSharedValue(0);
  const pStartY = useSharedValue(0);

  const resetPreviewTransform = () => {
    pScale.value = 1; pTX.value = 0; pTY.value = 0;
  };

  useEffect(() => {
    if (previewVisible) resetPreviewTransform();
  }, [previewVisible]);

  const pinchPreview = Gesture.Pinch()
    .onBegin(() => { pStartScale.value = pScale.value; })
    .onUpdate((e) => {
      const next = Math.max(1, Math.min(4, pStartScale.value * e.scale));
      pScale.value = next;
      const maxX = (PREV_W * (next - 1)) / 2;
      const maxY = (PREV_H * (next - 1)) / 2;
      pTX.value = Math.max(-maxX, Math.min(maxX, pTX.value));
      pTY.value = Math.max(-maxY, Math.min(maxY, pTY.value));
    });

  const panPreview = Gesture.Pan()
    .onBegin(() => { pStartX.value = pTX.value; pStartY.value = pTY.value; })
    .onUpdate((e) => {
      const maxX = (PREV_W * (pScale.value - 1)) / 2;
      const maxY = (PREV_H * (pScale.value - 1)) / 2;
      const nx = pStartX.value + e.translationX;
      const ny = pStartY.value + e.translationY;
      pTX.value = Math.max(-maxX, Math.min(maxX, nx));
      pTY.value = Math.max(-maxY, Math.min(maxY, ny));
    });

  const doubleTapReset = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    resetPreviewTransform();
  });

  const previewGestures = Gesture.Simultaneous(doubleTapReset, pinchPreview, panPreview);

  const previewAStyle = useAnimatedStyle(() => ({
    width: PREV_W,
    height: PREV_H,
    borderRadius: 16,
    transform: [
      { translateX: pTX.value },
      { translateY: pTY.value },
      { scale: pScale.value },
    ],
  }));

  const patchLayer = (id, patch) => setLayers(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  const changeSelected = (patch) => { if (selected) patchLayer(selected.id, patch); };
  const updateLayerPosition = (id, nx, ny) => patchLayer(id, { x: nx, y: ny });

  const addText = () => {
    const id = `t${Date.now()}`;
    setLayers(prev => [...prev, {
      kind: 'text', id, text: t('fontPanel.previewSample'),
      x: CANVAS_W * 0.5, y: CANVAS_H * 0.7,
      size: 20, color: '#111827', weight: '700', align: 'center', font: 'System'
    }]);
    setSelectedId(id);
  };

  const addSticker = (uri) => {
    const id = `s${Date.now()}`;
    setLayers(prev => [...prev, {
      kind: 'sticker',
      id, uri,
      x: CANVAS_W * 0.25, y: CANVAS_H * 0.25,
      scale: 1, rotate: 0, base: 160, locked: false,
    }]);
    setSelectedId(id);
  };

  const duplicate = () => {
    if (!selected) return;
    const id = `${selected.kind === 'text' ? 't' : 's'}${Date.now()}`;
    const copy = { ...selected, id, y: selected.y + 18 };
    setLayers(prev => [...prev, copy]);
    setSelectedId(id);
  };

  const remove = () => {
    if (!selected) return;
    setLayers(prev => prev.filter(l => l.id !== selected.id));
    setSelectedId(prev => (prev === selected.id ? null : prev));
  };

  const bringToFront = () => {
    if (!selected) return;
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === selected.id);
      if (idx < 0) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.push(item);
      return arr;
    });
  };
  const sendToBack = () => {
    if (!selected) return;
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === selected.id);
      if (idx < 0) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.unshift(item);
      return arr;
    });
  };

  const toggleLock = () => {
    if (selected?.kind !== 'sticker') return;
    patchLayer(selected.id, { locked: !selected.locked });
  };

  const updateSticker = (id, patch) => patchLayer(id, patch);

  const pickStickerFromDevice = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!res.canceled && res.assets?.[0]?.uri) addSticker(res.assets[0].uri);
  };

  const waitNextFrame = () =>
    new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => resolve());
      });
    });

  const captureWithoutSelection = async () => {
    setSelectedId(null);
    setHideSelection(true);
    await waitNextFrame();
    const uri = await shotRef.current.capture();
    setHideSelection(false);
    return uri;
  };

  const openPreview = async () => {
    try {
      setPreviewLoading(true);
      const uri = await captureWithoutSelection();
      setPreviewUri(uri);
      setPreviewVisible(true);
    } catch (e) {
      Alert.alert(t('alerts.error'), t('alerts.previewError'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmAndUpload = (forcedUri) => {
    setPendingUploadUri(forcedUri);
    setConfirmModalVisible(true);
  };

  const uploadInvitation = async (forcedUri) => {
    const eid = activeEventId != null ? Number(activeEventId) : null;
    if (!eid) {
      Alert.alert(t('alerts.eventRequiredTitle'), t('alerts.eventRequiredMsg'));
      return;
    }
    try {
      setIsUploading(true);
      const uri = forcedUri ?? await captureWithoutSelection();

      const form = new FormData();
      form.append('invitation_photo', { uri, name: `invitation_${eid}.jpg`, type: 'image/jpeg' });

      const resp = await fetch(`${API_URL}/events/${eid}/upload-invitation-photo/`, {
        method: 'POST',
        headers: { ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}) },
        body: form,
      });

      if (!resp.ok) {
        if (resp.status === 403) throw new Error('Prohibido (403): Debes ser owner del evento.');
        if (resp.status === 401) throw new Error('No autorizado (401): Inicia sesión nuevamente.');
        const txt = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status} - ${txt}`);
      }

      setSuccessModalVisible(true);
    } catch (e) {
      Alert.alert(t('alerts.error'), t('alerts.uploadError', { msg: String(e?.message || e) }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessModalVisible(false);
    setPreviewVisible(false);
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Events' },
        { name: 'InvitationsHome', params: { event: currentEvent || null, eventId: activeEventId || null, fromEditor: true, refreshToken: Date.now() } },
      ],
    });
  };

  const shareImage = async (forcedUri) => {
    try {
      const uri = forcedUri ?? await captureWithoutSelection();
      await Sharing.shareAsync(uri);
    }  catch (e) { Alert.alert(t('alerts.error'), t('alerts.shareError')); }
  };

  const [showCustom, setShowCustom] = useState(false);
  const [customHex, setCustomHex] = useState(selected?.color || '#111827');
  useEffect(() => { setCustomHex(selected?.color || '#111827'); }, [selectedId]);
  const handleCustomChange = (hex) => { setCustomHex(hex); if (selected?.kind === 'text') changeSelected({ color: hex }); };

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F2FA' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.brand}>{t('title')}</Text>

        {/* Previsualizar */}
        <TouchableOpacity
          onPress={openPreview}
          disabled={previewLoading}
          style={[styles.previewBtn, previewLoading && { opacity: 0.6 }]}
        >
          {previewLoading ? (
            <ActivityIndicator size="small" color="#6B21A8" />
          ) : (
            <>
              <Ionicons name="eye-outline" size={16} color="#6B21A8" />
              <Text style={styles.previewBtnText}>{t('preview')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Lienzo */}
        <View style={styles.canvasWrap} pointerEvents="box-none">
          <ViewShot ref={shotRef} options={{ format: 'jpg', quality: 0.95 }}>
            <ImageBackground
              source={template?.src}
              style={{ width: CANVAS_W, height: CANVAS_H }}
              imageStyle={{ borderRadius: 16 }}
            >
              <View style={{ flex: 1 }} pointerEvents="box-none">
                {layers.map(l => (
                  l.kind === 'text'
                    ? (
                      <DraggableText
                        key={l.id}
                        id={l.id}
                        text={l.text}
                        color={l.color}
                        size={l.size}
                        weight={l.weight}
                        align={l.align}
                        font={l.font}
                        x={l.x} y={l.y}
                        onSelect={setSelectedId}
                        selected={selectedId === l.id}
                        onDragEnd={updateLayerPosition}
                        clampW={CANVAS_W - 10}
                        clampH={CANVAS_H - 10}
                        hideSelection={hideSelection}
                      />
                    )
                    : (
                      <DraggableSticker
                        key={l.id}
                        id={l.id}
                        uri={l.uri}
                        x={l.x} y={l.y}
                        scale={l.scale}
                        rotate={l.rotate}
                        base={l.base}
                        locked={l.locked}
                        gesturesEnabled={!isAdjusting}
                        onSelect={setSelectedId}
                        selected={selectedId === l.id}
                        onUpdate={(id, patch) => updateSticker(id, patch)}
                        clampW={CANVAS_W - 10}
                        clampH={CANVAS_H - 10}
                        hideSelection={hideSelection}
                      />
                    )
                ))}
              </View>
            </ImageBackground>
          </ViewShot>
        </View>

         {/* ⭐ NUEVO: Barra contextual */}
    {selected && (
      <ContextualActionBar
        selected={selected}
        onDelete={remove}
        onDuplicate={duplicate}
        onLock={toggleLock}
        onBringToFront={bringToFront}
        onSendToBack={sendToBack}
        onQuickRotate={() => {
          if (selected?.kind === 'sticker') {
            const current = selected.rotate || 0;
            changeSelected({ rotate: (current + 90) % 360 });
          }
        }}
        onSizePanel={() => setPanel('size')}
        onEditPanel={() => setPanel('edit')}
        t={t}
      />
    )}

        {/* Herramientas */}
        <View style={styles.toolbar}>
          <Tool icon="text-outline" label={t('toolbar.text')} onPress={() => setPanel('edit')}   active={panel === 'edit'} />
          <Tool icon="color-palette-outline" label={t('toolbar.color')} onPress={() => setPanel('color')} active={panel === 'color'} />
          <Tool icon="text" label={t('toolbar.size')} onPress={() => setPanel('size')} active={panel === 'size'} />
          <Tool icon="text-sharp" label={t('toolbar.font')} onPress={() => setPanel('font')} active={panel === 'font'} />
          <Tool label={t('toolbar.stickers')} onPress={() => setPanel('stickers')} active={panel === 'stickers'} />
        </View>

        {/* Paneles */}
        {panel === 'edit' && (
          <View style={styles.panel}>
            <Row>
              <Btn onPress={addText} icon="add-outline" text={t('actions.addText')} />
              <Btn onPress={duplicate} icon="copy-outline" text={t('actions.duplicate')} disabled={!selected} />
              <Btn onPress={remove} icon="trash-outline" text={t('actions.delete')} danger disabled={!selected} />
            </Row>

            {selected?.kind === 'sticker' && (
              <Row>
                <Btn onPress={bringToFront} icon="arrow-up-circle-outline" text={t('actions.front')} />
                <Btn onPress={sendToBack} icon="arrow-down-circle-outline" text={t('actions.back')} />
                <Btn onPress={toggleLock} icon={selected.locked ? 'lock-open-outline' : 'lock-closed-outline'} text={selected.locked ? t('actions.unlock') : t('actions.lock')} />
              </Row>
            )}

            {selected?.kind === 'text' && (
              <>
                <EditableText value={selected.text} onChange={(t) => changeSelected({ text: t })} />
                <Row>
                  <Toggle
                    active={selected.weight === '900'}
                    onPress={() => changeSelected({ weight: selected.weight === '900' ? '700' : '900' })}
                    icon="text-outline"
                    text={t('actions.bold')}
                  />
                  <Toggle
                    active={!!getFontFamily(selected.font)}
                    onPress={() => changeSelected({ font: getFontFamily(selected.font) ? 'System' : 'Pacifico' })}
                    icon="brush-outline"
                    text={t('actions.toggleFont')}
                  />
                </Row>
              </>
            )}
          </View>
        )}

        {panel === 'color' && selected?.kind === 'text' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{t('colorPanel.title')}</Text>
            <View style={styles.palette}>
              {['#111827','#4B5563','#6B7280','#5B2B2B','#6B2A4A','#B91C1C','#15803D','#0EA5E9','#7C3AED','#F59E0B'].map(c => (
                <TouchableOpacity key={c} onPress={() => changeSelected({ color: c })} style={[styles.swatch, { backgroundColor: c }]} />
              ))}
              <TouchableOpacity
                onPress={() => setShowCustom(v => !v)}
                style={[styles.swatch, { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }]}
              >
                <Ionicons name="color-wand-outline" size={16} color="#6B21A8" />
              </TouchableOpacity>
            </View>

            {showCustom && (
              <InlineColorPicker value={customHex} onChange={handleCustomChange} onClose={() => setShowCustom(false)} />
            )}
          </View>
        )}

        {panel === 'font' && selected?.kind === 'text' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{t('fontPanel.title')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
              {FONT_OPTIONS.map(opt => {
                const active = selected.font === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => changeSelected({ font: opt.key })}
                    style={[styles.fontCard, active && styles.fontCardActive]}
                  >
                    <Text style={[styles.fontLabel]}>{opt.label}</Text>
                    <Text numberOfLines={1} style={[styles.fontSample, { fontFamily: opt.family }]}>
                      {selected.text || t('fontPanel.previewSample')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Panel size */}
        {panel === 'size' && (
          <View style={styles.panel}>
            {selected?.kind === 'text' && (
              <>
                <Text style={styles.panelTitle}>{t('sizePanel.textSize', { size: Math.round(selected.size) })}</Text>
                <SizeSlider value={selected.size} min={10} max={64} onChange={(v) => changeSelected({ size: v })} />
              </>
            )}

            {selected?.kind === 'sticker' && (
              <>
                <Text style={styles.panelTitle}>{t('sizePanel.stickerTitle')}</Text>

                <LiveSlider
                  title={t('sizePanel.basePx')}
                  value={selected.base ?? 160}
                  min={60}
                  max={480}
                  step={2}
                  format={(v)=>`${Math.round(v)} px`}
                  onStart={() => setIsAdjusting(true)}
                  onLive={(v)  => changeSelected({ base: Math.round(v) })}
                  onCommit={() => setIsAdjusting(false)}
                />
                <LiveSlider
                  title={t('sizePanel.scale')}
                  value={selected.scale ?? 1}
                  min={0.25}
                  max={4}
                  step={0.01}
                  onStart={() => setIsAdjusting(true)}
                  onLive={(v)  => changeSelected({ scale: v })}
                  onCommit={() => setIsAdjusting(false)}
                />
                <LiveSlider
                  title={t('sizePanel.rotation')}
                  value={selected.rotate ?? 0}
                  min={0}
                  max={360}
                  step={1}
                  format={(v) => `${Math.round(v)}°`}
                  onStart={() => setIsAdjusting(true)}
                  onLive={(v) => changeSelected({ rotate: Math.round(v) })}
                  onCommit={(v) => {
                    changeSelected({ rotate: Math.round(v) });
                    setIsAdjusting(false);
                  }}
                />
              </>
            )}

            {!selected && <Text style={{ color:'#6B7280' }}>{t('sizePanel.selectHint')}</Text>}
          </View>
        )}

        {panel === 'stickers' && (
          <View style={styles.panel}>
            <Row>
              <Btn onPress={pickStickerFromDevice} icon="cloud-upload-outline" text={t('actions.uploadImage')} />
            </Row>

           <Text style={[styles.panelTitle, { marginTop: 10 }]}>{t('stickersPanel.categories')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Object.entries(STICKER_CATEGORIES).map(([cat, list]) => (
                <View key={cat} style={{ marginRight: 16 }}>
                  <Text style={{ fontWeight: '700', marginBottom: 8 }}>{t(`stickersPanel.groups.${cat}`, cat)}</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {list.map((asset, i) => (
                      <TouchableOpacity key={i} onPress={() => addSticker(asset)}>
                        <Image
                          source={asset}
                          style={{ width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderColor: '#EEE' }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Guardar / Compartir */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={[styles.bottomBtn, { backgroundColor: '#111827', opacity: isUploading ? 0.7 : 1 }]}
            onPress={() => confirmAndUpload()}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.bottomBtnText}>{t('actions.upload')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: '#6B21A8' }]} onPress={() => shareImage()}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.bottomBtnText}>{t('actions.share')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL DE PREVISUALIZACIÓN */}
      <Modal
        visible={previewVisible}
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={{ flex:1, backgroundColor:'#000' }}>
          {/* Header modal */}
          <View style={[styles.header, { marginTop: 36 }]}>
            <TouchableOpacity onPress={() => setPreviewVisible(false)} style={styles.backBtn}>
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
            <Text style={[styles.brand, { color:'#fff' }]}>{t('previewModal.title')}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Área imagen con zoom/pan */}
          <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:16 }}>
            {!previewUri ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <GestureDetector gesture={previewGestures}>
                <Animated.Image
                  source={{ uri: previewUri }}
                  style={previewAStyle}
                  resizeMode="contain"
                />
              </GestureDetector>
            )}
          </View>

          {/* Nota y acciones */}
          <Text style={{ color:'#9CA3AF', textAlign:'center', marginHorizontal:16, marginBottom:8 }}>
            {t('previewModal.note')}
          </Text>
          <View style={{ flexDirection:'row', gap:12, paddingHorizontal:16, paddingBottom:24 }}>
            <TouchableOpacity
              style={[styles.bottomBtn, { backgroundColor:'#111827', flex:1, opacity: isUploading ? 0.7 : 1 }]}
              onPress={() => confirmAndUpload(previewUri)}
              disabled={isUploading || !previewUri}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.bottomBtnText}>{t('actions.upload')}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bottomBtn, { backgroundColor:'#6B21A8', flex:1 }]}
              onPress={() => shareImage(previewUri)}
              disabled={!previewUri}
            >
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={styles.bottomBtnText}>{t('actions.share')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN */}
      <ConfirmModal
        visible={confirmModalVisible}
        title={t('alerts.confirmSaveTitle')}
        message={t('alerts.confirmSaveMsg')}
        cancelText={t('actions.cancel')}
        confirmText={t('actions.upload')}
        onCancel={() => {
          setConfirmModalVisible(false);
          setPendingUploadUri(null);
        }}
        onConfirm={() => {
          setConfirmModalVisible(false);
          uploadInvitation(pendingUploadUri);
          setPendingUploadUri(null);
        }}
      />

      {/* MODAL DE ÉXITO */}
      {/* MODAL DE ÉXITO */}
<SuccessModal
  visible={successModalVisible}
  title={t('alerts.doneTitle')}
  message={t('alerts.doneMsg')}
  onClose={handleSuccessClose}
/>

    </View>
  );
}

function Tool({ icon, label, onPress, active }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tool, active && styles.toolActive]}>
      <Ionicons name={icon} size={18} color={active ? '#fff' : '#6B21A8'} />
      <Text style={[styles.toolText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function Row({ children }) { return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>{children}</View>; }
function Btn({ onPress, icon, text, danger, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.btn, danger && { borderColor: '#DC2626' }, disabled && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={16} color={danger ? '#DC2626' : '#111827'} />
      <Text style={[styles.btnText, danger && { color: '#DC2626' }]}>{text}</Text>
    </TouchableOpacity>
  );
}
function Toggle({ active, onPress, icon, text }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, active && { backgroundColor: '#EEF2FF' }]}>
      <Ionicons name={icon} size={16} color="#111827" />
      <Text style={styles.btnText}>{text}</Text>
    </TouchableOpacity>
  );
}

// ========== NUEVO COMPONENTE ==========
function ContextualActionBar({ 
  selected, 
  onDelete, 
  onDuplicate, 
  onLock, 
  onBringToFront, 
  onSendToBack,
  onQuickRotate,
  onSizePanel,
  onEditPanel,
  t 
}) {
  if (!selected) return null;

  const isSticker = selected.kind === 'sticker';
  const isText = selected.kind === 'text';

  return (
    <View style={styles.contextBar}>
      {/* Header */}
      <View style={styles.contextHeader}>
        <Ionicons 
          name={isSticker ? "image" : "text"} 
          size={16} 
          color="#6B21A8" 
        />
        <Text style={styles.contextTitle}>
          {isSticker ? 'Sticker seleccionado' : 'Texto seleccionado'}
        </Text>
      </View>

      {/* Acciones */}
      <View style={styles.contextActions}>
        {/* ELIMINAR */}
        <TouchableOpacity 
          style={[styles.contextBtn, styles.contextBtnDanger]} 
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
          <Text style={[styles.contextBtnText, { color: '#DC2626' }]}>
            Eliminar
          </Text>
        </TouchableOpacity>

        {/* DUPLICAR */}
        <TouchableOpacity 
          style={styles.contextBtn} 
          onPress={onDuplicate}
        >
          <Ionicons name="copy-outline" size={20} color="#6B21A8" />
          <Text style={styles.contextBtnText}>Duplicar</Text>
        </TouchableOpacity>

        {/* TAMAÑO */}
        <TouchableOpacity 
          style={styles.contextBtn} 
          onPress={onSizePanel}
        >
          <Ionicons name="resize-outline" size={20} color="#6B21A8" />
          <Text style={styles.contextBtnText}>Tamaño</Text>
        </TouchableOpacity>

        {/* SOLO PARA STICKERS */}
        {isSticker && (
          <>
            <TouchableOpacity 
              style={styles.contextBtn} 
              onPress={onQuickRotate}
            >
              <Ionicons name="sync-outline" size={20} color="#6B21A8" />
              <Text style={styles.contextBtnText}>Rotar 90°</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contextBtn} 
              onPress={onLock}
            >
              <Ionicons 
                name={selected.locked ? "lock-open-outline" : "lock-closed-outline"} 
                size={20} 
                color="#6B21A8" 
              />
              <Text style={styles.contextBtnText}>
                {selected.locked ? 'Desbloquear' : 'Bloquear'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contextBtn} 
              onPress={onBringToFront}
            >
              <Ionicons name="arrow-up-circle-outline" size={20} color="#6B21A8" />
              <Text style={styles.contextBtnText}>Al frente</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contextBtn} 
              onPress={onSendToBack}
            >
              <Ionicons name="arrow-down-circle-outline" size={20} color="#6B21A8" />
              <Text style={styles.contextBtnText}>Atrás</Text>
            </TouchableOpacity>
          </>
        )}

        {/* SOLO PARA TEXTO */}
        {isText && (
          <TouchableOpacity 
            style={styles.contextBtn} 
            onPress={onEditPanel}
          >
            <Ionicons name="create-outline" size={20} color="#6B21A8" />
            <Text style={styles.contextBtnText}>Editar texto</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function EditableText({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState(value);
  useEffect(() => setTmp(value), [value]);

  return (
    <View style={{ marginTop: 10 }}>
      <TouchableOpacity onPress={() => { setTmp(value); setEditing(true); }} style={{ backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 }}>
        <Text style={{ color: '#111827' }}>{value}</Text>
      </TouchableOpacity>
      {editing && (
        <View style={{ marginTop: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <View style={{ padding: 10 }}>
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 8 }}>
              <TextInput style={{ minHeight: 80, color: '#111827' }} value={tmp} onChangeText={setTmp} placeholder="Escribe tu texto…" placeholderTextColor="#9CA3AF" multiline />
            </View>
            <Row>
              <TouchableOpacity style={[styles.btn, { marginTop: 8 }]} onPress={() => { onChange(tmp); setEditing(false); }}>
                <Ionicons name="checkmark-outline" size={16} color="#111827" />
                <Text style={styles.btnText}>Aplicar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { marginTop: 8 }]} onPress={() => setEditing(false)}>
                <Ionicons name="close-outline" size={16} color="#111827" />
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
            </Row>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 52, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 20, fontWeight: '800', color: '#111827' },

  previewBtn: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewBtnText: { color: '#6B21A8', fontWeight: '800', fontSize: 11 },

  canvasWrap: { padding: 16, alignItems: 'center' },

  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, width: '100%' },
  tool: { flex: 1, height: 42, backgroundColor: '#F3E8FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4, flexDirection: 'row' },
  toolActive: { backgroundColor: '#6B21A8' },
  toolText: { color: '#6B21A8', fontWeight: '800', fontSize: 9 },

  panel: { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F1E7FF' },
  panelTitle: { fontWeight: '800', color: '#111827', marginBottom: 8 },

  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },

  customWrap: { alignSelf: 'stretch', marginTop: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },

  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  btnText: { color: '#111827', fontWeight: '700', fontSize: 11 },

  fontCard: { width: 160, backgroundColor: '#FAFAFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 10, marginRight: 10 },
  fontCardActive: { borderColor: '#6B21A8', backgroundColor: '#F4EAFE' },
  fontLabel: { fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  fontSample: { fontSize: 20, color: '#111827' },

  bottomRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 28, marginTop: 12 },
  bottomBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  bottomBtnText: { color: '#fff', fontWeight: '800' },

  modalBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '800' },

  // ===== Barra contextual =====
  contextBar: {
    backgroundColor: '#FFFFFF',
    width: '92%',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    marginBottom: 15,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contextTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
    flex: 1,
  },
  contextActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  contextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contextBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  contextBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B21A8',
  },

  // ===== MODALES PERSONALIZADOS =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnPrimary: {
    flex: 1,
    backgroundColor: '#6B21A8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnSecondary: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnSuccess: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  modalBtnTextSecondary: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
});
