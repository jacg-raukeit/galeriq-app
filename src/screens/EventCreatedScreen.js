// src/screens/EventCreatedScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

export default function EventCreatedScreen({ navigation }) {
  const goToEvents = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Events' }] });
  };

  return (
    <View style={styles.container}>
     
      <ConfettiCannon count={140} origin={{ x: 0, y: -10 }} fadeOut />
      <ConfettiCannon count={140} origin={{ x: width, y: -10 }} fadeOut />

      <View style={styles.card}>
        <Ionicons name="checkmark-circle" size={72} color="#FAA4BD" />
        <Text style={styles.title}>¡Tu evento se ha creado exitosamente!</Text>

        <TouchableOpacity style={styles.cta} onPress={goToEvents} activeOpacity={0.9}>
          <Text style={styles.ctaText}>Ir a mis eventos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F9FAFB', alignItems:'center', justifyContent:'center' },
  card:{
    width:'86%', backgroundColor:'transparent', borderRadius:16,
    paddingVertical:24, paddingHorizontal:18, alignItems:'center',
    shadowColor:'#fff', shadowOpacity:0.12, shadowRadius:0, shadowOffset:{ width:0, height:8 }, elevation:6
  },
  title:{ textAlign:'center', fontSize:18, fontWeight:'800', color:'#111827', marginTop:12, marginBottom:18 },
  cta:{ backgroundColor:'#FAA4BD', borderRadius:10, paddingVertical:12, paddingHorizontal:18, minWidth:180, alignItems:'center' },
  ctaText:{ color:'#fff', fontWeight:'800', fontSize:16 },
});
