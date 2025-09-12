// src/screens/QuienesSomosScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get("window");

const COLORS = {
  peachA: "#F9D9D4",
  peachB: "#F3C6C0",
  bg: "#F5F0FA",
  title: "#111111",
  text: "#3D3D3D",
  subtle: "#8A8F98",
  primary: "#EB6BB2", // botón
  primaryPressed: "#D85FA2",
};

const MOCK_IMG = require("../assets/images/quienes.jpg");

export default function QuienesSomosScreen({ navigation }) {
  const titleAnim = useRef(new Animated.Value(0)).current;
  const p1Anim = useRef(new Animated.Value(0)).current;
  const p2Anim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (val, delay) =>
      Animated.timing(val, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
      });

    Animated.sequence([
      Animated.parallel([make(titleAnim, 50)]),
      make(p1Anim, 40),
      make(p2Anim, 40),
      make(taglineAnim, 20),
      make(ctaAnim, 0),
    ]).start();
  }, []);

  const fadeUp = (val) => ({
    opacity: val,
    transform: [
      {
        translateY: val.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>¿Quiénes somos?</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Top peach gradient */}
      <LinearGradient
        colors={[COLORS.peachA, COLORS.peachB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topGradient}
      >
        {/* teléfono / mockup centrado */}
        <View style={styles.phoneShadowWrap}>
          <Image source={MOCK_IMG} style={styles.phoneImg} />
        </View>
      </LinearGradient>

      {/* Card white con esquinas redondeadas */}
      <ScrollView
        bounces={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        style={styles.card}
      >
        <Animated.Text style={[styles.h1, fadeUp(titleAnim)]}>
          Somos Galeriq
        </Animated.Text>

        <Animated.Text style={[styles.p, fadeUp(p1Anim)]}>
          Somos Galeriq, la app todo en uno que transforma la forma en la que
          organizas y disfrutas tus eventos. Creemos que cada celebración merece
          ser única y sin complicaciones. Por eso reunimos en un solo lugar todo
          lo que necesitas: desde crear tu evento, llevar el control de tareas,
          administrar tu presupuesto y gastos, hasta diseñar invitaciones
          personalizadas y dar seguimiento a tus invitados con RSVP en tiempo
          real.
        </Animated.Text>

        <Animated.Text style={[styles.p, fadeUp(p2Anim)]}>
          Con Galeriq, también puedes crear álbumes colaborativos donde tus
          invitados compartan fotos y videos de cada momento especial, haciendo
          recuerdos juntos. Nuestra misión es simplificar lo complejo: hacer que
          planificar, organizar y compartir tu evento sea tan emocionante como
          vivirlo.
        </Animated.Text>

        <Animated.Text style={[styles.tagline, fadeUp(taglineAnim)]}>
          Organiza. Comparte. Celebra.
        </Animated.Text>

        <Animated.View style={[fadeUp(ctaAnim)]}>
          <Pressable
            onPress={() => navigation.navigate("Events")}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: pressed
                  ? COLORS.primaryPressed
                  : COLORS.primary,
              },
            ]}
          >
            <Text style={styles.ctaText}>
              Descubre cómo organizar tu evento
            </Text>
          </Pressable>

          <Text style={styles.caption}>
            Todo lo que necesitas para tus eventos en una sola app
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PHONE_W = Math.min(240, width * 0.5);
const PHONE_H = PHONE_W * 2.05;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.peachB },
  header: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.title,
  },
  topGradient: {
    height: 210,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 0,
  },
  phoneShadowWrap: {
    width: PHONE_W + 16,
    height: PHONE_H + 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    marginBottom: -26,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  phoneImg: {
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: 28,
    resizeMode: "cover",
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 32,
  },
  h1: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.title,
    marginBottom: 10,
  },
  p: {
    fontSize: 15.5,
    lineHeight: 22.5,
    color: COLORS.text,
    marginBottom: 14,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.title,
    marginTop: 8,
    marginBottom: 12,
  },
  cta: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  ctaText: {
    color: "#fff",
    fontSize: 14.5,
    fontWeight: "700",
  },
  caption: {
    marginTop: 10,
    textAlign: "center",
    color: COLORS.subtle,
    fontSize: 12.5,
  },
});
