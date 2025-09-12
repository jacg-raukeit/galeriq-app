import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const navigation = useNavigation();
  const animRef = useRef(null);
  const { user } = useContext(AuthContext);

  const topRightProg = useRef(new Animated.Value(0)).current;
  const bottomLeftProg = useRef(new Animated.Value(0)).current;

  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandScale = useRef(new Animated.Value(0.85)).current;
  const brandTY = useRef(new Animated.Value(6)).current; 

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(topRightProg, {
        toValue: 1, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true,
      }),
      Animated.timing(bottomLeftProg, {
        toValue: 1, duration: 650, easing: Easing.out(Easing.exp), useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.spring(brandScale, {
        toValue: 1, damping: 9, stiffness: 120, mass: 0.8, useNativeDriver: true,
      }),
      Animated.timing(brandTY, {
        toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (user?.token) navigation.replace('Events');
      else navigation.replace('Login');
    }, 3200);
    return () => clearTimeout(timeout);
  }, [user, navigation]);

  const circleSize = Math.max(width, height) * 0.4;
  const topRightStyle = {
    opacity: topRightProg,
    transform: [
      { translateX: topRightProg.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
      { translateY: topRightProg.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
      { scale: topRightProg.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
    ],
  };
  const bottomLeftStyle = {
    opacity: bottomLeftProg,
    transform: [
      { translateX: bottomLeftProg.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
      { translateY: bottomLeftProg.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
      { scale: bottomLeftProg.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Círculos “cortados” en esquinas */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cornerCircle,
          {
            width: circleSize, height: circleSize, borderRadius: circleSize / 2,
            backgroundColor: '#FFC83D', top: -circleSize * 0.35, right: -circleSize * 0.25,
          },
          topRightStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cornerCircle,
          {
            width: circleSize * 0.9, height: circleSize * 0.9, borderRadius: (circleSize * 0.9) / 2,
            backgroundColor: '#F4A261', bottom: -circleSize * 0.35, left: -circleSize * 0.25,
          },
          bottomLeftStyle,
        ]}
      />

      {/* Contenido central */}
      <View style={styles.centerBox}>
        <LottieView
          ref={animRef}
          source={require('../assets/lottie/Photos.json')}
          autoPlay
          loop={false}
          style={styles.lottie}
        />

        {/* Texto animado */}
        <Animated.View
          style={{
            opacity: brandOpacity,
            transform: [{ scale: brandScale }, { translateY: brandTY }],
          }}
        >
          <Text style={styles.brand}>Galeriq</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const { width: W, height: H } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE8D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: H * 0.5,
  },
  lottie: {
    width: W * 0.6,
    height: H * 0.3,
  },
  brand: {
    marginTop: 12,
    fontSize: 32,
    fontWeight: '800',
    color: '#442D49',
    letterSpacing: 1,
  },
  cornerCircle: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
