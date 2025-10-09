// src/screens/RegisterScreen.js
import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image as ExpoImage } from 'expo-image';

const { width, height } = Dimensions.get('window');

const TOKEN_KEY = 'galeriq_token';
const USER_ID_KEY = 'galeriq_user_id';
const API_BASE = 'http://143.198.138.35:8000';

const BG_IMAGES = [
  require('../../src/assets/images/carousel1.jpg'),
  require('../../src/assets/images/carousel2.jpg'),
  require('../../src/assets/images/carousel3.jpg'),
  require('../../src/assets/images/fondol.jpg'),
];

export function BackgroundSlideshow({
  interval = 3500,
  transition = 900,
}) {
  const [ready, setReady] = useState(false);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Promise.all(BG_IMAGES.map(src => ExpoImage.prefetch(src)));
      } catch {}
      if (mounted) setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  const armTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIdx(prev => (prev + 1) % BG_IMAGES.length);
    }, interval);
  };

  useEffect(() => {
    if (!ready) return;
    armTimer();
    return () => clearTimeout(timerRef.current);
  }, [ready, idx]);

  if (!ready) {
    return <View style={StyleSheet.absoluteFill} />;
  }

  const source = BG_IMAGES[idx];

  return (
    <View style={StyleSheet.absoluteFill}>
      <ExpoImage
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={transition}
        cachePolicy="disk"
        recyclingKey={`bg-${idx}`}
        onLoad={armTimer}
      />
      <View style={{
        position:'absolute', top:0, left:0, right:0, bottom:0,
        backgroundColor:'rgba(0,0,0,0.35)'
      }}/>
    </View>
  );
}

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { setUser } = useContext(AuthContext);

  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const phoneValid = useMemo(() => phone.replace(/\D/g, '').length >= 10, [phone]);

  const passScore = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const canSubmit =
    fullName.trim().length > 2 &&
    emailValid &&
    phoneValid &&
    passScore >= 3 &&
    termsAccepted &&
    !loading;

  const persistSession = async (token, userId) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_ID_KEY, String(userId));
    } catch (e) {
      console.log('Error guardando sesión en registro:', e);
    }
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfileImageUri(result.assets?.[0]?.uri);
    }
  };

  const handleEmailRegister = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const payload = {
        full_name: fullName,
        email,
        phone,
        password,
        status: 'active',
        plan_id: 1,
        role_id: 2,
      };

      const regRes = await fetch(`${API_BASE}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!regRes.ok) {
        let detail;
        try {
          const errJson = await regRes.json();
          detail = errJson.detail || JSON.stringify(errJson);
        } catch {
          detail = await regRes.text();
        }
        throw new Error(detail);
      }

      const loginRes = await fetch(`${API_BASE}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password }).toString(),
      });
      if (!loginRes.ok) throw new Error('Login tras registro falló');
      const { access_token: token } = await loginRes.json();

      let profileRes = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!profileRes.ok) throw new Error('No se pudo cargar perfil');
      let profile = await profileRes.json();

      if (profileImageUri) {
        const formData = new FormData();
        const filename = profileImageUri.split('/').pop() || `avatar.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('profile_image', { uri: profileImageUri, name: filename, type });

        await fetch(`${API_BASE}/users/${profile.user_id}/profile-pic`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        profileRes = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        profile = await profileRes.json();
      }

      setUser({ id: profile.user_id, token });
      await persistSession(token, profile.user_id);

      navigation.replace('Events');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Algo falló durante el registro');
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = ['Muy débil', 'Débil', 'Media', 'Fuerte', 'Excelente'][passScore] || 'Muy débil';
  const strengthColor  = ['#DC2626', '#F97316', '#EAB308', '#16A34A', '#15803D'][passScore] || '#DC2626';
  const barWidth = ['20%', '40%', '60%', '80%', '100%'][passScore] || '20%';

  return (
    <View style={styles.container}>
      {/* Slideshow de fondo */}
      <BackgroundSlideshow interval={3000} transition={700} />

      {/* KeyboardAwareScrollView para evitar que el teclado tape inputs */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'android' ? 90 : 50}
        keyboardOpeningTime={0}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>Regístrate para empezar tu viaje con nosotros</Text>
          <Text style={styles.requiredLegend}>* Todos los campos son obligatorios</Text>

          {/* Avatar */}
          <View style={styles.avatarRow}>
            <Image
              source={profileImageUri ? { uri: profileImageUri } : require('../assets/images/avatar-placeholder.png')}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.avatarBtn} onPress={pickProfileImage} activeOpacity={0.9}>
              <Ionicons name="image-outline" size={16} color="#6B21A8" />
              <Text style={styles.avatarBtnText}>{profileImageUri ? 'Cambiar' : 'Seleccionar'} imagen</Text>
            </TouchableOpacity>
          </View>

          {/* Nombre completo */}
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor="#6B7280"
              value={fullName}
              onChangeText={setFullName}
              returnKeyType="next"
            />
          </View>

          {/* Email */}
          <View style={[styles.inputWrap, !emailValid && email.length > 0 ? styles.inputError : null]}>
            <Ionicons name="mail-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
          </View>
          {!emailValid && email.length > 0 && (
            <Text style={styles.errorText}>Ingresa un correo válido.</Text>
          )}

          {/* Telefono */}
          <View style={[styles.inputWrap, !phoneValid && phone.length > 0 ? styles.inputError : null]}>
            <Ionicons name="call-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              returnKeyType="next"
            />
          </View>
          {!phoneValid && phone.length > 0 && (
            <Text style={styles.errorText}>El teléfono debe tener al menos 10 dígitos.</Text>
          )}

          {/* Contraseña */}
          <View style={[styles.inputWrap, passScore <= 1 && password.length > 0 ? styles.inputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={showPassword ? '#6B21A8' : '#6B7280'}
              />
            </TouchableOpacity>
          </View>

          {/* Strength meter */}
          {password.length > 0 && (
            <View style={styles.strengthBox}>
              <View style={styles.strengthBarBg}>
                <View style={[styles.strengthBarFill, { width: barWidth, backgroundColor: strengthColor }]} />
              </View>
              <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
            </View>
          )}

          {/* Requisitos */}
          <View style={styles.requirements}>
            <Req ok={password.length >= 8} text="Mínimo 8 caracteres" />
            <Req ok={/[A-Z]/.test(password)} text="Una mayúscula" />
            <Req ok={/[a-z]/.test(password)} text="Una minúscula" />
            <Req ok={/\d/.test(password) || /[^A-Za-z0-9]/.test(password)} text="Número o símbolo" />
          </View>

          {/* Términos */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setTermsAccepted(!termsAccepted)}>
            <Ionicons name={termsAccepted ? 'checkbox' : 'square-outline'} size={20} color="#6B21A8" />
            <Text style={styles.termsText}>
              Acepto los <Text style={styles.link}>términos</Text> y la <Text style={styles.link}>política de privacidad</Text>
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
            onPress={handleEmailRegister}
            disabled={!canSubmit}
            activeOpacity={0.9}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Crear cuenta</Text>}
          </TouchableOpacity>

          {/* Link a login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Links inferiores */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity><Text style={styles.bottomLink}>Soporte</Text></TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity><Text style={styles.bottomLink}>Términos</Text></TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity><Text style={styles.bottomLink}>Privacidad</Text></TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

function Req({ ok, text }) {
  return (
    <View style={styles.reqItem}>
      <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={ok ? '#16A34A' : '#9CA3AF'} />
      <Text style={[styles.reqText, { color: ok ? '#16A34A' : '#6B7280' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width, height, justifyContent: 'center', alignItems: 'center' },

  bgImage: { width: '100%', height: '100%' },
  overlay:{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.35)' },

  scroll: { alignItems: 'center', padding: 16, paddingBottom: 28, minHeight: height * 1.05 },

  card: {
    width: '92%',
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginTop: 40,
  },

  title: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14.5, color: '#374151', textAlign: 'center', marginTop: 6, marginBottom: 6 },
  requiredLegend: { textAlign: 'center', color: '#6B7280', fontSize: 12.5, marginBottom: 10, fontStyle: 'italic' },

  avatarRow: { alignItems: 'center', marginBottom: 12 },
  avatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#F3F4F6' },
  avatarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: '#E9D5FF',
  },
  avatarBtnText: { color: '#6B21A8', fontWeight: '700' },

  inputWrap: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, marginTop: 10,
  },
  inputIcon: { marginRight: 6 },
  input: { flex: 1, paddingVertical: 12, color: '#111827', fontSize: 15 },
  eyeBtn: { padding: 6, marginLeft: 4 },

  errorText: { color: '#DC2626', fontSize: 12.5, marginTop: 4 },
  inputError: { borderColor: '#F59E0B' },

  strengthBox: { marginTop: 8 },
  strengthBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' },
  strengthBarFill: { height: 8, borderRadius: 999 },
  strengthLabel: { marginTop: 6, fontSize: 12.5, fontWeight: '700' },

  requirements: { marginTop: 10, gap: 6 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqText: { fontSize: 13, fontWeight: '600' },

  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  termsText: { color: '#374151', flexShrink: 1 },
  link: { color: '#6B21A8', textDecorationLine: 'underline', fontWeight: '700' },

  submitBtn: {
    marginTop: 16, backgroundColor: '#6B21A8',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    height: 48,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  footerText: { color: '#374151' },
  footerLink: { color: '#1D4ED8', fontWeight: '700', textDecorationLine: 'underline' },

  bottomLinks: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  bottomLink: { color: '#E5E7EB', textDecorationLine: 'underline', fontSize: 12.5 },
  dot: { color: '#E5E7EB', fontSize: 12.5 },

  loadingOverlay: {
    position:'absolute', left:0, right:0, top:0, bottom:0,
    backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center'
  },
});
