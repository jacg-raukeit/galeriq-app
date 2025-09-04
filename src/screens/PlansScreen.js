// src/screens/PlansScreen.js
import React, { useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Pressable,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_W = Math.min(360, Math.round(width * 0.88));
const DOT_SIZE = 8;

const LOTTIE_SRC = require("../assets/lottie/premium.json");

const PLANS = [
  {
    key: "free",
    display: "Base",
    name: "Free",
    price: 0,
    rating: { fotos: 3, invitaciones: 2, agendas: 2 },
    features: [
      { text: "Crear hasta 1 evento", ok: true },
      { text: "Subir hasta 100 fotos/mes", ok: true },
      { text: "1 álbum por evento", ok: true },
      { text: "Hasta 5 invitaciones por evento", ok: true },
      { text: "Checklist con 20 tareas", ok: true },
      { text: "Agenda semanal básica", ok: true },
      { text: "Exportación de datos", ok: false },
      { text: "Soporte prioritario 24/7", ok: false },
      { text: "Sin marca de agua", ok: false },
    ],
  },
  {
    key: "pro",
    display: "Pro",
    name: "Pro",
    price: 9.99,
    rating: { fotos: 4, invitaciones: 4, agendas: 4 },
    features: [
      { text: "Eventos ilimitados", ok: true },
      { text: "Subir 1,500 fotos/mes", ok: true },
      { text: "Hasta 5 álbumes por evento", ok: true },
      { text: "Invitaciones ilimitadas", ok: true },
      { text: "Checklist con 200 tareas", ok: true },
      { text: "Agenda con recordatorios", ok: true },
      { text: "Exportación a PDF/CSV", ok: true },
      { text: "Soporte en horario extendido", ok: true },
      { text: "Sin marca de agua", ok: true },
    ],
  },
  {
    key: "premium",
    display: "Premium",
    name: "Premium",
    price: 24.99,
    rating: { fotos: 5, invitaciones: 5, agendas: 5 },
    features: [
      { text: "Todo lo de Pro", ok: true },
      { text: "Fotos ilimitadas", ok: true },
      { text: "Álbumes ilimitados", ok: true },
      { text: "Plantillas premium de invitaciones", ok: true },
      { text: "Checklist colaborativa en tiempo real", ok: true },
      { text: "Agenda con IA (sugerencias y bloqueos)", ok: true },
      { text: "Exportación avanzada & backup en la nube", ok: true },
      { text: "Soporte prioritario 24/7", ok: true },
      { text: "Sin marca de agua", ok: true },
    ],
  },
];

export default function PlansScreen({ navigation }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef(null);
  const insets = useSafeAreaInsets();

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.95, 1, 0.95],
      extrapolate: "clamp",
    });
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [10, 0, 10],
      extrapolate: "clamp",
    });
    const shadowOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.05, 0.12, 0.05],
      extrapolate: "clamp",
    });

    return (
      <View style={{ width, flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: "center",
            paddingTop: 8,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <Animated.View
            style={[
              styles.cardShadow,
              { shadowOpacity },
              { transform: [{ scale }, { translateY }] },
            ]}
          >
            <LinearGradient
              colors={["#F7F2FF", "#EDE7FF"]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, { width: CARD_W }]}
            >
              <Text style={styles.planTitle}>{item.display}</Text>

              {/* Lottie */}
              <View style={styles.lottieWrap}>
                <LottieView
                  source={LOTTIE_SRC}
                  autoPlay
                  loop
                  style={{ width: 160, height: 160 }}
                />
              </View>

              {/* Precio */}
              <Text style={styles.priceLabel}>Desde</Text>
              <Text style={styles.priceValue}>
                ${item.price === 0 ? "0" : item.price}
                {item.price !== 0 ? "/mo" : ""}
              </Text>

              {/* Bloque blanco tipo rating */}
              <View style={styles.ratingBlock}>
                <View style={styles.ratingRow}>
                  <RatingRow label="Fotos" stars={item.rating.fotos} />
                  <View style={styles.starsContainer}></View>
                </View>

                <View style={styles.ratingRow}>
                  <RatingRow label="Invitaciones" stars={item.rating.invitaciones} />
                  <View style={styles.starsContainer}>
                    {/* Aquí va tu componente de estrellas */}
                   
                  </View>
                </View>

                <View style={styles.ratingRow}>
                  <RatingRow label="Agendas" stars={item.rating.agendas} />
                  <View style={styles.starsContainer}>
                    {/* <Text style={styles.starsText}>
                      {item.rating.calidad}/10
                    </Text> */}
                  </View>
                </View>
              </View>

              {/* Features */}
              <View style={{ marginTop: 12 }}>
                {item.features.map((f, i) => (
                  <View key={`${item.key}-f-${i}`} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={f.ok ? "#2A7BFF" : "#C7C9D1"}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[styles.featureText, !f.ok && styles.featureMuted]}
                    >
                      {f.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <Pressable
                onPress={() => {
                  // TODO: conecta a tu flujo de compra/cambio de plan
                }}
                style={({ pressed }) => [
                  styles.cta,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <LinearGradient
                  colors={["#2D6CFF", "#7B5CFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>Select Plan</Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
        >
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Plans & Subscriptions</Text>
        <View style={{ width: 36 }} />
      </View>

      <SwipeHint />

      {/* Carrusel */}
      <View style={{ flex: 1 }}>
        <Animated.FlatList
          ref={flatRef}
          data={PLANS}
          keyExtractor={(it) => it.key}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={width}
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />

        {/* Dots absolutos */}
        <View pointerEvents="none" style={[styles.dotsRow, { bottom: 1 }]}>
          {PLANS.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotScale = scrollX.interpolate({
              inputRange,
              outputRange: [1, 1.6, 1],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={`dot-${i}`}
                style={[
                  styles.dot,
                  { transform: [{ scale: dotScale }], opacity: dotOpacity },
                ]}
              />
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function RatingRow({ label, stars = 3 }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={{ flexDirection: "row", marginLeft: 8 }}>
        {[...Array(5)].map((_, i) => (
          <Ionicons
            key={`${label}-${i}`}
            name={i < stars ? "star" : "star-outline"}
            size={16}
            color={i < stars ? "#FFB800" : "#E2E3E7"}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    </View>
  );
}

function SwipeHint() {
  const t = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <View style={styles.hintWrap}>
      {/* <Animated.View style={{ flexDirection: 'row', alignItems: 'center', opacity }}>
        <Text style={styles.hintText}>Desliza para ver más planes</Text>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <Ionicons name="arrow-forward" size={16} color="#6B6F76" />
        </Animated.View>
      </Animated.View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6FA", paddingTop: 28 },

  header: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },

  hintWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: "#6B6F76",
    marginRight: 6,
  },

  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 10,
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "#EDEBFF",
  },

  planTitle: {
    alignSelf: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginTop: 2,
    marginBottom: 6,
  },
  lottieWrap: {
    alignSelf: "center",
    width: 180,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
  },

  priceLabel: {
    textAlign: "center",
    color: "#9AA0A6",
    fontSize: 12,
  },
  priceValue: {
    textAlign: "center",
    fontSize: 36,
    fontWeight: "800",
    color: "#111",
    marginTop: 2,
  },

  ratingBlock: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    flexDirection: "column", 
    gap: 8, 
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between", 
    alignItems: "center",
    width: "100%",
  },
  ratingLabel: {
    fontSize: 13,
    color: "#111",
    fontWeight: "600",
  },
  ratingRight: { width: 80, alignItems: "flex-end" },
  ratingRightTop: { fontSize: 12, color: "#9AA0A6" },
  ratingRightBottom: { fontSize: 12, color: "#6B6F76", fontWeight: "600" },

  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsText: {
    fontSize: 13,
    color: "#111",
    fontWeight: "600",
    marginLeft: 4, 
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  featureText: { fontSize: 14, color: "#111" },
  featureMuted: { color: "#B6BAC2" },

  cta: {
    marginTop: 16,
    marginBottom: 8, 
    alignSelf: "center",
    width: CARD_W - 80,
    borderRadius: 22,
    overflow: "hidden",
  },
  ctaGradient: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 22,
  },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  dotsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "white",
    
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#7B5CFF",
    marginHorizontal: 5,
    marginBottom: 25,
  },
});
