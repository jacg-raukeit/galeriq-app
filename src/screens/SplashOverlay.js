import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

export default function SplashOverlay({ onComplete }) {
  const topRightProg = useRef(new Animated.Value(0)).current;
  const bottomLeftProg = useRef(new Animated.Value(0)).current;
  const brandName = 'Galeriq';
  const letterAnimations = useRef(brandName.split('').map(() => new Animated.Value(0))).current;
  const brandScale = useRef(new Animated.Value(0.85)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animaciones de entrada
    Animated.stagger(120, [
      Animated.timing(topRightProg, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(bottomLeftProg, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.stagger(80, letterAnimations.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )),
      Animated.spring(brandScale, {
        toValue: 1,
        damping: 9,
        stiffness: 120,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();

    // Timer para fade out
    const timer = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onComplete(); // Notificar que terminó
      });
    }, 3000); // 3 segundos de animación + 400ms de fade out

    return () => clearTimeout(timer);
  }, []);

  const circleSize = Math.max(width, height) * 0.4;
  const topRightStyle = {
    opacity: topRightProg,
    transform: [
      {
        translateX: topRightProg.interpolate({
          inputRange: [0, 1],
          outputRange: [40, 0]
        })
      },
      {
        translateY: topRightProg.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, 0]
        })
      },
      {
        scale: topRightProg.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1]
        })
      },
    ],
  };

  const bottomLeftStyle = {
    opacity: bottomLeftProg,
    transform: [
      {
        translateX: bottomLeftProg.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, 0]
        })
      },
      {
        translateY: bottomLeftProg.interpolate({
          inputRange: [0, 1],
          outputRange: [40, 0]
        })
      },
      {
        scale: bottomLeftProg.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1]
        })
      },
    ],
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
      <View style={styles.container}>
        <Animated.View pointerEvents="none" style={[
          styles.cornerCircle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: '#FFC83D',
            top: -circleSize * 0.35,
            right: -circleSize * 0.25,
          },
          topRightStyle,
        ]} />
        <Animated.View pointerEvents="none" style={[
          styles.cornerCircle,
          {
            width: circleSize * 0.9,
            height: circleSize * 0.9,
            borderRadius: (circleSize * 0.9) / 2,
            backgroundColor: '#F4A261',
            bottom: -circleSize * 0.35,
            left: -circleSize * 0.25,
          },
          bottomLeftStyle,
        ]} />

        <View style={styles.centerBox}>
          <LottieView
            source={require('../assets/lottie/Photos.json')}
            autoPlay
            loop={false}
            style={styles.lottie}
          />

          <Animated.View style={{
            flexDirection: 'row',
            transform: [{ scale: brandScale }],
          }}>
            {brandName.split('').map((letter, index) => {
              const letterStyle = {
                opacity: letterAnimations[index],
                transform: [{
                  translateY: letterAnimations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                }],
              };
              return (
                <Animated.Text key={index} style={[styles.brand, letterStyle]}>
                  {letter}
                </Animated.Text>
              );
            })}
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
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
    height: height * 0.5,
  },
  lottie: {
    width: width * 0.6,
    height: height * 0.3,
  },
  brand: {
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