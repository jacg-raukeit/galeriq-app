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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";

// Imágenes de portada (cámbialas por las tuyas)
const IMAGES = [
  require("../assets/images/share1.jpeg"),
  require("../assets/images/share2.jpeg"),
  require("../assets/images/share3.jpeg"),
];

const APP_LINK = "https://tu-link-de-descarga.com";

// —— Helper de fuentes responsivas (basado en ancho 375)
const guidelineBaseWidth = 375;
const normalize = (size, width) => Math.round((width / guidelineBaseWidth) * size);

// Mensajes via i18n (se inyectan abajo)
export default function ShareAppScreen() {
  const { t } = useTranslation("share");
  const { width, height } = useWindowDimensions();

  // Proporciones base
  const horizontalPadding = Math.max(16, width * 0.05);
  const titleSize = normalize(22, width);
  const subtitleSize = normalize(16, width);

  // Tamaños relativos para el stack de tarjetas
  // Anchura ~80% del ancho de pantalla, con tope para tablets
  const CARD_W = Math.min(width * 0.8, 420);
  // Imágenes tipo pantalla vertical ⇒ 9:16 (alto mayor que ancho)
  const CARD_ASPECT = 9 / 16;
  const CARD_H = CARD_W / CARD_ASPECT;

  // Alto del área de preview (considera el alto real de las tarjetas y márgenes)
  const previewHeight = Math.min(height * 0.42, CARD_H + 40);

  // Alto de botones y radio relativo
  const buttonHeight = Math.max(56, Math.min(72, width * 0.16));
  const buttonRadius = Math.max(12, width * 0.04);
  const buttonIcon = Math.max(22, Math.min(28, width * 0.07));
  const buttonFont = normalize(12, width);

  // Animaciones
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
        const delay = i * 700;
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

  // ——— Acciones
  const openWhatsApp = async () => {
    const msg = t("messages.whatsapp", { link: APP_LINK });
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) return Linking.openURL(url);
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
    } catch {
      Alert.alert(t("alerts.whatsappTitle"), t("alerts.whatsappFail"));
    }
  };

  const openFacebook = async () => {
    const text = t("messages.facebook", { link: APP_LINK });
    const sharer = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      APP_LINK
    )}&quote=${encodeURIComponent(text)}`;
    try {
      const fbApp = "fb://facewebmodal/f?href=" + sharer;
      const supported = await Linking.canOpenURL("fb://profile");
      if (supported) return Linking.openURL(fbApp);
      return Linking.openURL(sharer);
    } catch {
      Alert.alert(t("alerts.facebookTitle"), t("alerts.facebookFail"));
    }
  };

  const openEmail = () => {
    const url = `mailto:?subject=${encodeURIComponent(
      t("messages.mailSubject")
    )}&body=${encodeURIComponent(t("messages.mailBody", { link: APP_LINK }))}`;
    Linking.openURL(url).catch(() =>
      Alert.alert(t("alerts.mailTitle"), t("alerts.mailFail"))
    );
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(t("messages.copy", { link: APP_LINK }));
    if (Platform.OS === "android") {
      ToastAndroid.show(t("alerts.toastCopied"), ToastAndroid.SHORT);
    } else {
      Alert.alert(t("alerts.copiedTitle"), t("alerts.copiedBody"));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: bgColor, paddingHorizontal: horizontalPadding },
        ]}
      >
        <Text style={[styles.title, { fontSize: titleSize }]}>{t("title")}</Text>

        {/* Stack de imágenes animadas */}
        <View
          style={[styles.previewArea, { height: previewHeight }]}
          pointerEvents="none"
        >
          {[0, 1, 2].map((i) => {
            const rotate = i === 0 ? "-12deg" : i === 1 ? "10deg" : "-3deg";
            const z = i + 1;
            return (
              <Animated.View
                key={`layer-${i}`}
                style={[
                  styles.card,
                  {
                    width: CARD_W,
                    height: CARD_H,
                    borderRadius: Math.max(14, width * 0.045),
                    zIndex: z,
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
                <Image source={IMAGES[i]} style={styles.cardImage} resizeMode="cover" />
              </Animated.View>
            );
          })}
        </View>

        <Text
          style={[
            styles.subTitle,
            { fontSize: subtitleSize, marginTop: Math.max(12, height * 0.02) },
          ]}
        >
          {t("subtitle")}
        </Text>

        {/* Botones de redes */}
        <View style={[styles.actions, { gap: Math.max(8, width * 0.03) }]}>
          <ShareButton
            label={t("buttons.whatsapp")}
            icon={<Ionicons name="logo-whatsapp" size={buttonIcon} color="#fff" />}
            bg="#25D366"
            onPress={openWhatsApp}
            height={buttonHeight}
            radius={buttonRadius}
            fontSize={buttonFont}
          />
          <ShareButton
            label={t("buttons.facebook")}
            icon={<Ionicons name="logo-facebook" size={buttonIcon} color="#fff" />}
            bg="#1877F2"
            onPress={openFacebook}
            height={buttonHeight}
            radius={buttonRadius}
            fontSize={buttonFont}
          />
          <ShareButton
            label={t("buttons.mail")}
            icon={<Ionicons name="mail-outline" size={buttonIcon} color="#fff" />}
            bg="#9CA3AF"
            onPress={openEmail}
            height={buttonHeight}
            radius={buttonRadius}
            fontSize={buttonFont}
          />
          <ShareButton
            label={t("buttons.copy")}
            icon={<Ionicons name="link-outline" size={buttonIcon} color="#fff" />}
            bg="#2563EB"
            onPress={copyLink}
            height={buttonHeight}
            radius={buttonRadius}
            fontSize={buttonFont}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function ShareButton({ label, icon, bg, onPress, height, radius, fontSize }) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bg, height, borderRadius: radius, paddingHorizontal: height * 0.18 },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon}
      <Text style={[styles.btnText, { fontSize }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F2F4" },
  container: { flex: 1, paddingTop: 8 },
  title: {
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 110,
    fontFamily: "Montserrat-Bold",
  },
  previewArea: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 92,
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
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    marginTop: 6,
    color: "#fff",
    fontWeight: "600",
  },
});
