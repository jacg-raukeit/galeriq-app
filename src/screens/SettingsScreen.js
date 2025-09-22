import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import i18n, { setAppLanguage } from '../i18n/i18n';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation('settings');

  const [current, setCurrent] = useState(i18n.language.startsWith('es') ? 'es' : 'en');

  const headerFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [headerFade]);

  useEffect(() => {
  }, [t]);

  const options = useMemo(() => ([
    { code: 'es', label: t('spanish'), icon: 'flag-outline' },
    { code: 'en', label: t('english'), icon: 'flag-outline' },
  ]), [t]);

  const onChangeLang = async (code) => {
    if (code === current) return;
    await setAppLanguage(code);
    setCurrent(code);

    Alert.alert(
      t('title'),
      code === 'es' ? t('change_notice_es') : t('change_notice_en')
    );
  };

  const openNotificationSettings = () => {
    Linking.openSettings();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#ffffff', '#fafafb', '#f6f7fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      />

      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('title')}</Text>
        <View style={{ width: 24 }} />
      </Animated.View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="globe-outline" size={18} color="#6B21A8" />
          <Text style={styles.cardTitle}>{t('language')}</Text>
        </View>

        {options.map(({ code, label, icon }) => {
          const active = current === code;
          return (
            <TouchableOpacity
              key={code}
              style={styles.row}
              onPress={() => onChangeLang(code)}
              activeOpacity={0.9}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Ionicons name={icon} size={18} color={active ? '#6B21A8' : '#6b7280'} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                  {label}
                </Text>
              </View>

              {active ? (
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="notifications-outline" size={18} color="#D97706" />
          <Text style={styles.cardTitle}>{t('notifications')}</Text>
        </View>
        <TouchableOpacity
          style={styles.row}
          onPress={openNotificationSettings}
          activeOpacity={0.9}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="cog-outline" size={18} color={'#D97706'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>
              {t('manage_notifications')}
            </Text>
            <Text style={styles.rowDescription}>
              {t('manage_notifications_description')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* <View style={[styles.card, { marginTop: 12 }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="eye-outline" size={18} color="#111827" />
          <Text style={styles.cardTitle}>{t('preview')}</Text>
        </View>
        <Text style={styles.previewText}>{t('preview_text')}</Text>
      </View> */}

      <View style={styles.footer}>
        <Text style={styles.footerText}>© {new Date().getFullYear()} Galeriq</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  bg: { ...StyleSheet.absoluteFillObject },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 38 : 8,
    paddingBottom: 8,
    gap: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#0f172a' },

  card: {
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#eef0f4',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: { fontWeight: '800', color: '#111827' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#f5f3ff',
  },
  rowLabel: { fontWeight: '600', color: '#111827' },
  rowLabelActive: { color: '#6B21A8' },
  rowDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  previewText: { color: '#374151', marginTop: 6 },
  footer: { marginTop: 18, alignItems: 'center' },
  footerText: { color: '#9ca3af', fontSize: 12 },
});