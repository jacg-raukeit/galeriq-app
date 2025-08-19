// src/screens/invitations/InviteEditorScreen.js
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';

import Ionicons from 'react-native-vector-icons/Ionicons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';


const FONT_OPTIONS = [
  { key: 'System', label: 'System', family: undefined },
  { key: 'Montserrat', label: 'Montserrat', family: 'Montserrat_700Bold' },
  { key: 'Lato', label: 'Lato', family: 'Lato_700Bold' },
  { key: 'Playfair', label: 'Playfair', family: 'PlayfairDisplay_700Bold' },
  { key: 'Lobster', label: 'Lobster', family: 'Lobster_400Regular' },
  { key: 'Pacifico', label: 'Pacifico', family: 'Pacifico_400Regular' },
  { key: 'Dancing', label: 'Dancing Script', family: 'DancingScript_700Bold' },
];
const getFontFamily = (key) => FONT_OPTIONS.find(f => f.key === key)?.family;


const { width } = Dimensions.get('window');
const CANVAS_W = width - 32;
const CANVAS_H = CANVAS_W * 1.4;


const clamp = (n, min = 0, max = 255) => Math.max(min, Math.min(max, Math.round(n)));
const hexToRgb = (hex) => {
  if (!hex) return { r: 17, g: 24, b: 39 }; // #111827
  let h = (hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return { r: 17, g: 24, b: 39 };
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const rgbToHex = ({ r, g, b }) =>
  '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('').toUpperCase();


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
    const next = { ...rgb, [k]: clamp(v, 0, 255) };
    setRgb(next);
    setHex(rgbToHex(next));
  };
  const handleSlideComplete = (k, v) => {
    const next = { ...rgb, [k]: clamp(v, 0, 255) };
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
            minimumValue={0}
            maximumValue={255}
            step={1}
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


function DraggableText({
  id, text, color, size, weight, align, font, x, y,
  onSelect, selected, onDragEnd, clampW, clampH,
}) {
  const xSV = useSharedValue(x);
  const ySV = useSharedValue(y);

  useEffect(() => { xSV.value = x; }, [x]);
  useEffect(() => { ySV.value = y; }, [y]);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = xSV.value; startY.value = ySV.value;
      runOnJS(onSelect)(id);
    })
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
          style={{
            color,
            fontSize: size,
            fontWeight: weightStyle,
            textAlign: align,
            fontFamily: family,
          }}
        >
          {text}
        </Text>
        {selected && <View style={{ height: 2, backgroundColor: '#6B21A8', marginTop: 2 }} />}
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
        <Text style={{ fontWeight: '800', color: '#111827' }}>{value}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontWeight: '700' }}>＋</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ marginTop: 8, textAlign: 'center', color: '#6B7280' }}>Toca +/- para ajustar</Text>
    </View>
  );
}


export default function InviteEditorScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const template = params?.template;

  const [layers, setLayers] = useState([
    { id: 't1', text: 'Te invito a mi', x: CANVAS_W * 0.2, y: CANVAS_H * 0.18, size: 18, color: '#4B5563', weight: '700', align: 'center', font: 'System' },
    { id: 't2', text: 'FIESTA DE CUMPLEAÑOS', x: CANVAS_W * 0.1, y: CANVAS_H * 0.30, size: 22, color: '#5B2B2B', weight: '900', align: 'left', font: 'Montserrat' },
    { id: 't3', text: 'Olivia', x: CANVAS_W * 0.28, y: CANVAS_H * 0.42, size: 34, color: '#6B2A4A', weight: '800', align: 'center', font: 'Pacifico' },
    { id: 't4', text: 'Sábado 13 de diciembre · 18:00', x: CANVAS_W * 0.12, y: CANVAS_H * 0.54, size: 14, color: '#374151', weight: '700', align: 'left', font: 'Lato' },
  ]);
  const [selectedId, setSelectedId] = useState('t3');
  const selected = useMemo(() => layers.find(l => l.id === selectedId), [layers, selectedId]);

  const shotRef = useRef(null);

  const [panel, setPanel] = useState('edit'); 
  const palette = ['#111827', '#4B5563', '#6B7280', '#5B2B2B', '#6B2A4A', '#B91C1C', '#15803D', '#0EA5E9', '#7C3AED', '#F59E0B'];

  const changeSelected = (patch) => {
    if (!selected) return;
    setLayers(prev => prev.map(l => (l.id === selected.id ? { ...l, ...patch } : l)));
  };
  const updateLayerPosition = (id, nx, ny) => {
    setLayers(prev => prev.map(l => (l.id === id ? { ...l, x: nx, y: ny } : l)));
  };

  const addText = () => {
    const id = `t${Date.now()}`;
    setLayers(prev => [
      ...prev,
      { id, text: 'Tu texto', x: CANVAS_W * 0.5, y: CANVAS_H * 0.7, size: 20, color: '#111827', weight: '700', align: 'center', font: 'System' },
    ]);
    setSelectedId(id);
  };
  const duplicate = () => {
    if (!selected) return;
    const id = `t${Date.now()}`;
    setLayers(prev => [...prev, { ...selected, id, y: selected.y + 18 }]);
    setSelectedId(id);
  };
  const remove = () => {
    if (!selected) return;
    setLayers(prev => prev.filter(l => l.id !== selected.id));
    setSelectedId(prev => (prev === selected.id ? null : prev));
  };

  const saveImage = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos permiso para guardar en tu galería.'); return; }
      const uri = await shotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Listo', 'Imagen guardada en tu galería.');
    } catch (e) { Alert.alert('Error', 'No se pudo guardar la imagen.'); }
  };
  const shareImage = async () => {
    try { const uri = await shotRef.current.capture(); await Sharing.shareAsync(uri); }
    catch (e) { Alert.alert('Error', 'No se pudo compartir la imagen.'); }
  };


  const [showCustom, setShowCustom] = useState(false);
  const [customHex, setCustomHex] = useState(selected?.color || '#111827');
  useEffect(() => { setCustomHex(selected?.color || '#111827'); }, [selectedId]);
  const handleCustomChange = (hex) => { setCustomHex(hex); if (selected) changeSelected({ color: hex }); };

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F2FA' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.brand}>Editor</Text>
        <View style={{ width: 40 }} />
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
                  <DraggableText
                    key={l.id}
                    id={l.id}
                    text={l.text}
                    color={l.color}
                    size={l.size}
                    weight={l.weight}
                    align={l.align}
                    font={l.font}
                    x={l.x}
                    y={l.y}
                    onSelect={setSelectedId}
                    selected={selectedId === l.id}
                    onDragEnd={updateLayerPosition}
                    clampW={CANVAS_W - 10}
                    clampH={CANVAS_H - 10}
                  />
                ))}
              </View>
            </ImageBackground>
          </ViewShot>
        </View>

        {/* Herramientas */}
        <View style={styles.toolbar}>
          <Tool icon="text-outline" label="Texto" onPress={() => setPanel('edit')} active={panel === 'edit'} />
          <Tool icon="color-palette-outline" label="Color" onPress={() => setPanel('color')} active={panel === 'color'} />
          <Tool icon="text" label="Tamaño" onPress={() => setPanel('size')} active={panel === 'size'} />
          <Tool icon="text-sharp" label="Fuente" onPress={() => setPanel('font')} active={panel === 'font'} />
          {/* <Tool icon="reorder-two-outline" label="Alinear" onPress={() => setPanel('align')} active={panel === 'align'} /> */}
        </View>

        {/* Paneles */}
        {panel === 'edit' && (
          <View style={styles.panel}>
            <Row>
              <Btn onPress={addText} icon="add-outline" text="Añadir" />
              <Btn onPress={duplicate} icon="copy-outline" text="Duplicar" disabled={!selected} />
              <Btn onPress={remove} icon="trash-outline" text="Eliminar" danger disabled={!selected} />
            </Row>
            {selected && (
              <>
                <EditableText value={selected.text} onChange={(t) => changeSelected({ text: t })} />
                <Row>
                  <Toggle
                    active={selected.weight === '900'}
                    onPress={() => changeSelected({ weight: selected.weight === '900' ? '700' : '900' })}
                    icon="text-outline"
                    text="Negrita"
                  />
                  <Toggle
                    active={!!getFontFamily(selected.font)}
                    onPress={() => changeSelected({ font: getFontFamily(selected.font) ? 'System' : 'Pacifico' })}
                    icon="brush-outline"
                    text="Alternar fuente"
                  />
                </Row>
              </>
            )}
          </View>
        )}

        {panel === 'color' && selected && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Color</Text>
            <View style={styles.palette}>
              {palette.map(c => (
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
              <InlineColorPicker
                value={customHex}
                onChange={handleCustomChange}
                onClose={() => setShowCustom(false)}
              />
            )}
          </View>
        )}

        {panel === 'font' && selected && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Fuente</Text>
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
                    <Text
                      numberOfLines={1}
                      style={[styles.fontSample, { fontFamily: opt.family }]}
                    >
                      {selected.text || 'Vista previa'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {panel === 'size' && selected && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Tamaño: {Math.round(selected.size)}</Text>
            <SizeSlider value={selected.size} min={10} max={64} onChange={(v) => changeSelected({ size: v })} />
          </View>
        )}

        {panel === 'align' && selected && (
          <View style={styles.panel}>
            <Row>
              <Chip active={selected.align === 'left'} onPress={() => changeSelected({ align: 'left' })} label="Izquierda" />
              <Chip active={selected.align === 'center'} onPress={() => changeSelected({ align: 'center' })} label="Centro" />
              <Chip active={selected.align === 'right'} onPress={() => changeSelected({ align: 'right' })} label="Derecha" />
            </Row>
          </View>
        )}

        {/* Guardar / Compartir */}
        <View style={styles.bottomRow}>
          <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: '#111827' }]} onPress={saveImage}>
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.bottomBtnText}>Guardar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: '#6B21A8' }]} onPress={shareImage}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.bottomBtnText}>Compartir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && { backgroundColor: '#6B21A8' }]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
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

  canvasWrap: { padding: 16, alignItems: 'center' },

  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  tool: { flex: 1, height: 42, backgroundColor: '#F3E8FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4, flexDirection: 'row' },
  toolActive: { backgroundColor: '#6B21A8' },
  toolText: { color: '#6B21A8', fontWeight: '800', fontSize: 12.5 },

  panel: { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F1E7FF' },
  panelTitle: { fontWeight: '800', color: '#111827', marginBottom: 8 },

  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },

  customWrap: { alignSelf: 'stretch', marginTop: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },

  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  btnText: { color: '#111827', fontWeight: '700' },

  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EDE9FE' },
  chipText: { color: '#6B21A8', fontWeight: '800' },

  fontCard: {
    width: 160,
    backgroundColor: '#FAFAFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    marginRight: 10,
  },
  fontCardActive: {
    borderColor: '#6B21A8',
    backgroundColor: '#F4EAFE',
  },
  fontLabel: { fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  fontSample: { fontSize: 20, color: '#111827' },

  bottomRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 28, marginTop: 2 },
  bottomBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  bottomBtnText: { color: '#fff', fontWeight: '800' },

  modalBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '800' },
});
