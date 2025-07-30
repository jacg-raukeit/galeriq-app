// src/screens/EventsScreen.js

import React, { useContext } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AuthContext }   from '../context/AuthContext';
import { EventsContext } from '../context/EventsContext';

import Header            from '../components/Header';
import CreateEventButton from '../components/CreateEventButton';
import EventCard         from '../components/EventCard';

export default function EventsScreen() {
  const navigation = useNavigation();
  const { user }   = useContext(AuthContext);
  const { events } = useContext(EventsContext);

 
  if (!user) return null;

  return (
    <View style={styles.screen}>
      {/* <Header title="Mis Eventos" /> */}
      <Text style={styles.title}>Galeriq</Text>
      <View style={styles.actionContainer}>
        <CreateEventButton
          onPress={() => navigation.navigate('CreateEvent')}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>No tienes eventos aún.</Text>
        ) : (
          events.map(evt => (
            <TouchableOpacity
              key={evt.event_id}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('EventDetail', { event: evt })
              }
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#F9FAFB', marginTop: 10 },
  actionContainer:  { paddingHorizontal: 16, paddingVertical: 8 },
  listContainer:    { padding: 16, paddingBottom: 32 },
  emptyText:        {
    textAlign: 'center',
    marginTop: 32,
    color: '#6B7280',
    fontSize: 16,
  },
  title: {
    fontFamily: 'Montserrat-Regular', // Asegúrate que este sea el nombre correcto de la fuente
    fontSize: 24,
    textAlign: 'center',
    marginTop: 26,
    
  },
});
