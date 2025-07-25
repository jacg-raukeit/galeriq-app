// src/screens/LoginScreen.js

import React, { useEffect, useState, useContext } from 'react';
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

  // LOGIN EMAIL/PASS
  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Error', 'Ingresa email y contraseña');
    }
    setLoading(true);
    try {
      // 1) POST /login → token
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
      console.log('LOGIN TOKEN ▶', token);

      // 2) GET /me → perfil
      const profileRes = await fetch('http://192.168.1.106:8000/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!profileRes.ok) {
        throw new Error('No pude cargar perfil de usuario');
      }
      const profile = await profileRes.json();
      console.log('PROFILE ▶', profile);

      // 3) actualiza contexto y navega
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
        // 1) intercambia código
        const r = await fetch(`http://192.168.1.106:8000/auth/callback?code=${response.params.code}`);
        const { access_token: token } = await r.json();
        // 2) GET /me
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

  return (
    <ImageBackground
      source={require('../../src/assets/images/fondol.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <View style={styles.container}>
        <Text style={styles.title}>Bienvenido de nuevo</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar tu hermoso viaje.</Text>

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
                    <Text style={styles.buttonText}>Continuar con Google</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={() => setShowEmailForm(true)}>
              <Ionicons name="mail-outline" size={24} color="#6B7280" />
              <Text style={styles.buttonText}>Iniciar con correo</Text>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background:     { flex: 1, width, height, justifyContent: 'center', alignItems: 'center' },
  overlay:        { position: 'absolute', top: 0, left: 0, width, height, backgroundColor: 'rgba(0,0,0,0.4)' },
  container:      { width: '80%', alignItems: 'center' },
  title:          { fontSize: 32, fontWeight: '700', color: '#FFF', marginBottom: 8, textAlign: 'center' },
  subtitle:       { fontSize: 16, color: '#FFF', marginBottom: 32, textAlign: 'center' },
  button:         { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 8, width: '100%', marginBottom: 16 },
  buttonDisabled: { opacity: 0.6 },
  loginBtn:       { backgroundColor: '#6B21A8', justifyContent: 'center' },
  buttonText:     { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '500', color: '#111827', marginLeft: 8 },
  form:           { width: '100%', alignItems: 'center' },
  input:          { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, width: '100%', padding: 10, fontSize: 14, color: '#111827', marginBottom: 12 },
  footer:         { flexDirection: 'row', marginTop: 24 },
  footerText:     { color: '#FFF', fontSize: 14 },
  footerLink:     { color: '#FFF', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
