// src/screens/RegisterScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

const { width, height } = Dimensions.get('window');
WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { setUser } = useContext(AuthContext);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // Configuración de Google con expo-auth-session
 const [request, response, promptAsync] = Google.useAuthRequest({
  expoClientId: '958338407333-ls8574fvhn4sj19oqo30sdbc2d4ngo3e.apps.googleusercontent.com',
  androidClientId: '958338407333-ls8574fvhn4sj19oqo30sdbc2d4ngo3e.apps.googleusercontent.com',
  redirectUri: 'https://auth.expo.io/angel-rauke/galeriq'
});

 
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleCallback(authentication.accessToken);
    }
  }, [response]);

  const handleGoogleCallback = async (accessToken) => {
    console.log('Enviando al backend:', accessToken);
    try {
      const res = await fetch('http://192.168.1.71:8000/register/', {
        
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_access_token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setUser({ id: data.user_id, token: data.access_token });
      navigation.replace('Events');
    } catch (e) {
      Alert.alert('Error', e.message);
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
      quality: 0.7,
    });
    if (!result.canceled && !result.cancelled) {
      setProfileImageUri(result.assets?.[0]?.uri ?? result.uri);
    }
  };

  const handleEmailRegister = async () => {
    if (!fullName || !email || !phone || !password || !termsAccepted) {
      return Alert.alert('Error', 'Completa todos los campos y acepta los términos');
    }
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
      const regRes = await fetch('http://192.168.1.71:8000/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!regRes.ok) {
        const err = await regRes.json();
        throw new Error(err.detail || `HTTP ${regRes.status}`);
      }

      const loginRes = await fetch('http://192.168.1.71:8000/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password }).toString(),
      });
      if (!loginRes.ok) throw new Error('Login tras registro falló');
      const { access_token: token } = await loginRes.json();

      let profileRes = await fetch('http://192.168.1.71:8000/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!profileRes.ok) throw new Error('No se pudo cargar perfil');
      let profile = await profileRes.json();

      if (profileImageUri) {
        const formData = new FormData();
        const filename = profileImageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('profile_image', {
          uri: profileImageUri,
          name: filename,
          type,
        });
        await fetch(`http://192.168.1.71:8000/users/${profile.user_id}/profile-pic`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        profileRes = await fetch('http://192.168.1.71:8000/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        profile = await profileRes.json();
      }

      setUser({ id: profile.user_id, token });
      navigation.replace('Events');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Algo falló durante el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../src/assets/images/fondol.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.container}>
        <Text style={styles.title}>Crea tu cuenta</Text>
        <Text style={styles.subtitle}>Regístrate para empezar tu viaje con nosotros</Text>

        {!showEmailForm ? (
          <>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={() => setShowEmailForm(true)}
              disabled={loading}
            >
              <Ionicons name="mail-outline" size={24} color="#6B7280" />
              <Text style={styles.buttonText}>Registrarme con correo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#fff', marginTop: 12 }]}
              onPress={() => promptAsync()}
              disabled={!request}
            >
              <Image
                source={require('../../src/assets/images/google.png')}
                style={{ width: 20, height: 20, marginRight: 8 }}
              />
              <Text style={[styles.buttonText, { color: '#111827' }]}>Registrarse con Google</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor="#6B7280"
              value={fullName}
              onChangeText={setFullName}
            />
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
              placeholder="Teléfono"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#6B7280"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={styles.label}>Foto de perfil (opcional)</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickProfileImage}>
              <Ionicons name="image-outline" size={24} color="#6B21A8" />
              <Text style={styles.imagePickerText}>
                {profileImageUri ? 'Cambiar imagen' : 'Seleccionar imagen'}
              </Text>
            </TouchableOpacity>
            {profileImageUri && (
              <Image source={{ uri: profileImageUri }} style={styles.previewImage} />
            )}

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <Ionicons
                name={termsAccepted ? 'checkbox' : 'checkbox-outline'}
                size={20}
                color="#FFF"
              />
              <Text style={styles.checkboxText}>Acepto términos y condiciones</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, (!termsAccepted || loading) && styles.buttonDisabled]}
              onPress={handleEmailRegister}
              disabled={!termsAccepted || loading}
            >
              {loading ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <Text style={styles.buttonText}>Crear cuenta</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          {showEmailForm && <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>}
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.footerLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width, height, justifyContent: 'center', alignItems: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, width, height, backgroundColor: 'rgba(0,0,0,0.4)' },
  container: { width: '80%', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '700', color: '#FFF', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#FFF', marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, width: '100%', padding: 10, fontSize: 14, color: '#111827', marginBottom: 12 },
  label: { alignSelf: 'flex-start', marginTop: 12, fontSize: 14, fontWeight: '600', color: '#FFF' },
  imagePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', borderRadius: 8, padding: 12, width: '100%' },
  imagePickerText: { marginLeft: 8, color: '#6B21A8' },
  previewImage: { width: 80, height: 80, borderRadius: 40, marginTop: 8 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  checkboxText: { color: '#FFF', marginLeft: 8, fontSize: 14 },
  button: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 8, width: '100%', marginBottom: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '500', color: '#111827', marginLeft: 8 },
  footer: { flexDirection: 'row', marginTop: 16 },
  footerText: { color: '#FFF', fontSize: 14 },
  footerLink: { color: '#FFF', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});