// components/EventCard.js
import React, { useMemo } from 'react';
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

// Meses abreviados en español (3 letras)
const MESES_ES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

// Fecha → { day: '23', mon: 'AUG' }
function toDayMon(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d)) return { day: '--', mon: '---' };
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MESES_ES[d.getMonth()];
  return { day, mon };
}

export default function EventCard({
  title,
  date,             // 👈 pásame la fecha cruda (string/Date)
  imageUri,
  status = 'Activo',
  archived = false,
  onToggleArchive,
}) {
  const key = norm(status);
  const styleForStatus = STATUS_STYLES[key] || STATUS_STYLES.default;
  const { backgroundColor, textColor } = styleForStatus;

  const source = typeof imageUri === 'string' ? { uri: imageUri } : imageUri;

  const { day, mon } = useMemo(() => toDayMon(date), [date]);

  return (
    <View style={styles.card}>
      {/* Imagen */}
      <View>
        <Image source={source} style={styles.image} />

        {/* Badge de FECHA arriba-izquierda */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMon}>{mon}</Text>
        </View>

        {/* Botón archivar arriba-derecha */}
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

      {/* Info */}
      <View style={styles.info}>
        {/* Título + Estado en la misma fila */}
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>

          <View style={[styles.badge, { backgroundColor }]}>
            <Text style={[styles.badgeText, { color: textColor }]}>{status}</Text>
          </View>
        </View>

        {/* (Opcional) podrías agregar aquí otra fila con metadata si la necesitas) */}
      </View>
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

  // Pastilla de fecha
  dateBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    width: 56,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    lineHeight: 20,
  },
  dateMon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B21A8',
    marginTop: 2,
  },

  info: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 8,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
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
