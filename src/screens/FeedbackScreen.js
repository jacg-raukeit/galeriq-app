// src/screens/FeedbackScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Linking,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';




const FEEDBACK_EMAIL = 'soporteGaleriq@gmail.com';
const MAX_CHARS = 800;

const TAGS = ['Bug', 'Sugerencia', 'Idea', 'UI/UX', 'Rendimiento'];



export default function FeedbackScreen({ navigation }) {
  
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;
  const blob3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val, delay = 0, min = 0, max = 1) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: max,
            duration: 5000,
            delay,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true, 
          }),
          Animated.timing(val, {
            toValue: min,
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    loop(blob1, 0);
    loop(blob2, 600);
    loop(blob3, 1200);
  }, [blob1, blob2, blob3]);

  
  const PARTICLES = 10;
  const particles = useMemo(
    () => new Array(PARTICLES).fill(0).map(() => ({
      x: new Animated.Value(Math.random() * 1),
      y: new Animated.Value(Math.random() * 1),
      o: new Animated.Value(0),
      s: new Animated.Value(0.9 + Math.random() * 0.6),
      d: 7000 + Math.random() * 4000,
    })),
    []
  );

  useEffect(() => {
    particles.forEach((p, idx) => {
      const anim = () => {
        p.x.setValue(Math.random());
        p.y.setValue(Math.random());
        Animated.parallel([
          Animated.timing(p.o, {
            toValue: 0.7,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.s, {
              toValue: 1.2,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(p.s, {
              toValue: 0.9 + Math.random() * 0.6,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(p.o, {
              toValue: 0.15,
              duration: p.d,
              easing: Easing.inOut(Easing.quad),
              delay: idx * 150,
              useNativeDriver: true,
            }),
            Animated.timing(p.o, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => anim());
      };
      anim();
    });
  }, [particles]);

  const titleScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleScale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleScale, titleOpacity]);

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const toggleTag = (t) => {
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const computedSubject = useMemo(() => {
    const tagStr = selectedTags.join(' · ');
    const starStr = rating > 0 ? `(${rating}⭐)` : '';
    const base = subject?.trim() ? subject.trim() : 'Feedback';
    return [base, tagStr, starStr].filter(Boolean).join(' ');
  }, [subject, selectedTags, rating]);

const openMail = async () => {
  const body =
`Dispositivo: ${Platform.OS}
Versión SO: ${Platform.Version}

Etiquetas: ${selectedTags.join(', ') || 'Ninguna'}
Calificación: ${rating > 0 ? `${rating}/5` : 'Sin calificar'}

Mensaje:
${message}`.slice(0, 2000);

  const mailto = `mailto:${encodeURIComponent(FEEDBACK_EMAIL)}?subject=${encodeURIComponent(
    computedSubject
  )}&body=${encodeURIComponent(body)}`;

  try {
    const supported = await Linking.canOpenURL(mailto);
    if (supported) {
      await Linking.openURL(mailto);
      // ✅ Marcamos que se abrió el cliente de correo
      openedMailRef.current = true;

      Alert.alert('¡Gracias!', 'Se abrió tu cliente de correo para enviar el feedback 🙌');
    } else {
      Alert.alert('No se pudo abrir el correo', 'Envíanos un email a ' + FEEDBACK_EMAIL);
    }
  } catch (e) {
    Alert.alert('Error', 'No fue posible abrir el cliente de correo.');
  }
};



  const onSend = () => {
    if (!message.trim()) {
      Alert.alert('Mensaje vacío', 'Cuéntanos un poco tu idea o problema.');
      return;
    }
    openMail();
  };

  const Star = ({ i }) => {
    const active = i <= rating;
    const scale = useRef(new Animated.Value(1)).current;
    const bump = () => {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 120, useNativeDriver: true }),
      ]).start();
      setRating(i);
    };
    return (
      <Animated.View style={{ transform: [{ scale }], marginHorizontal: 4 }}>
        <TouchableOpacity onPress={bump} activeOpacity={0.8}>
          <Ionicons
            name={active ? 'star' : 'star-outline'}
            size={30}
            color={active ? '#FFD166' : '#C5C5C5'}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

const resetForm = useCallback(() => {
  setRating(0);
  setSelectedTags([]);
  setSubject('');
  setMessage('');
}, []);

const navRef = useRef(navigation);
useEffect(() => { navRef.current = navigation; }, [navigation]);


const openedMailRef = useRef(false);
const [sentModalVisible, setSentModalVisible] = useState(false);
const sentTimeoutRef = useRef(null);


const sentAnim = useRef(new Animated.Value(0.8)).current;
useEffect(() => {
  if (sentModalVisible) {
    sentAnim.setValue(0.8);
    Animated.spring(sentAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 120,
    }).start();
  }
}, [sentModalVisible, sentAnim]);


useEffect(() => {
  const onChange = (nextState) => {
    if (nextState === 'active' && openedMailRef.current) {
      resetForm();
      openedMailRef.current = false;

      setSentModalVisible(true);

      if (sentTimeoutRef.current) clearTimeout(sentTimeoutRef.current);
      sentTimeoutRef.current = setTimeout(() => {
        setSentModalVisible(false);
        navRef.current?.replace('Events');
      }, 1500);
    }
  };

  const sub = AppState.addEventListener('change', onChange);
  return () => {
    sub.remove();
    if (sentTimeoutRef.current) clearTimeout(sentTimeoutRef.current);
  };
}, []);




useFocusEffect(
  React.useCallback(() => {
    if (openedMailRef.current) {
      resetForm();
      openedMailRef.current = false;
    }
  }, [])
);


  return (
    <SafeAreaView style={styles.screen}>
      {/* ==== FONDO ANIMADO ==== */}
      <View style={StyleSheet.absoluteFill}>
        {/* Blobs suaves */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.blob,
            {
              backgroundColor: '#A861B7',
              top: -80,
              left: -60,
              transform: [{ scale: blob1.interpolate({ inputRange: [0,1], outputRange: [1, 1.25] }) }],
              opacity: 0.18,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.blob,
            {
              backgroundColor: '#57C1AE',
              bottom: -80,
              right: -80,
              transform: [{ scale: blob2.interpolate({ inputRange: [0,1], outputRange: [1, 1.25] }) }],
              opacity: 0.16,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.blob,
            {
              backgroundColor: '#F8CBA6',
              top: 140,
              right: -40,
              transform: [{ scale: blob3.interpolate({ inputRange: [0,1], outputRange: [1, 1.22] }) }],
              opacity: 0.14,
            },
          ]}
        />

        {/* Partículas */}
        {particles.map((p, idx) => (
          <Animated.View
            key={idx}
            pointerEvents="none"
            style={[
              styles.particle,
              {
                opacity: p.o,
                transform: [
                  {
                    translateX: p.x.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 320],
                    }),
                  },
                  {
                    translateY: p.y.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 720],
                    }),
                  },
                  { scale: p.s },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* ==== HEADER ==== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#254236" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayúdanos a mejorar</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ==== CONTENIDO ==== */}
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Animated.Text
          style={[
            styles.title,
            { transform: [{ scale: titleScale }], opacity: titleOpacity },
          ]}
        >
          ¡Tu opinión importa!
        </Animated.Text>
        <Text style={styles.subtitle}>
          Cuéntanos qué calificacion le darias a tu experiencia y qué mejorarías o si encontraste algun bug.
        </Text>

        {/* Rating */}
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} i={i} />
          ))}
        </View>

        {/* Chips de tags */}
        <View style={styles.tagsRow}>
          {TAGS.map((t) => {
            const active = selectedTags.includes(t);
            return (
              <TouchableOpacity
                key={t}
                onPress={() => toggleTag(t)}
                style={[styles.tag, active && styles.tagActive]}
              >
                <Ionicons
                  name={active ? 'pricetag' : 'pricetag-outline'}
                  size={16}
                  color={active ? '#fff' : '#254236'}
                />
                <Text style={[styles.tagText, active && { color: '#fff' }]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Subject */}
        <View style={styles.inputGroup}>
          {/* <Text style={styles.label}>Asunto</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Ej. Problema al crear un evento"
            placeholderTextColor="#7a9089"
            style={styles.input}
            maxLength={80}
          /> */}
        </View>

        {/* Mensaje */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Mensaje</Text>
            <Text style={styles.counter}>
              {message.length} / {MAX_CHARS}
            </Text>
          </View>
          <TextInput
            value={message}
            onChangeText={(t) => t.length <= MAX_CHARS && setMessage(t)}
            placeholder="Escribe tu feedback aquí..."
            placeholderTextColor="#7a9089"
            style={[styles.input, styles.textarea]}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Botón enviar */}
        <TouchableOpacity
          style={[styles.primaryBtn, !message.trim() && { opacity: 0.6 }]}
          onPress={onSend}
          disabled={!message.trim()}
          activeOpacity={0.9}
        >
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Enviar feedback</Text>
        </TouchableOpacity>

        {/* Nota */}
        {/* <Text style={styles.note}>
          Abriremos tu cliente de correo con el mensaje prellenado para que puedas enviarlo.
        </Text> */}
      </ScrollView>


{/* Modal de ENVIADO */}
<Modal visible={sentModalVisible} transparent animationType="fade">
  <View style={styles.sentModalOverlay}>
    <View style={styles.sentModalCard}>
      <Animated.View style={{ transform: [{ scale: sentAnim }] }}>
        <Ionicons name="checkmark-circle" size={72} color="#57C1AE" />
      </Animated.View>
      <Text style={styles.sentTitle}>¡Enviado!</Text>
      <Text style={styles.sentSubtitle}>
        Gracias por tu feedback. Pronto nos pondremos en contacto contigo.
      </Text>
    </View>
  </View>
</Modal>



    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? 20 : 40,
  },
  headerTitle: { color: '#254236', fontSize: 18, fontWeight: '600' },

  container: { padding: 16, paddingBottom: 32 },
  title: { color: '#254236', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#254236', opacity: 0.8, marginBottom: 14, fontSize: 14 },

  ratingRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C9D5CE',
    backgroundColor: '#fff',
  },
  tagActive: { backgroundColor: '#254236', borderColor: '#254236' },
  tagText: { color: '#254236', fontWeight: '600', fontSize: 12 },

  inputGroup: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#254236', fontWeight: '700', marginBottom: 8 },
  counter: { color: '#254236', opacity: 0.65 },

  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEBDB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#254236',
    fontSize: 14,
  },
  textarea: { height: 140 },

  primaryBtn: {
    marginTop: 8,
    backgroundColor: '#254236',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#254236',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  note: { color: '#254236', opacity: 0.7, fontSize: 12, marginTop: 10, textAlign: 'center' },

  blob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
  },
  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },


  sentModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  alignItems: 'center',
  justifyContent: 'center',
},
sentModalCard: {
  width: '75%',
  backgroundColor: '#FFF',
  borderRadius: 16,
  paddingVertical: 24,
  paddingHorizontal: 16,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#EAEBDB',
},
sentTitle: {
  color: '#254236',
  fontSize: 20,
  fontWeight: '800',
  marginTop: 12,
},
sentSubtitle: {
  color: '#254236',
  opacity: 0.85,
  textAlign: 'center',
  marginTop: 6,
  fontSize: 13,
},


});
