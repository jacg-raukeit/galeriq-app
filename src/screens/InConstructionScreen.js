// src/screens/InConstructionScreen.js
import React, { useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const LOTTIE_SRC = require('../assets/lottie/construction.json');

export default function InConstructionScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  const lottieRef = useRef(null);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    Animated.timing(slide, { toValue: 0, duration: 480, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const id = setTimeout(() => {
        try {
          lottieRef.current?.reset?.();
          lottieRef.current?.play?.();
        } catch {}
      }, 50);
      return () => {
        clearTimeout(id);
        try {
          lottieRef.current?.pause?.();
        } catch {}
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Marca superior */}
        <Text style={styles.brand}>Galeriq</Text>

        {/* Contenido central */}
        <Animated.View style={[styles.center, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <LottieView
            ref={lottieRef}
            source={LOTTIE_SRC}
            autoPlay={true}
            loop={true}
            style={styles.lottie}
            renderMode="AUTOMATIC"
            onAnimationFinish={() => {
              
              try {
                lottieRef.current?.play?.();
              } catch {}
            }}
          />

          <Text style={styles.title}>Módulo en{"\n"}construcción</Text>
          <Text style={styles.subtitle}>
            Estamos afinando detalles{"\n"}para darte la mejor experiencia
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const BG = '#F9EAF7';          
const PURPLE_DARK = '#2A1B45'; 
const TEXT_MAIN = '#3D3552';
const TEXT_SUB = '#6B637A';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
  },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: PURPLE_DARK,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    width: Math.min(420, width),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lottie: {
    width: 220,
    height: 220,
    marginBottom: 10,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: TEXT_MAIN,
    marginTop: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SUB,
    marginTop: 8,
  },
});
