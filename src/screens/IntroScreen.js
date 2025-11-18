import React, { useEffect, useRef, useContext } from 'react';
import { View, StyleSheet, Dimensions, Image, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');
const TOKEN_KEY = "galeriq_token";
const API_BASE = "http://143.198.138.35:8000";

export default function IntroScreen() {
  const navigation = useNavigation();
  const { setUser } = useContext(AuthContext);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const nextRouteRef = useRef('Login');

  // Verifica token y define siguiente ruta
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);

        if (savedToken) {
          const res = await fetch(`${API_BASE}/me`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });

          if (res.ok) {
            const profile = await res.json();
            setUser({ id: profile.user_id, token: savedToken });
            nextRouteRef.current = 'Events';
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        }
      } catch (err) {
        console.log('Auto-login error:', err);
      }
    };

    checkAuth();

    // Timer fijo para evitar bloqueo en iOS
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace(nextRouteRef.current);
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../assets/images/Sin título.jpg')}
        style={styles.background}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
  },
});
