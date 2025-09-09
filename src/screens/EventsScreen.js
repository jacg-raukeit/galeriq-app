// src/screens/EventsScreen.js
import React, { useContext, useRef, useState, useEffect, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as SecureStore from "expo-secure-store";
import LottieView from "lottie-react-native";

import { AuthContext } from "../context/AuthContext";
import { EventsContext } from "../context/EventsContext";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CreateEventButton from "../components/CreateEventButton";
import EventCard from "../components/EventCard";

const { width } = Dimensions.get("window");
const DRAWER_W = Math.min(width * 0.76, 300);
const API_BASE = "http://143.198.138.35:8000";

const TOKEN_KEY = "galeriq_token";
const USER_ID_KEY = "galeriq_user_id";

const EMPTY_ANIM = require("../assets/lottie/empty.json");

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, setUser } = useContext(AuthContext);
  const { events, refreshEvents, fetchEvents, loadEvents } =
    useContext(EventsContext);
  const refetchEvents = refreshEvents || fetchEvents || loadEvents;
  const [sessionExpired, setSessionExpired] = useState(false);
  const [closingSession, setClosingSession] = useState(false);

  const [archivedById, setArchivedById] = useState({});
  const [notificationsCount, setNotificationsCount] = useState(0);

  const handleAuthExpired = async (instant = false) => {
    if (closingSession) return;
    setSessionExpired(true);

    const doLogout = async () => {
      setClosingSession(true);
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_ID_KEY);
      } catch (_) {
      } finally {
        setUser(null);
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    };

    if (instant) return doLogout();
    setTimeout(doLogout, 1800);
  };

  const fetchNotificationsCount = async () => {
    try {
      if (!user?.token) return;
      const r = await fetch(`${API_BASE}/notifications/unread`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (r.status === 401) {
        try {
          const j = await r.json();
          if (isAuthError(null, j)) return handleAuthExpired();
        } catch (_) {}
        return handleAuthExpired();
      }

      if (!r.ok) throw new Error("No se pudieron obtener notificaciones");
      const list = await r.json();
      const hasIsRead =
        Array.isArray(list) &&
        list.some((n) => typeof n?.is_read !== "undefined");
      const count = hasIsRead
        ? list.filter((n) => n?.is_read === false).length
        : list?.length || 0;
      setNotificationsCount(count);
    } catch (e) {
      if (isAuthError(e)) return handleAuthExpired();
    }
  };

  useEffect(() => {
    if (!events || events.length === 0) return;
    setArchivedById((prev) => {
      const next = { ...prev };
      for (const e of events) {
        if (typeof next[e.event_id] === "undefined") {
          next[e.event_id] = !!e.archived;
        }
      }
      return next;
    });
  }, [events]);

  useFocusEffect(
    React.useCallback(() => {
      const run = async () => {
        try {
          await refetchEvents?.(); 
        } catch (e) {
          if (isAuthError(e)) return handleAuthExpired();
        }
        await fetchNotificationsCount();
      };
      run();
    }, [refetchEvents, user?.token])
  );

  const toggleArchive = (id) => {
    setArchivedById((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  };

  const activeEvents = useMemo(
    () => (events || []).filter((e) => !(archivedById[e.event_id] ?? false)),
    [events, archivedById]
  );

  const archivedEvents = useMemo(
    () => (events || []).filter((e) => archivedById[e.event_id] ?? false),
    [events, archivedById]
  );

  const [open, setOpen] = useState(false);
  const x = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlay = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(x, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlay, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      fetchNotificationsCount();
    } else {
      Animated.parallel([
        Animated.timing(x, {
          toValue: -DRAWER_W,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlay, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [open, x, overlay]);

  const closeDrawer = () => setOpen(false);

  const goTo = (screen) => {
    setOpen(false);
    navigation.navigate(screen);
  };

  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Deseas salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_ID_KEY);
          } catch (e) {
            console.log("Error limpiando SecureStore:", e);
          } finally {
            closeDrawer();
            setUser(null);
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          }
        },
      },
    ]);
  };

  const toLocalEndOfDay = (dateLike) => {
    if (!dateLike) return null;
    const d = new Date(dateLike);
    if (isNaN(d)) return null;
    if (typeof dateLike === "string" && !dateLike.includes("T")) {
      return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
        999
      );
    }
    return d;
  };

  const getDisplayStatus = (evt) => {
    const base = (evt?.event_status || "").toLowerCase();
    const when = toLocalEndOfDay(evt?.event_date);
    if (base === "active" && when && when.getTime() < Date.now()) {
      return "finished";
    }
    return evt?.event_status;
  };

  if (!user) return null;

  const isAuthError = (err, resJson) => {
    if (
      resJson?.detail &&
      String(resJson.detail).includes("Could not validate credentials")
    )
      return true;
    if (err?.status === 401) return true;
    if (typeof err?.message === "string" && err.message.includes("401"))
      return true;
    if (
      typeof err?.message === "string" &&
      err.message.includes("validate credentials")
    )
      return true;
    return false;
  };

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="menu-outline" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Galeriq</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.titleSection}>Mis Eventos</Text>

      <View style={styles.actionContainer}>
        <CreateEventButton onPress={() => navigation.navigate("CreateEvent")} />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {/* Vacío (activos y archivados) */}
        {activeEvents.length === 0 && archivedEvents.length === 0 ? (
          <View style={styles.emptyWrap}>
            <LottieView
              source={EMPTY_ANIM}
              autoPlay
              loop
              style={styles.emptyAnim}
            />
            <Text style={styles.emptyTitle}>¡Nada por aquí!</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer evento y vive la experiencia Galeriq
            </Text>
          </View>
        ) : (
          <>
            {activeEvents.length === 0 ? (
              <Text style={styles.emptyTextSmall}>No hay eventos activos.</Text>
            ) : (
              activeEvents.map((evt) => (
                <TouchableOpacity
                  key={evt.event_id}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate("EventDetail", { event: evt })
                  }
                >
                  <EventCard
                    title={evt.event_name}
                    date={new Date(evt.event_date).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                    imageUri={evt.event_cover}
                    status={getDisplayStatus(evt)}
                    archived={false}
                    onToggleArchive={() => toggleArchive(evt.event_id)}
                  />
                </TouchableOpacity>
              ))
            )}

            {/* Sección Archivados */}
            {archivedEvents.length > 0 && (
              <>
                <View style={styles.sectionDivider} />
                <Text style={styles.archivedTitle}>
                  Archivados ({archivedEvents.length})
                </Text>

                {archivedEvents.map((evt) => (
                  <TouchableOpacity
                    key={evt.event_id}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate("EventDetail", { event: evt })
                    }
                  >
                    <EventCard
                      title={evt.event_name}
                      date={new Date(evt.event_date).toLocaleDateString(
                        "es-ES",
                        { day: "2-digit", month: "long", year: "numeric" }
                      )}
                      imageUri={evt.event_cover}
                      status={getDisplayStatus(evt)}
                      archived={true}
                      onToggleArchive={() => toggleArchive(evt.event_id)}
                    />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* OVERLAY */}
      <Pressable
        onPress={closeDrawer}
        style={StyleSheet.absoluteFill}
        pointerEvents={open ? "auto" : "none"}
      >
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlay.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.25],
              }),
            },
          ]}
        />
      </Pressable>

      {/* DRAWER */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: x }], paddingTop: insets.top }]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerBrand}>Galeriq</Text>
          <TouchableOpacity
            onPress={closeDrawer}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            setOpen(false);
            navigation.navigate("MiPerfil");
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="person-circle-outline" size={20} color="#6B21A8" />
          <Text style={styles.itemText}>Mi perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => goTo("Notifications")}
          activeOpacity={0.85}
        >
          <Ionicons name="notifications-outline" size={20} color="#6B21A8" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.itemText}>Notificaciones</Text>
            {notificationsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationsCount > 99 ? "99+" : String(notificationsCount)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            setOpen(false);
            navigation.navigate("Faq");
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="help-circle-outline" size={20} color="#6B21A8" />
          <Text style={styles.itemText}>Ayuda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} 
        onPress={() => {
            setOpen(false);
            navigation.navigate("InConstruction");
          }} activeOpacity={0.85}>
          <Ionicons name="star-outline" size={20} color="#6B21A8" />
          <Text style={styles.itemText}>Ayúdanos a mejorar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}
        onPress={() => {
            setOpen(false);
            navigation.navigate("Plans");
          }} activeOpacity={0.85}>
          <Ionicons name="diamond-outline" size={20} color="#6B21A8" />
          <Text style={styles.itemText}>Planes y Suscripciones</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} 
        onPress={() => {
            setOpen(false);
            navigation.navigate("InConstruction");
          }} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={20} color="#6B21A8" />
          <Text style={styles.itemText}>Comparte la app</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            setOpen(false);
            navigation.navigate("InConstruction");
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="settings-outline" size={20} color="#6B21A8" />
          <Text style={styles.itemText}>Ajustes</Text>
        </TouchableOpacity>

        {/* Cerrar sesión */}
        <TouchableOpacity
          style={styles.item}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#6B21A8" />
          <Text style={styles.itemText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </Animated.View>

            {/*  Modal de sesión expirada */}
<Modal
  visible={sessionExpired}
  animationType="fade"
  transparent
  statusBarTranslucent
>
  <View style={styles.expiredBackdrop}>
    <View style={styles.expiredCard}>
      <Text style={styles.expiredTitle}>Sesión expirada</Text>
      <Text style={styles.expiredText}>
        Tu sesión ha caducado. Por seguridad debes iniciar sesión nuevamente.
      </Text>

      <View style={{ height: 10 }} />

      <TouchableOpacity
        style={styles.expiredButton}
        onPress={() => handleAuthExpired(true)}
        activeOpacity={0.9}
      >
        <Text style={styles.expiredButtonText}>
          Ir a iniciar sesión
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 6 },
  header: {
    height: 70,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  title: {
    fontFamily: "Montserrat-Regular",
    fontSize: 22,
    textAlign: "center",
    fontWeight: "800",
    color: "#111827",
  },
  titleSection: {
    fontFamily: "Montserrat-Regular",
    fontSize: 28,
    marginLeft: 16,
    fontWeight: "800",
    marginTop: 2,
    color: "#111827",
  },
  actionContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  listContainer: { padding: 16, paddingBottom: 32 },

  emptyWrap: { alignItems: "center", marginTop: 24, paddingHorizontal: 16 },
  emptyAnim: { width: 220, height: 220 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#374151",
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 14.5,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },

  emptyTextSmall: {
    textAlign: "center",
    marginTop: 12,
    color: "#9CA3AF",
    fontSize: 14,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 12,
    marginBottom: 10,
  },
  archivedTitle: {
    fontFamily: "Montserrat-Regular",
    fontSize: 18,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 8,
  },

  overlay: { flex: 1, backgroundColor: "#000" },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_W,
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 2, height: 0 },
    elevation: 12,
  },
  drawerHeader: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: "#F3F4F6",
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  drawerBrand: { fontSize: 18, fontWeight: "800", color: "#111827" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomColor: "#F3F4F6",
    borderBottomWidth: 1,
  },
  itemText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },





expiredBackdrop: {
  flex: 1,
  backgroundColor: '#00000066',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
},
expiredCard: {
  width: '92%',
  maxWidth: 420,
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 18,
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
},
expiredTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: '#6B21A8',
  marginBottom: 8,
  textAlign: 'center',
},
expiredText: {
  fontSize: 14.5,
  color: '#374151',
  textAlign: 'center',
},
expiredButton: {
  marginTop: 12,
  backgroundColor: '#6B21A8',
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
expiredButtonText: {
  color: '#fff',
  fontWeight: '800',
  fontSize: 15,
},

});
