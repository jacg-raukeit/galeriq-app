import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

export default function InvitationsHomeScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F2FA' }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header simple */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.brand}>Galeriq</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.title}>Invitaciones</Text>

      {/* Tarjeta preview */}
      <View style={styles.card}>
        <ImageBackground
          source={require('../../assets/images/modern1.jpeg')}
          style={styles.previewBg}
          imageStyle={{ borderRadius: 16 }}
          resizeMode="cover"
        >
          <View style={styles.previewOverlay}>
            <Text style={styles.p1}>Te invito a mi</Text>
            <Text style={styles.p2}>FIESTA DE CUMPLEAÑOS</Text>
            <Text style={styles.p3}>Olivia</Text>
            <Text style={styles.p4}>Sábado, 8 de junio de 2025 · 21:00</Text>
          </View>
        </ImageBackground>
      </View>

      {/* Acciones rápidas (grid) */}
      <View style={styles.grid}>
        <GridBtn
          icon="grid-outline"
          label="Explorar diseños"
          onPress={() => navigation.navigate('ExploreDesigns')}
        />
        <GridBtn icon="create-outline" label="Editar" onPress={() => navigation.navigate('ExploreDesigns')} />
        <GridBtn icon="add-circle-outline" label="+ Crear" onPress={() => navigation.navigate('ExploreDesigns')} />
        <GridBtn icon="share-social-outline" label="Compartir enlace" onPress={() => { /* luego */ }} />
      </View>

      {/* CTA principal */}
      <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('ExploreDesigns')}>
        <Text style={styles.ctaText}>Crear invitación</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function GridBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.gridBtn} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.gridIconWrap}>
        <Ionicons name={icon} size={18} color="#6B21A8" />
      </View>
      <Text style={styles.gridLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { height: 52, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 20, fontWeight: '800', color: '#111827' },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginTop: 6, marginLeft: 16 },
  card: { paddingHorizontal: 16, marginTop: 12 },
  previewBg: { width: '100%', height: width * 0.9 * 1.1, borderRadius: 16, backgroundColor: '#FCE7F3' },
  previewOverlay: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  p1: { color: '#5B2B2B', fontSize: 16, marginBottom: 6, fontWeight: '600' },
  p2: { color: '#5B2B2B', fontSize: 18, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  p3: { color: '#6B2A4A', fontSize: 28, fontWeight: '800', marginTop: 6 },
  p4: { color: '#4B5563', marginTop: 6, fontWeight: '600', textAlign: 'center' },

  grid: { paddingHorizontal: 16, marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridBtn: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#F1E7FF' },
  gridIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontWeight: '700', color: '#111827' },

  cta: { marginTop: 18, marginHorizontal: 16, height: 50, borderRadius: 14, backgroundColor: '#6B21A8', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
