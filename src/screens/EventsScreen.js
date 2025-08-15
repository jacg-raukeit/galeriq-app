// src/screens/EventsScreen.js
import React, { useContext, useRef, useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { AuthContext }   from '../context/AuthContext';
import { EventsContext } from '../context/EventsContext';

import CreateEventButton from '../components/CreateEventButton';
import EventCard         from '../components/EventCard';

const { width } = Dimensions.get('window');
const DRAWER_W = Math.min(width * 0.76, 300);

export default function EventsScreen() {
  const navigation = useNavigation();
  const { user }   = useContext(AuthContext);
  const { events } = useContext(EventsContext);

  const [open, setOpen] = useState(false);
  const x = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlay = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlay, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(x, { toValue: -DRAWER_W, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlay, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [open, x, overlay]);

  const closeDrawer = () => setOpen(false);

  const goTo = (screen) => {
    setOpen(false);
    navigation.navigate(screen);
  };

  if (!user) return null;

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setOpen(true)} activeOpacity={0.85}>
          <Ionicons name="menu-outline" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Galeriq</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.titleSection}>Mis Eventos</Text>

      <View style={styles.actionContainer}>
        <CreateEventButton onPress={() => navigation.navigate('CreateEvent')} />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>No tienes eventos aún.</Text>
        ) : (
          events.map(evt => (
            <TouchableOpacity
              key={evt.event_id}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('EventDetail', { event: evt })}
            >
              <EventCard
                title={evt.event_name}
                date={new Date(evt.event_date).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
                imageUri={evt.event_cover}
                status={evt.event_status}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* OVERLAY */}
      
      <Pressable
        onPress={closeDrawer}
        style={StyleSheet.absoluteFill}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlay.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }) },
          ]}
        />
      </Pressable>

      {/* DRAWER */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: x }] },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerBrand}>Galeriq</Text>
          <TouchableOpacity onPress={closeDrawer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.item} onPress={() => goTo('Profile')} activeOpacity={0.85}>
          <Ionicons name="person-circle-outline" size={20} color="#6B21A8" />
          <Text style={styles.itemText}>Mi perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => goTo('Settings')} activeOpacity={0.85}>
          <Ionicons name="settings-outline" size={20} color="#6B21A8" />
          <Text style={styles.itemText}>Ajustes</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#F9FAFB', paddingTop: 6, marginTop: 22 },
  header: {
    height: 50,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  title: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 22,
    textAlign: 'center',
    fontWeight: '800',
    color: '#111827',
  },
  titleSection: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 28,
    marginLeft: 16,
    fontWeight: '800',
    marginTop: 2,
    color: '#111827',
  },
  actionContainer:  { paddingHorizontal: 16, paddingVertical: 8 },
  listContainer:    { padding: 16, paddingBottom: 32 },
  emptyText:        { textAlign: 'center', marginTop: 32, color: '#6B7280', fontSize: 16 },

  /* Drawer */
  overlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: DRAWER_W,
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 2, height: 0 },
    elevation: 12,
  },
  drawerHeader: {
    height: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomColor: '#F3F4F6', borderBottomWidth: 1,
    marginBottom: 10,
  },
  drawerBrand: { fontSize: 18, fontWeight: '800', color: '#111827' },
  item: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
  },
  itemText: { fontSize: 15, fontWeight: '600', color: '#111827' },
});
