import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Platform,
  UIManager,
  Animated,
  Easing,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import * as WebBrowser from 'expo-web-browser';

const WEBSITE_URL = 'https://vicman28-tv.github.io/Galeriq/';
const SUPPORT_EMAIL = 'ayudagaleriq@gmail.com';

const TERMS_PDF_LOCAL = require('../assets/documents/terminos.pdf');


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FaqScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const faqs = useMemo(
    () => [
      {
        id: 0,
        q: '¿Cómo cambio mi contraseña?',
        a: 'Para cambiar tu contraseña, ve a Menú → Perfil, elige tu perfil, escribe tu contraseña actual y la nueva, luego toca Confirmar.',
      },
      {
        id: 1,
        q: '¿Cómo cambio el estado de mi perfil?',
        a: 'Abre tu perfil, toca Estado, elige el nuevo estado y guarda los cambios.',
      },
      {
        id: 2,
        q: '¿Cómo exporto contactos?',
        a: 'Ve a Contactos → Opciones → Exportar y elige tu formato preferido para descargar.',
      },
      {
        id: 3,
        q: '¿Cómo puedo eliminar mi cuenta?',
        a: 'Ve a Configuración → Cuenta → Eliminar cuenta. Sigue los pasos de confirmación con cuidado.',
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return faqs;
    const ql = query.toLowerCase();
    return faqs.filter((f) => f.q.toLowerCase().includes(ql) || f.a.toLowerCase().includes(ql));
  }, [query, faqs]);

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));


  const openWebsite = async () => {
    await WebBrowser.openBrowserAsync(WEBSITE_URL);
  };

  const emailSupport = async () => {
    const url = `mailto:${SUPPORT_EMAIL}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch (_) {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Back button */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation?.goBack?.()}
            style={styles.backBtn}
            android_ripple={{ color: '#e5e5e5', borderless: true }}
          >
            <Ionicons name="chevron-back" size={24} color="#111" />
          </Pressable>
        </View>

        <Text style={styles.title}>FAQ y Soporte</Text>
        <Text style={styles.subtitle}>
          ¿No encontraste la respuesta que buscabas?{'\n'}¡Comunícate con nuestro centro de soporte!
        </Text>

        {/* Acciones: Website / Email / Terms */}
        <View style={styles.actions}>
          <RowItem icon="globe-outline" text="Ir al sitio web" onPress={openWebsite} />
          <RowItem icon="mail-outline" text="Email" onPress={emailSupport} />
         <RowItem
  icon="document-text-outline"
  text="Términos de Servicio"
  onPress={() => {
    navigation.navigate('PdfViewer', {
      title: 'Términos y condiciones',
      localRequire: TERMS_PDF_LOCAL,
    });
  }}
/>
        </View>

        {/* Buscador azul */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#fff" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar pregunta..."
            placeholderTextColor="#ffffffcc"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>

        {/* Lista de FAQs */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((item) => (
            <FaqCard
              key={item.id}
              item={item}
              open={openId === item.id}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function RowItem({ icon, text, onPress }) {
  return (
    <Pressable
      onPress={onPress || undefined}
      style={({ pressed }) => [
        styles.row,
        onPress ? (pressed ? { opacity: 0.9 } : null) : { opacity: 1 },
      ]}
    >
      <Ionicons name={icon} size={20} color="#111" style={{ marginRight: 12 }} />
      <Text style={styles.rowText}>{text}</Text>
    </Pressable>
  );
}

function FaqCard({ item, open, onToggle }) {
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open]);

  const contentHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });
  
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.q}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color="#111" />
        </Animated.View>
      </Pressable>
      <Animated.View style={{ height: contentHeight, overflow: 'hidden' }}>
        <Text style={styles.cardBody}>{item.a}</Text>
      </Animated.View>
    </View>
  );
}

const PRIMARY_BLUE = '#D6C4E3';
const BG = '#F5F6FA';
const CARD_RADIUS = 12;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  headerRow: {
    paddingTop: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(0),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B6F76',
    marginTop: 6,
    marginBottom: 18,
  },
  actions: {
    marginTop: 2,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowText: {
    fontSize: 16,
    color: '#111',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 14,
    marginBottom: 14,
    ...shadow(10),
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    padding: 14,
    marginBottom: 12,
    ...shadow(12),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    paddingRight: 12,
  },
  cardBody: {
    color: '#6B6F76',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    paddingTop: 4,
  },
});

function shadow(elevation = 8) {
  return Platform.select({
    android: { elevation },
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: Math.max(6, elevation),
      shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
    },
    default: {},
  });
}
