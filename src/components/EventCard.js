import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const STATUS_STYLES = {
  Activo:   { backgroundColor: '#D1FAE5', textColor: '#059669' },
  Pasado:   { backgroundColor: '#FEF3C7', textColor: '#B45309' },
  Borrador: { backgroundColor: '#E5E7EB', textColor: '#6B7280' },
};

export default function EventCard({
  title,
  date,
  imageUri,
  status = 'Activo',
  archived = false,
  onToggleArchive,
}) {
  const { backgroundColor, textColor } = STATUS_STYLES[status] || STATUS_STYLES.Activo;
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
        onPress={onToggleArchive}
      >
        <Ionicons
          name={archived ? 'archive-outline' : 'archive-sharp'}
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
    padding: 4,
  },
});
