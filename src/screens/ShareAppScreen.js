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


const MSG_WHATSAPP =
  "¿Ya probaste Galeriq? 🎉 Es la app con la que organizo mis eventos fácilmente.";
const MSG_FACEBOOK =
  "Si estás organizando un evento especial, prueba Galeriq 🎉 gestiona a tus invitados, asigna pendientes y comparte los mejores momentos fácilmente. Descárgal aquí  👇 (link)";
const MAIL_SUBJECT = "Prueba Galeriq para tus eventos";
const MAIL_BODY =
  "Hola,\n\nQuiero recomendarte Galeriq ✨ Una app para planear y gestionar eventos, invitados y compartis momentos especiales de forma simple y rápida. Descárgala aquí: (link)";
const COPY_MSG =
  "Estoy usando Galeriq 🎉 La app que facilita la organización de eventos, pruébala! Te dejo el link: (link)";

export default function ShareAppScreen() {
    const { t } = useTranslation("share");
  const bgAnim = useRef(new Animated.Value(0)).current;

  const imgOpacities = [useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current];

  const imgTransY = [useRef(new Animated.Value(30)).current,
    useRef(new Animated.Value(30)).current,
    useRef(new Animated.Value(30)).current];

  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      const steps = [0, 140, 280];
      steps.forEach((delay, i) => {
        Animated.parallel([
          Animated.timing(imgOpacities[i], {
            toValue: 1,
            duration: 1220,
            delay: i * 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(imgTransY[i], {
            toValue: 0,
            duration: 1220,
            delay: i * 700,
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
    const url = `whatsapp://send?text=${encodeURIComponent(
       t("messages.whatsapp", { link: APP_LINK })
    )}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) return Linking.openURL(url);
      Linking.openURL(
       `https://wa.me/?text=${encodeURIComponent(t("messages.whatsapp", { link: APP_LINK }))}`
      );
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
      <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header */}
        <Text style={styles.title}>{t("title")}</Text>

        {/* Stack de imágenes animadas */}
        <View style={styles.previewArea} pointerEvents="none">
          {/* Tarjetas de atrás hacia adelante */}
          {[0, 1, 2].map((i) => {
            const rotate = i === 0 ? "-16deg" : i === 1 ? "14deg" : "-2deg";
            const z = i + 1;
            return (
              <Animated.View
                key={`layer-${i}`}
                style={[
                  styles.card,
                  {
                    zIndex: z,
                    transform: [
                      { translateY: imgTransY[i] },
                      { rotate: rotate },
                      { scale: imgOpacities[i].interpolate({
                          inputRange: [0, 5], //era 1
                          outputRange: [0.28, 3.70],
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
<Text style={styles.subTitle}>{t("subtitle")}</Text>
        {/* Botones de redes */}
        <View style={styles.actions}>
          <ShareButton
            label={t("buttons.whatsapp")}
            icon={<Ionicons name="logo-whatsapp" size={28} color="#fff" />}
            bg="#25D366"
            onPress={openWhatsApp}
          />
          <ShareButton
            label={t("buttons.facebook")}
            icon={<Ionicons name="logo-facebook" size={28} color="#fff" />}
            bg="#1877F2"
            onPress={openFacebook}
          />
          <ShareButton
            label={t("buttons.mail")}
            icon={<Ionicons name="mail-outline" size={28} color="#fff" />}
            bg="#9CA3AF"
            onPress={openEmail}
          />
          <ShareButton
            label={t("buttons.copy")}
            icon={<Ionicons name="link-outline" size={28} color="#fff" />}
            bg="#2563EB"
            onPress={copyLink}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function ShareButton({ label, icon, bg, onPress }) {
  return (
    <TouchableOpacity style={[styles.btn, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.85}>
      {icon}
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const CARD_W = 280;
const CARD_H = 570;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F2F4" },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 20,
    fontFamily: "Montserrat-Bold",
  },
  previewArea: {
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 158,
    marginBottom: 24,
  },
  card: {
    position: "absolute",
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    
  },
  cardImage: { width: "100%", height: "100%" },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 74,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  btnText: {
    marginTop: 6,
    fontSize: 8,
    color: "#fff",
    fontWeight: "600",
  },

  subTitle: {
    fontSize: 16,
    fontWeight: "300",
    marginTop:150,
},


});
