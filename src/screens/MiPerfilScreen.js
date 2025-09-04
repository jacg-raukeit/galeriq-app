// src/screens/MiPerfilScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Image, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Animated, Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

const API_BASE = 'http://143.198.138.35:8000'; 
const ME_URL = `${API_BASE}/me`;

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

function FieldRow({ icon, label, value }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIconWrap}>
        <Ionicons name={icon} size={18} color="#7c7c8a" />
      </View>
      <View style={styles.fieldBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.readonlyBox}>
          <Text style={styles.fieldValue} numberOfLines={1}>{value || '—'}</Text>
        </View>
      </View>
    </View>
  );
}

function Skeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={{ paddingHorizontal: 18 }}>
      <View style={styles.avatarSkeleton} />
      <Animated.View style={[styles.skelLine, { width: '70%', opacity }]} />
      <Animated.View style={[styles.skelLine, { width: '50%', opacity }]} />
      {[...Array(4)].map((_, i) => (
        <Animated.View key={i} style={[styles.skelInput, { opacity }]} />
      ))}
    </View>
  );
}

export default function MiPerfilScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [avatarUri, setAvatarUri] = useState(FALLBACK_AVATAR);
  const headerFade = useRef(new Animated.Value(0)).current;

  const bearer = useMemo(() => user?.token || user?.access_token || '', [user]);

  const fetchMe = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(ME_URL, {
        headers: {
          'Content-Type': 'application/json',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} - ${txt}`);
      }
      const data = await res.json();
      setMe(data);

      if (data?.profile_image && typeof data.profile_image === 'string' && data.profile_image.length > 0) {
        setAvatarUri(data.profile_image);
      } else {
        setAvatarUri(FALLBACK_AVATAR);
      }
    } catch (e) {
      setError(e?.message || 'Error al cargar perfil');
      setAvatarUri(FALLBACK_AVATAR);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(headerFade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    }
  }, [bearer, headerFade]);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchMe(); }, [fetchMe]);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#ffffff', '#fafafb', '#f6f7fb']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.bg}
      />
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <Ionicons name="shield-checkmark-outline" size={22} color="#16a34a" />
      </Animated.View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Skeleton />
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={22} color="#dc2626" />
            <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMe}>
              <Text style={styles.retryTxt}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Avatar + nombre */}
            <View style={styles.topCard}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  resizeMode="cover"
                  onError={() => setAvatarUri(FALLBACK_AVATAR)}
                />
                {/* <View style={styles.badgeCam}>
                  <Ionicons name="lock-closed" size={12} color="#fff" />
                </View> */}
              </View>
              <Text style={styles.nameTxt} numberOfLines={1}>
                {me?.full_name || me?.name || 'Usuario'}
              </Text>
              {/* <Text style={styles.secondaryTxt} numberOfLines={1}>
                ID #{me?.user_id ?? '—'}
              </Text> */}
            </View>

            {/* Campos informativos */}
            <View style={styles.card}>
              <FieldRow icon="mail" label="Correo" value={me?.email} />
              <FieldRow icon="call" label="Teléfono" value={me?.phone ?? me?.phone_number} />
              {/* <FieldRow icon="at" label="Usuario" value={me?.username || me?.user_name} /> */}
              <FieldRow
                icon="time"
                label="Miembro desde"
                value={
                  me?.created_at
                    ? new Date(me.created_at).toLocaleDateString()
                    : (me?.registration_date ? new Date(me.registration_date).toLocaleDateString() : undefined)
                }
              />
              <FieldRow icon="pricetag" label="Estatus" value={me?.status} />
            </View>

            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
              <Text style={styles.noteText}>
                Esta información es de solo lectura por ahora. Próximamente podrás editar tu perfil.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  bg: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 38 : 0, paddingBottom: 8, gap: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#0f172a' },

  topCard: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 18 },
  avatarWrap: {
    width: 110, height: 110, borderRadius: 60, overflow: 'hidden', backgroundColor: '#eef2ff',
    justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  avatar: { width: '100%', height: '100%' },
  badgeCam: {
    position: 'absolute', right: 4, bottom: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  nameTxt: { marginTop: 10, fontSize: 20, fontWeight: '700', color: '#0f172a' },
  secondaryTxt: { marginTop: 2, fontSize: 12, color: '#6b7280' },

  card: {
    marginHorizontal: 18, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#eef0f4', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },

  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  fieldIconWrap: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  fieldBody: { flex: 1 },
  fieldLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  readonlyBox: {
    borderRadius: 10, borderWidth: 1, borderColor: '#eef0f4', backgroundColor: '#f9fafb',
    paddingVertical: 10, paddingHorizontal: 12,
  },
  fieldValue: { fontSize: 14, color: '#111827' },

  noteBox: {
    marginTop: 16, marginHorizontal: 18, padding: 12, borderRadius: 12,
    backgroundColor: '#eef2ff', flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  noteText: { flex: 1, color: '#1e40af', fontSize: 13 },

  errorBox: {
    marginTop: 40, marginHorizontal: 18, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2',
    alignItems: 'center', gap: 6,
  },
  errorText: { fontWeight: '700', color: '#991b1b' },
  errorSub: { fontSize: 12, color: '#7f1d1d', textAlign: 'center' },
  retryBtn: { marginTop: 10, backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '600' },

  avatarSkeleton: {
    width: 110, height: 110, borderRadius: 60, backgroundColor: '#f1f5f9',
    alignSelf: 'center', marginTop: 20, marginBottom: 16,
  },
  skelLine: { height: 14, borderRadius: 8, backgroundColor: '#eef2f7', marginTop: 8, alignSelf: 'center' },
  skelInput: { height: 54, borderRadius: 12, backgroundColor: '#eef2f7', marginTop: 14 },
});
