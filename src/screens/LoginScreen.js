// src/screens/LoginScreen.js
import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
  Keyboard,
  Modal,
} from 'react-native';
import { BackHandler } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

const TOKEN_KEY   = 'galeriq_token';
const USER_ID_KEY = 'galeriq_user_id';

const API_BASE = 'http://143.198.138.35:8000';

function AnimatedGradientBackground({
  palettes,            // Array de arrays de colores (cada sub-array = una escena)
  duration = 10000,    // ms que dura el crossfade entre escenas
  holdMs = 20000,       // ms que se mantiene una escena antes del siguiente cambio
  style,
  easing = Easing.inOut(Easing.cubic),
}) {
  const DEFAULTS = [
    ['#FFDEE9', '#B5FFFC', '#C7D2FE'],
    ['#FEE2E2', '#FDE68A', '#C7F9CC'],
    ['#E9D5FF', '#FBCFE8', '#DBEAFE'],
    ['#FDE68A', '#FCA5A5', '#A7F3D0'],
    ['#DBEAFE', '#C7D2FE', '#E9D5FF'],
    ['#FBCFE8', '#FDE68A', '#BFE7FF'],
    ['#A7F3D0', '#FDE68A', '#FBCFE8'],
    ['#FFD6E7', '#E2E2FF', '#C6F5D9'],
  ];
  const PALETTES = (palettes?.length >= 2 ? palettes : DEFAULTS);

  //dirección del gradiente para dar “movimiento”
  const EDGES = [
    { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
    { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
    { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } },
  ];

  const [idx, setIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const fade = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const cycle = () => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration,
      easing,
      useNativeDriver: true,
    }).start(() => {
      setIdx(nextIdx);
      setNextIdx((prev) => (prev + 1) % PALETTES.length);
      timeoutRef.current = setTimeout(cycle, holdMs);
    });
  };

  useEffect(() => {
    cycle();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      fade.stopAnimation();
    };
  }, []);

  const currentColors = PALETTES[idx];
  const nextColors = PALETTES[nextIdx];

  const dirA = EDGES[idx % EDGES.length];
  const dirB = EDGES[nextIdx % EDGES.length];

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      {/* Capa A */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
        ]}
      >
        <LinearGradient
          colors={currentColors}
          start={dirA.start}
          end={dirA.end}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Capa B */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
        ]}
      >
        <LinearGradient
          colors={nextColors}
          start={dirB.start}
          end={dirB.end}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
export default function LoginScreen() {
  const navigation = useNavigation();
  const { setUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [bootLoading, setBootLoading]   = useState(true);  
  const [rememberMe, setRememberMe]     = useState(true);  

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [kbOpen, setKbOpen]               = useState(false);

  const [forgotOpen, setForgotOpen]       = useState(false);
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotSending, setForgotSending] = useState(false);

  const emailRef = useRef(null);
  const passRef  = useRef(null);

  useEffect(() => {
    const sh = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const hd = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => { sh.remove(); hd.remove(); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (savedToken) {
          const profileRes = await fetch(`${API_BASE}/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            setUser({ id: profile.user_id, token: savedToken });
            navigation.replace('Events');
            return;
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_ID_KEY);
          }
        }
      } catch (e) {
        console.log('Auto-login error:', e);
      } finally {
        setBootLoading(false);
      }
    })();
  }, [navigation, setUser]);

  const slides = [
    {
      img: require('../../src/assets/images/carousel1.jpg'),
      title: 'Organiza sin estrés',
      subtitle: 'Checklist y agenda inteligentes para tu evento.',
    },
    {
      img: require('../../src/assets/images/carousel2.jpg'),
      title: 'Invitaciones con QR',
      subtitle: 'Envía, confirma y controla accesos fácilmente.',
    },
    {
      img: require('../../src/assets/images/carousel3.jpg'),
      title: 'Álbumes compartidos',
      subtitle: 'Tus mejores momentos en un solo lugar.',
    },
  ];

  const [current, setCurrent] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.delay(4500),
        Animated.timing(fadeAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start(() => setCurrent((prev) => (prev + 1) % slides.length));
    };
    animate();
    const id = setInterval(animate, 5400);
    return () => clearInterval(id);
  }, [fadeAnim]);

  const persistSession = async (token, userId) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_ID_KEY, String(userId));
    } catch (e) {
      console.log('Error guardando sesión:', e);
    }
  };

  const clearPersistedSession = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_ID_KEY);
    } catch {}
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Error', 'Ingresa email y contraseña');
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password }).toString(),
      });
      if (res.status !== 200) {
        if (res.status === 401) {
          return Alert.alert('Credenciales inválidas', 'Revisa tu email o contraseña');
        }
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const { access_token: token } = await res.json();
      const profileRes = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!profileRes.ok) throw new Error('No pude cargar perfil de usuario');
      const profile = await profileRes.json();

      setUser({ id: profile.user_id, token });

      if (rememberMe) {
        await persistSession(token, profile.user_id);
      } else {
        await clearPersistedSession();
      }

      navigation.replace('Events');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Algo falló durante el login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    const value = (forgotEmail || '').trim().toLowerCase();
    const isEmail = /^\S+@\S+\.\S+$/.test(value);
    if (!isEmail) {
      return Alert.alert('Correo inválido', 'Escribe un correo válido.');
    }
    setForgotSending(true);
    try {
      const res = await fetch(`${API_BASE}/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email: value }).toString(),
      });
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 404) {
          return Alert.alert('No encontrado', 'No existe un usuario con ese correo.');
        }
        return Alert.alert('Error', text || 'No se pudo iniciar la recuperación.');
      }
      Alert.alert('Listo', 'Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.');
      setForgotOpen(false);
      setForgotEmail('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo iniciar la recuperación.');
    } finally {
      setForgotSending(false);
    }
  };

  const discovery = { authorizationEndpoint: `${API_BASE}/auth/login-google` };
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    redirectUri: AuthSession.makeRedirectUri({ scheme: 'galeriq', useProxy: true }),
    responseType: AuthSession.ResponseType.Code,
  }, discovery);

  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      (async () => {
        const r = await fetch(`${API_BASE}/auth/callback?code=${response.params.code}`);
        const { access_token: token } = await r.json();
        const profileRes = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profile = await profileRes.json();

        setUser({ id: profile.user_id, token });

        if (rememberMe) {
          await persistSession(token, profile.user_id);
        } else {
          await clearPersistedSession();
        }

        navigation.replace('Events');
      })().catch(() => {
        Alert.alert('Error OAuth', 'No se pudo autenticar con Google.');
      }).finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      Alert.alert('Error OAuth', response.error || 'Falló Google');
      setLoading(false);
    }
  }, [response, rememberMe, setUser, navigation]);

  const slide = slides[current];

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      if (kbOpen) {
        Keyboard.dismiss();
        return true;
      }
      if (showEmailForm) {
        setShowEmailForm(false);
        return true;
      }
      if (forgotOpen) {
        setForgotOpen(false);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [kbOpen, showEmailForm, forgotOpen]);






  if (bootLoading) {
    return (
      <View style={{ flex:1 }}>
        <AnimatedGradientBackground />
        <View style={{ ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" color="#6B21A8" />
          <Text style={{ marginTop: 10, color:'#111827' }}>Cargando…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AnimatedGradientBackground />

      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'android' ? 80 : 40}
        keyboardOpeningTime={0}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        enableAutomaticScroll
        showsVerticalScrollIndicator={false}
      >
        {/* BRAND */}
        <Text style={styles.marca}>Galeriq</Text>

        {/* HERO */}
        <View style={[
          styles.hero,
          { height: kbOpen ? Math.min(160, height * 0.20) : height * 0.28 }
        ]}>
          <Animated.Image
            source={slide.img}
            style={[styles.carouselImage, { opacity: fadeAnim }]}
            resizeMode="cover"
          />
          <Animated.View
            style={[
              styles.copyOverlay,
              { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange:[0,1], outputRange:[8,0] }) }] }
            ]}
          >
            <Text style={styles.copyTitle}>{slide.title}</Text>
            <Text style={styles.copySubtitle}>{slide.subtitle}</Text>
          </Animated.View>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* SUBTÍTULO GENERAL */}
        {!kbOpen && (
          <Text style={styles.subtitle}>
            Tu espacio para celebrar, recordar y compartir momentos. ✨
          </Text>
        )}

        {/* BENEFICIOS */}
        {!showEmailForm && !kbOpen && (
          <View style={styles.featuresRow}>
            <Feature icon="calendar-outline" text="Agenda inteligente" />
            <Feature icon="pricetags-outline" text="Proveedores confiables" />
            <Feature icon="images-outline" text="Álbum colaborativo" />
          </View>
        )}

        {/* BOTONES / FORM */}
        {!showEmailForm ? (
          <>
            <TouchableOpacity
              style={[styles.button, (!request || loading) && styles.buttonDisabled]}
              onPress={() => { setLoading(true); promptAsync({ useProxy: true }); }}
              disabled={!request || loading}
              activeOpacity={0.9}
            >
              {loading
                ? <ActivityIndicator color="#111827" />
                : <>
                    <Ionicons name="logo-google" size={24} color="#DB4437" />
                    <Text style={styles.buttonTextGoogle}>Continuar con Google</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonEmail}
              onPress={() => setShowEmailForm(true)}
              activeOpacity={0.9}
            >
              <Ionicons name="mail-outline" size={24} color="white" />
              <Text style={styles.buttonText}>Continuar con correo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.form}>
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passRef.current?.focus()}
            />

            {/* INPUT DE CONTRASEÑA CON OJITO */}
            <View style={styles.passwordContainer}>
              <TextInput
                ref={passRef}
                style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                placeholder="Contraseña"
                placeholderTextColor="#6B7280"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleEmailLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={showPassword ? "#6B21A8" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            {/* RECORDARME */}
            <TouchableOpacity
              onPress={() => setRememberMe(v => !v)}
              style={styles.rememberRow}
              activeOpacity={0.8}
            >
              <Ionicons
                name={rememberMe ? 'checkbox' : 'square-outline'}
                size={20}
                color={rememberMe ? '#6B21A8' : '#6B7280'}
              />
              <Text style={styles.rememberText}>Recordarme</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.loginBtn, loading && styles.buttonDisabled]}
              onPress={handleEmailLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.buttonText}>Iniciar sesión</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* FOOTER */}
        <View style={{ height: kbOpen ? 12 : 0 }} />
        {!kbOpen && (
          <>
            <View style={styles.footer}>
              {!showEmailForm ? (
                <>
                  <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.footerLink}>Regístrate</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.footerText}>¿Olvidaste tu contraseña? </Text>
                  <TouchableOpacity onPress={() => setForgotOpen(true)}>
                    <Text style={styles.footerLink}>Recuperar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* LEGAL / AYUDA */}
            <View style={styles.legalRow}>
              <TouchableOpacity><Text style={styles.legalLink}>Términos</Text></TouchableOpacity>
              <Text style={styles.dotSep}>·</Text>
              <TouchableOpacity><Text style={styles.legalLink}>Privacidad</Text></TouchableOpacity>
              <Text style={styles.dotSep}>·</Text>
              <TouchableOpacity><Text style={styles.legalLink}>Soporte</Text></TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      {/* === MODAL: Recuperar contraseña === */}
      <Modal
        visible={forgotOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Recuperar contraseña</Text>
            <Text style={styles.modalHint}>
              Escribe el correo asociado a tu cuenta y te enviaremos un enlace para restablecerla.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              autoFocus
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setForgotOpen(false)}
                disabled={forgotSending}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.primaryBtn, forgotSending && styles.buttonDisabled]}
                onPress={handleForgotSubmit}
                disabled={forgotSending}
              >
                {forgotSending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryText}>Enviar enlace</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Feature({ icon, text }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={18} color="#6B21A8" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 28,
    // backgroundColor: '#FFE8D6',
    minHeight: height * 1.05,
  },

  marca: {
    fontSize: 32, fontWeight: '800', color: 'black',
    marginTop: 24, marginBottom: 8, textAlign: 'center',
  },

  hero: {
    width: width * 0.9,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
    marginTop: 6,
  },
  carouselImage: { width: '100%', height: '100%' },
  copyOverlay: {
    position: 'absolute',
    left: 10, right: 10, bottom: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
  },
  copyTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  copySubtitle: { color: '#F3F4F6', marginTop: 2, fontSize: 13 },

  dots: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 10,
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#FFFFFF' },

  subtitle: {
    fontSize: 18.5, color: '#1f2937',
    marginTop: 16, textAlign: 'center', width: '85%',
  },

  featuresRow: {
    width: '90%',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  featureItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  featureText: { fontSize: 12.5, color: '#4B5563', textAlign: 'center', fontWeight: '700' },

  button: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12, borderRadius: 28, width: '85%',
    marginTop: 18, borderColor: '#B380B9', borderWidth: 1,
  },
  buttonEmail: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#B380B9',
    padding: 12, borderRadius: 28, width: '85%',
    marginTop: 12, borderColor: '#B380B9', borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.6 },
  loginBtn:       { backgroundColor: '#6B21A8', justifyContent: 'center' },
  buttonText:     { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: 'white', marginLeft: 8 },
  buttonTextGoogle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: 'black', marginLeft: 8 },

  form:           { width: '88%', alignItems: 'center', marginTop: 10 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10,
    width: '100%', padding: 12, fontSize: 15, color: '#111827',
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
    paddingRight: 10,
    marginBottom: 12,
  },
  eyeBtn: { paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },

  rememberRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  rememberText: { color: '#111827', fontWeight: '600' },

  footer:         { flexDirection: 'row', marginTop: 18, alignItems: 'center' },
  footerText:     { color: 'black', fontSize: 14 },
  footerLink:     { color: '#1D4ED8', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  legalRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, marginBottom: 10,
    gap: 10,
  },
  legalLink: { color: '#111827', fontSize: 12.5, textDecorationLine: 'underline' },
  dotSep: { color: '#111827', fontSize: 12.5 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCard: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#6B21A8' },
  modalHint:  { color: '#4B5563', marginTop: 6, marginBottom: 10 },
  modalActionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalBtn: {
    flex: 1, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn:  { backgroundColor: '#efeff4' },
  primaryBtn: { backgroundColor: '#6B21A8' },
  cancelText: { color: '#111827', fontWeight: '700' },
  primaryText:{ color: '#fff', fontWeight: '700' },
});
