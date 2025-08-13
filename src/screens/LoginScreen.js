// src/screens/LoginScreen.js

import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ImageBackground,
  StyleSheet,
  Dimensions,
  Animated,             
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

 
  const carouselImages = [
    require('../../src/assets/images/carousel1.jpg'),
    require('../../src/assets/images/carousel2.jpg'),
    require('../../src/assets/images/carousel3.jpg'),
  ];
  const [currentImage, setCurrentImage] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
   
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(5000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentImage((currentImage + 1) % carouselImages.length);
      });
    };

    animate();
    const interval = setInterval(animate, 6000);
    return () => clearInterval(interval);
  }, [currentImage, fadeAnim]);
  

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Error', 'Ingresa email y contraseña');
    }
    setLoading(true);
    try {
      const res = await fetch('http://192.168.1.71:8000/login/', {
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
      console.log('LOGIN TOKEN ▶', token);

      const profileRes = await fetch('http://192.168.1.71:8000/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!profileRes.ok) {
        throw new Error('No pude cargar perfil de usuario');
      }
      const profile = await profileRes.json();
      console.log('PROFILE ▶', profile);

      setUser({ id: profile.user_id, token });
      navigation.replace('Events');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Algo falló durante el login');
    } finally {
      setLoading(false);
    }
  };

  const discovery = { authorizationEndpoint: 'http://192.168.1.71:8000/auth/login-google' };
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    redirectUri: AuthSession.makeRedirectUri({ scheme: 'galeriq', useProxy: true }),
    responseType: AuthSession.ResponseType.Code,
  }, discovery);

  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      (async () => {
        const r = await fetch(`http://192.168.1.71:8000/auth/callback?code=${response.params.code}`);
        const { access_token: token } = await r.json();
        const profileRes = await fetch('http://192.168.1.71:8000/me', {
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

  return (
    <View style={styles.background}>
      <Text style={styles.marca}>Galeriq</Text>
      <View style={styles.overlay} />

      <View style={styles.container}>
        <Text style={styles.title}>
          Bienvenid@ a galeriq
        </Text>
        <Text style={styles.subtitle}>
          Tu espacio para celebrar, recordar y compartir momentos.{' '}
          <Text>✨</Text>
        </Text>

        {/* CARRUSEL */}
        <Animated.Image
          source={carouselImages[currentImage]}
          style={[styles.carouselImage, { opacity: fadeAnim }]}
          resizeMode="cover"
        />
        

        {!showEmailForm ? (
          <>
            <TouchableOpacity
              style={[styles.button, (!request || loading) && styles.buttonDisabled]}
              onPress={() => { setLoading(true); promptAsync({ useProxy: true }); }}
              disabled={!request || loading}
            >
              {loading
                ? <ActivityIndicator color="#111827" />
                : <>
                    <Ionicons name="logo-google" size={24} color="#DB4437" />
                    <Text style={styles.buttonTextGoogle}>Continuar con Google</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonEmail} onPress={() => setShowEmailForm(true)}>
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
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.buttonText}>Iniciar sesión</Text>
              }
            </TouchableOpacity>
          </View>
        )}

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
              <TouchableOpacity onPress={() => { /* TODO */ }}>
                <Text style={styles.footerLink}>Recuperar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background:     { flex: 1, width, height: '100%', alignItems: 'center', backgroundColor: '#FFE8D6', marginBottom: 0 },
  marca:          { fontSize: 32, fontWeight: '700', color: 'black', marginBottom: 8, textAlign: 'center', marginTop: 40 },
  
  container:      { width: '100%', alignItems: 'center' },
  title:          { fontSize: 32, fontWeight: '700', color: '#442D49', marginBottom: 18, textAlign: 'center' },
  subtitle:       { fontSize: 19.5, color: '#6B5E70', marginBottom: 26, textAlign: 'center',width: '80%' },

 
  carouselImage:  {
    width: width * 0.9,
    height: height * 0.25,
    borderRadius: 10,
    marginBottom: 44,
  },

  button:         { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 28, width: '80%', marginBottom: 16, borderColor: '#B380B9', borderWidth: 1 },
  buttonEmail:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#B380B9', padding: 12, borderRadius: 28, width: '80%', marginBottom: 16, borderColor: '#B380B9', borderWidth: 1 },
  buttonDisabled: { opacity: 0.6 },
  loginBtn:       { backgroundColor: '#6B21A8', justifyContent: 'center' },
  buttonText:     { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '500', color: 'white', marginLeft: 8 },
  buttonTextGoogle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '500', color: 'black', marginLeft: 8 },

  form:           { width: '90%', alignItems: 'center' },
  input:          { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, width: '100%', padding: 10, fontSize: 14, color: '#111827', marginBottom: 12 },

  footer:         { flexDirection: 'row', marginTop: 24 },
  footerText:     { color: 'black', fontSize: 14 },
  footerLink:     { color: 'blue', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
