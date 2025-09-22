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
import { useTranslation } from 'react-i18next';

// Normalizador de strings
const norm = (s) => String(s || '').trim().toLowerCase();

// Mapa de estilos por estado (admite entradas en ES o EN)
const STATUS_STYLES = {
  // Activos (verde)
  'activo':   { backgroundColor: '#ECFDF5', textColor: '#059669' },
  'active':   { backgroundColor: '#ECFDF5', textColor: '#059669' },

  // Finalizados (rojo)
  'finished': { backgroundColor: '#FEF2F2', textColor: '#EF4444' },
  'pasado':   { backgroundColor: '#FEF2F2', textColor: '#EF4444' },
  'finalizado': { backgroundColor: '#FEF2F2', textColor: '#EF4444' },

  // Borrador (gris)
  'borrador': { backgroundColor: '#E5E7EB', textColor: '#6B7280' },
  'draft':    { backgroundColor: '#E5E7EB', textColor: '#6B7280' },

  // Default (gris claro)
  'default':  { backgroundColor: '#F3F4F6', textColor: '#374151' },
};

// Mapa de claves canónicas para traducir el estado
const STATUS_KEY_MAP = {
  'activo': 'active',
  'active': 'active',
  'pasado': 'finished',
  'finalizado': 'finished',
  'finished': 'finished',
  'borrador': 'draft',
  'draft': 'draft',
};

export default function EventCard({
  title,
  date,             // fecha cruda (string/Date)
  imageUri,
  status = 'Activo',
  archived = false,
  onToggleArchive,
}) {
  const { t } = useTranslation('eventCard');

  // 1) Estilos del estado (en base a la palabra recibida en ES/EN)
  const key = norm(status);
  const styleForStatus = STATUS_STYLES[key] || STATUS_STYLES.default;
  const { backgroundColor, textColor } = styleForStatus;

  // 2) Texto traducido del estado (usa clave canónica, si no, muestra tal cual)
  const statusCanonical = STATUS_KEY_MAP[key];
  const statusLabel = statusCanonical ? t(`status.${statusCanonical}`) : status;

  // 3) Mes abreviado i18n
  //    t('months', { returnObjects: true }) devuelve el array ["ENE", "FEB", ...] o ["JAN", ...]
  const months = t('months', { returnObjects: true });
  const { day, mon } = useMemo(() => {
    const d = new Date(date);
    if (isNaN(d)) return { day: '--', mon: '---' };
    const dd = String(d.getDate()).padStart(2, '0');
    const mi = d.getMonth();
    const m = Array.isArray(months) && months[mi] ? months[mi] : '---';
    return { day: dd, mon: m };
  }, [date, months]);

  const source = typeof imageUri === 'string' ? { uri: imageUri } : imageUri;

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
          accessibilityLabel={
            archived
              ? t('archive.unarchive_event')
              : t('archive.archive_event')
          }
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
        {/* Título + Estado */}
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>

          <View style={[styles.badge, { backgroundColor }]}>
            <Text style={[styles.badgeText, { color: textColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* (Opcional) metadata extra */}
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
