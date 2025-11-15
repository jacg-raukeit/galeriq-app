// src/screens/TransitionScreen.js
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

export default function TransitionScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('Intro'), 500);
    return () => clearTimeout(t);
  }, [navigation]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // negro total
  },
});
