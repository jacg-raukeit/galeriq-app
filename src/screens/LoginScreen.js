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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const navigation = useNavigation();
  const { setUser } = useContext(AuthContext);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [loading, setLoading]             = useState(false);

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

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Error', 'Ingresa email y contraseña');
    }
    setLoading(true);
    try {
      const res = await fetch('http://192.168.1.106:8000/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password }).toString(),
      });
      if (res.status !== 200) {
        if (res.status === 401) {
          return Alert.alert('Credenciales inválidas', 'Revisa tu email o contraseña');
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const { access_token: token } = await res.json();

      const profileRes = await fetch('http://192.168.1.106:8000/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!profileRes.ok) throw new Error('No pude cargar perfil de usuario');
      const profile = await profileRes.json();

      setUser({ id: profile.user_id, token });
      navigation.replace('Events');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Algo falló durante el login');
    } finally {
      setLoading(false);
    }
  };

  const discovery = { authorizationEndpoint: 'http://192.168.1.106:8000/auth/login-google' };
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    redirectUri: AuthSession.makeRedirectUri({ scheme: 'galeriq', useProxy: true }),
    responseType: AuthSession.ResponseType.Code,
  }, discovery);

  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      (async () => {
        const r = await fetch(`http://192.168.1.106:8000/auth/callback?code=${response.params.code}`);
        const { access_token: token } = await r.json();
        const profileRes = await fetch('http://192.168.1.106:8000/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profile = await profileRes.json();
        setUser({ id: profile.user_id, token });
        navigation.replace('Events');
      })().catch(() => {
        Alert.alert('Error OAuth', 'No se pudo autenticar con Google.');
      }).finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      Alert.alert('Error OAuth', response.error || 'Falló Google');
      setLoading(false);
    }
  }, [response]);

  const slide = slides[current];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFE8D6' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          bounces
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* BRAND */}
          <Text style={styles.marca}>Galeriq</Text>

          {/* HERO / CARRUSEL */}
          <View style={styles.hero}>
            <Animated.Image
              source={slide.img}
              style={[styles.carouselImage, { opacity: fadeAnim }]}
              resizeMode="cover"
            />
            {/* Overlay copy */}
            <Animated.View style={[styles.copyOverlay, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange:[0,1], outputRange:[8,0] }) }] }]}>
              <Text style={styles.copyTitle}>{slide.title}</Text>
              <Text style={styles.copySubtitle}>{slide.subtitle}</Text>
            </Animated.View>

            {/* Dots */}
            <View style={styles.dots}>
              {slides.map((_, i) => (
                <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
              ))}
            </View>
          </View>

          {/* SUBTÍTULO GENERAL */}
          <Text style={styles.subtitle}>
            Tu espacio para celebrar, recordar y compartir momentos. ✨
          </Text>

          {/* BENEFICIOS (ocupa el “hueco” de abajo y da valor) */}
          {!showEmailForm && (
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

              <TouchableOpacity style={styles.buttonEmail} onPress={() => setShowEmailForm(true)} activeOpacity={0.9}>
                <Ionicons name="mail-outline" size={24} color="white" />
                <Text style={styles.buttonText}>Continuar con correo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#6B7280"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
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
                <TouchableOpacity onPress={() => { /* TODO: recovery */ }}>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    backgroundColor: '#FFE8D6',
  },

  marca: {
    fontSize: 32, fontWeight: '800', color: 'black',
    marginTop: 24, marginBottom: 8, textAlign: 'center',
  },

  hero: {
    width: width * 0.9,
    height: height * 0.28,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
    marginTop: 6,
  },
  carouselImage: {
    width: '100%', height: '100%',
  },
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
    fontSize: 18.5, color: '#6B5E70',
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

  button:         {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12, borderRadius: 28, width: '85%',
    marginTop: 18, borderColor: '#B380B9', borderWidth: 1,
  },
  buttonEmail:    {
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
  input:          {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10,
    width: '100%', padding: 12, fontSize: 15, color: '#111827',
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },

  footer:         { flexDirection: 'row', marginTop: 18, alignItems: 'center' },
  footerText:     { color: 'black', fontSize: 14 },
  footerLink:     { color: '#1D4ED8', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  legalRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, marginBottom: 10,
    gap: 10,
  },
  legalLink: { color: '#6B5E70', fontSize: 12.5, textDecorationLine: 'underline' },
  dotSep: { color: '#6B5E70', fontSize: 12.5 },
});
