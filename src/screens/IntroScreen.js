import React, { useEffect, useRef, useContext, useState } from 'react';
import { View, StyleSheet, Dimensions, Image, Platform, Animated } from 'react-native';
import { VideoView } from 'expo-video';
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
  const [showVideo, setShowVideo] = useState(Platform.OS !== 'android');

  // Verifica token y define ruta destino
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
  }, [setUser]);

  // Navegación tras terminar video o imagen
  const goNext = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start(() => navigation.replace(nextRouteRef.current));
  };

  const handleVideoStatus = (status) => {
    if (status.didJustFinish) {
      goNext();
    }
  };

  // En MIUI / POCO no mostramos video, sino imagen
  useEffect(() => {
    if (!showVideo) {
      const timer = setTimeout(goNext, 3500);
      return () => clearTimeout(timer);
    }
  }, [showVideo]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Fallback estático */}
      <Image
        source={require('../assets/images/Sin título.jpg')}
        style={styles.background}
        resizeMode="cover"
      />

      {/* Video solo si no es MIUI */}
      {showVideo && (
        <VideoView
          style={styles.background}
          contentFit="cover"
          isMuted
          shouldPlay
          source={require('../assets/videos/splash_videos.mp4')}
          onPlaybackStatusUpdate={handleVideoStatus}
        />
      )}
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
