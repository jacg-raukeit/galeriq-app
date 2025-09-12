import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Normalizador de estado
const norm = (s) => String(s || '').toLowerCase();

// Mapa de estilos por estado (admite español e inglés)
const STATUS_STYLES = {
  // Activos (verde)
  'activo':   { backgroundColor: '#ECFDF5', textColor: '#059669' },
  'active':   { backgroundColor: '#ECFDF5', textColor: '#059669' },

  // Finalizados (rojo)
  'finished': { backgroundColor: '#FEF2F2', textColor: '#EF4444' },
  'pasado':   { backgroundColor: '#FEF2F2', textColor: '#EF4444' },

  // Borrador (gris)
  'borrador': { backgroundColor: '#E5E7EB', textColor: '#6B7280' },

  // Default (gris claro)
  'default':  { backgroundColor: '#F3F4F6', textColor: '#374151' },
};

export default function EventCard({
  title,
  date,
  imageUri,
  status = 'Activo',
  archived = false,
  onToggleArchive,
}) {
  const key = norm(status);
  const styleForStatus = STATUS_STYLES[key] || STATUS_STYLES.default;
  const { backgroundColor, textColor } = styleForStatus;

  const source = typeof imageUri === 'string' ? { uri: imageUri } : imageUri;

  return (
    <View style={styles.card}>
      <Image source={source} style={styles.image} />

      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.footer}>
          <Text style={styles.date}>{date}</Text>

          <View style={[styles.badge, { backgroundColor }]}>
            <Text style={[styles.badgeText, { color: textColor }]}>
              {status}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.archiveButton}
        onPress={() => onToggleArchive?.()}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        accessibilityRole="button"
        accessibilityLabel={archived ? "Desarchivar evento" : "Archivar evento"}
      >
        <Ionicons
          name={archived ? 'archive' : 'archive-outline'}
          size={24}
          color="#6B21A8"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 140,
  },
  info: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#4B5563',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  archiveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    zIndex: 10,
    elevation: 4,
  },
});
