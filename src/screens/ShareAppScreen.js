// src/screens/ShareAppScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  Alert,
  StatusBar,
  ToastAndroid,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";

const IMAGES = [
  require("../assets/images/share1.jpeg"),
  require("../assets/images/share2.jpeg"),
  require("../assets/images/share3.jpeg"),
];

const APP_LINK = "https://tu-link-de-descarga.com";

const guidelineBaseWidth = 375;
const normalize = (size, width) =>
  Math.round((width / guidelineBaseWidth) * size);

export default function ShareAppScreen({ navigation }) {
  const { t } = useTranslation("share");
  const { width, height } = useWindowDimensions();

  const horizontalPadding = Math.max(16, width * 0.05);
  const titleSize = normalize(14, width);
  const subtitleSize = normalize(15, width);
  const CARD_W = Math.min(width * 0.8, 420);
  const CARD_ASPECT = 9 / 16;
  const CARD_H = CARD_W / CARD_ASPECT;
  const previewHeight = Math.min(height * 0.45, CARD_H + 40);
  const buttonHeight = Math.max(52, Math.min(68, width * 0.15));
  const buttonRadius = Math.max(12, width * 0.04);
  const buttonIcon = Math.max(20, Math.min(26, width * 0.065));
  const buttonFont = normalize(11, width);

  const bgAnim = useRef(new Animated.Value(0)).current;
  const imgOpacities = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const imgTransY = [
    useRef(new Animated.Value(30)).current,
    useRef(new Animated.Value(30)).current,
    useRef(new Animated.Value(30)).current,
  ];

  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      [0, 1, 2].forEach((i) => {
        const delay = i * 200;
        Animated.parallel([
          Animated.timing(imgOpacities[i], {
            toValue: 1,
            duration: 800,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(imgTransY[i], {
            toValue: 0,
            duration: 800,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    });
  }, []);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#FFFFFF", "#F1F2F4"],
  });

  const openWhatsApp = async () => {
    // Asumimos que tienes una traduccion como: "Mira esta app: {link}"
    const message = t("messages.whatsapp", { link: APP_LINK });
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/?text=${encodedMessage}`;

    try {
      // Comprueba si el dispositivo puede abrir este tipo de URL
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback por si no se puede (ej. en un simulador sin WhatsApp)
        Alert.alert(t("alert.error_title"), t("alert.error_whatsapp"));
      }
    } catch (e) {
      console.error("Failed to open WhatsApp: ", e);
      Alert.alert(t("alert.error_title"), t("alert.error_whatsapp"));
    }
  };
  const openFacebook = async () => {
    const encodedLink = encodeURIComponent(APP_LINK);
    // Facebook usa un sharer web, pasando el link en el parametro 'u'
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t("alert.error_title"), t("alert.error_facebook"));
      }
    } catch (e) {
      console.error("Failed to open Facebook: ", e);
      Alert.alert(t("alert.error_title"), t("alert.error_facebook"));
    }
  };

  const openEmail = async () => {
    // Asumimos traducciones para el asunto y cuerpo del email
    const subject = t("messages.mailSubject");
    const body = t("messages.mailBody", { link: APP_LINK });
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    // El esquema 'mailto:' abre el cliente de correo por defecto
    const url = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t("alert.error_title"), t("alert.error_email"));
      }
    } catch (e) {
      console.error("Failed to open email client: ", e);
      Alert.alert(t("alert.error_title"), t("alert.error_email"));
    }
  };

  const copyLink = async () => {
    try {
      // Usa la funcion setStringAsync de expo-clipboard
      await Clipboard.setStringAsync(APP_LINK);

      // Da feedback al usuario. Toast en Android, Alert en iOS.
      if (Platform.OS === "android") {
        ToastAndroid.show(t("alerts.toastCopied"), ToastAndroid.SHORT);
      } else {
        Alert.alert(t("alert.copied_title"), t("alert.copied_message"));
      }
    } catch (e) {
      console.error("Failed to copy link: ", e);
      Alert.alert(t("alert.error_title"), t("alert.error_copy"));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: bgColor, paddingHorizontal: horizontalPadding },
          ]}
        >
          {/* --- SECCIÓN DE ENCABEZADO --- */}
          <View style={styles.header}>
            {/* --- NUEVO BOTON --- */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={[styles.title, { fontSize: titleSize }]}>
              {t("title")}
            </Text>
            {/* --- NUEVO ESPACIADOR --- */}
            <View style={styles.spacer} />
            {/* --- FIN NUEVO ESPACIADOR --- */}
          </View>

          {/* --- SECCIÓN DE CONTENIDO PRINCIPAL --- */}
          <View style={styles.mainContent}>
            <View
              style={[styles.previewArea, { height: previewHeight }]}
              pointerEvents="none"
            >
              {[0, 1, 2].map((i) => {
                const rotate = i === 0 ? "-12deg" : i === 1 ? "10deg" : "-3deg";
                return (
                  <Animated.View
                    key={`layer-${i}`}
                    style={[
                      styles.card,
                      {
                        width: CARD_W,
                        height: CARD_H,
                        borderRadius: Math.max(14, width * 0.045),
                        // --- CORRECCIÓN 1: Orden de apilamiento ---
                        zIndex: i + 1,
                        transform: [
                          { translateY: imgTransY[i] },
                          { rotate },
                          {
                            scale: imgOpacities[i].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.98, 1],
                            }),
                          },
                        ],
                        opacity: imgOpacities[i],
                      },
                    ]}
                  >
                    <Image
                      source={IMAGES[i]}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* --- SECCIÓN DE PIE DE PÁGINA --- */}
          <View style={styles.footer}>
            <Text style={[styles.subTitle, { fontSize: subtitleSize }]}>
              {t("subtitle")}
            </Text>
            <View style={[styles.actions, { gap: Math.max(8, width * 0.03) }]}>
              <ShareButton
                label={t("buttons.whatsapp")}
                icon={
                  <Ionicons
                    name="logo-whatsapp"
                    size={buttonIcon}
                    color="#fff"
                  />
                }
                bg="#25D366"
                onPress={openWhatsApp}
                height={buttonHeight}
                radius={buttonRadius}
                fontSize={buttonFont}
              />
              <ShareButton
                label={t("buttons.facebook")}
                icon={
                  <Ionicons
                    name="logo-facebook"
                    size={buttonIcon}
                    color="#fff"
                  />
                }
                bg="#1877F2"
                onPress={openFacebook}
                height={buttonHeight}
                radius={buttonRadius}
                fontSize={buttonFont}
              />
              <ShareButton
                label={t("buttons.mail")}
                icon={
                  <Ionicons
                    name="mail-outline"
                    size={buttonIcon}
                    color="#fff"
                  />
                }
                bg="#9CA3AF"
                onPress={openEmail}
                height={buttonHeight}
                radius={buttonRadius}
                fontSize={buttonFont}
              />
              <ShareButton
                label={t("buttons.copy")}
                icon={
                  <Ionicons
                    name="link-outline"
                    size={buttonIcon}
                    color="#fff"
                  />
                }
                bg="#2563EB"
                onPress={copyLink}
                height={buttonHeight}
                radius={buttonRadius}
                fontSize={buttonFont}
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShareButton({ label, icon, bg, onPress, height, radius, fontSize }) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bg, height, borderRadius: radius },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon}
      <Text
        style={[styles.btnText, { fontSize }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F2F4" },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
  },
  header: {
 paddingTop: 16,
 marginBottom: 16,
 flexDirection: "row", // Anadido
 alignItems: "center", // Anadido
 justifyContent: "space-between", // Anadido
},
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 250,
  },
  footer: {
    paddingBottom: 16,
    marginTop: 16,
  },
 title: {
 flex: 1, // Anadido para que el centrado funcione
 fontWeight: "700",
 color: "#0F172A",
 textAlign: "center",
 fontFamily: "Montserrat-Bold",
 },

 backButton: {
 width: 40,
 height: 40,
 justifyContent: "center",
 alignItems: "center",
 },
 spacer: {
 width: 40, // Un espaciador invisible para balancear el boton de atras
 },
  previewArea: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  card: {
    position: "absolute",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardImage: { width: "100%", height: "100%" },
  subTitle: {
    fontWeight: "400",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  btn: {
    flex: 1,
    minWidth: "22%",
    maxWidth: "24%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  btnText: {
    marginTop: 6,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});
