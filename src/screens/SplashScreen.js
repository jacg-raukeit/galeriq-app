import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const navigation = useNavigation();
  const animRef = useRef(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Reproduce animación, y al terminar (o tras timeout) redirige
    let timeout = setTimeout(() => {
      if (user?.token) {
        navigation.replace('Events');
      } else {
        navigation.replace('Login');
      }
    }, 3200); // ~2.2s (ajusta según tu animación)

    return () => clearTimeout(timeout);
  }, [user, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.centerBox}>
        <LottieView
          ref={animRef}
          source={require('../assets/lottie/Photos.json')}
          autoPlay
          loop={false}
          style={styles.lottie}
        />
        <Text style={styles.brand}>Galeriq</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFE8D6', alignItems: 'center', justifyContent: 'center' },
  centerBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Ocupa ~la mitad de la altura visual total
    height: height * 0.5,
  },
  lottie: {
    width: width * 0.6,          // ancho amigable
    height: height * 0.3,        // altura ~ 30% de la pantalla
  },
  brand: {
    marginTop: 12,
    fontSize: 32,
    fontWeight: '800',
    color: '#442D49',
    letterSpacing: 1,
  },
});
