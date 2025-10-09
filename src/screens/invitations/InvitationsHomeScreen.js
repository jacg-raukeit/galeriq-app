// src/screens/InvitationsHomeScreen.js
import React, {
  useContext,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { EventsContext } from "../../context/EventsContext";
import { AuthContext } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");
const API_BASE = "http://143.198.138.35:8000";

export default function InvitationsHomeScreen() {
  const { t } = useTranslation("invitations_home");
  const navigation = useNavigation();
  const route = useRoute();
  const { events } = useContext(EventsContext);
  const { user } = useContext(AuthContext);

  const { event: eventParam, eventId } = route.params || {};

  const currentEvent = useMemo(() => {
    if (eventParam) return eventParam;
    if (eventId && Array.isArray(events)) {
      return events.find((e) => e.event_id === eventId) || null;
    }
    return Array.isArray(events) && events.length > 0 ? events[0] : null;
  }, [eventParam, eventId, events]);

  const eventName =
    currentEvent?.event_name ?? t("placeholders.event_name_default");
  const eventType =
    currentEvent?.event_type ?? t("placeholders.event_type_default");
  const eventDescription =
    currentEvent?.event_description ?? t("placeholders.event_desc_default");
  const eventDateISO = currentEvent?.event_date ?? null;

  const formattedDateTime = useMemo(() => {
    if (!eventDateISO) return t("placeholders.date_tbd");
    const d = new Date(eventDateISO);
    const fecha = d.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const hora = d.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${capitalize(fecha)} · ${hora}`;
  }, [eventDateISO, t]);

  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const bearer = useMemo(() => user?.token || user?.access_token || "", [user]);

  const toRoleNumber = (data) => {
    if (typeof data === "number") return data;
    if (typeof data === "string") {
      const n = parseInt(data, 10);
      return Number.isFinite(n) ? n : null;
    }
    if (data && typeof data === "object") {
      if (data.role_id != null) return parseInt(String(data.role_id), 10);
      if (data.role != null) return parseInt(String(data.role), 10);
    }
    return null;
  };

  const fetchRole = useCallback(
    async (eid) => {
      if (!eid) return null;
      try {
        const res = await fetch(
          `${API_BASE}/user/role?event_id=${encodeURIComponent(eid)}`,
          {
            headers: {
              ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
            },
          }
        );
        const raw = await res.text();
        if (!res.ok) throw new Error(raw || `HTTP ${res.status}`);
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
        const r = toRoleNumber(data);
        if (r != null) return r;
        throw new Error("role parse error");
      } catch {
        try {
          const res2 = await fetch(`${API_BASE}/user/role`, {
            method: "POST",
            headers: {
              ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ event_id: String(eid) }).toString(),
          });
          const raw2 = await res2.text();
          if (!res2.ok) throw new Error(raw2 || `HTTP ${res2.status}`);
          let data2;
          try {
            data2 = JSON.parse(raw2);
          } catch {
            data2 = raw2;
          }
          return toRoleNumber(data2);
        } catch {
          return null;
        }
      }
    },
    [bearer]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!currentEvent?.event_id) return;
      setRoleLoading(true);
      const r = await fetchRole(currentEvent.event_id);
      if (mounted) {
        setRole(r);
        setRoleLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentEvent?.event_id, fetchRole]);

  const isGuest = role === 2;
  const isOwner = role === 1;

  const ready = !!currentEvent && !roleLoading;
  const titleText = ready ? (isGuest ? t("titles.guest") : t("titles.owner")) : "";

  const [invitationUrl, setInvitationUrl] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [guestPasses, setGuestPasses] = useState(null);

  const fetchInvitation = useCallback(async () => {
    if (!currentEvent?.event_id) {
      setInvitationUrl(null);
      setGuestPasses(null);
      return;
    }
    try {
      setLoadingInvite(true);
      const res = await fetch(
        `${API_BASE}/events/${currentEvent.event_id}/invitation-photo/`,
        {
          headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
        }
      );
      if (!res.ok) {
        if (res.status !== 404) {
          const txt = await res.text().catch(() => "");
          console.warn("Error al obtener invitación:", res.status, txt);
        }
        setInvitationUrl(null);
        setGuestPasses(null);
        return;
      }
      const json = await res.json();

      if (json?.url_invitation) {
        const bust = json.url_invitation.includes("?") ? "&" : "?";
        setInvitationUrl(`${json.url_invitation}${bust}t=${Date.now()}`);
      } else {
        setInvitationUrl(null);
      }

      if (json?.n_passes !== undefined && json?.n_passes !== null) {
        const n = Number(json.n_passes);
        setGuestPasses(Number.isFinite(n) ? n : null);
      } else {
        setGuestPasses(null);
      }
    } catch (e) {
      console.warn("Error al obtener invitación:", e);
      setInvitationUrl(null);
      setGuestPasses(null);
    } finally {
      setLoadingInvite(false);
    }
  }, [currentEvent?.event_id, bearer]);

  useFocusEffect(
    useCallback(() => {
      if (ready) fetchInvitation();
    }, [ready, fetchInvitation])
  );

  useEffect(() => {
    if (ready && route.params?.refreshToken) fetchInvitation();
  }, [ready, route.params?.refreshToken, fetchInvitation]);

  if (!ready) return null;

  const passText = (n) => {
    if (n === 0)
      return t("guest.no_passes", "No tienes pases asignados");
    const label =
      n === 1
        ? t("guest.pass_singular", "pase")
        : t("guest.pass_plural", "pases");
    return t("guest.passes_count", "Tienes {{count}} {{label}}", {
      count: n,
      label,
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F6F2FA" }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.brand}>{t("brand")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.title}>{titleText}</Text>

      {/* Tarjeta preview */}
      <View style={styles.card}>
        {loadingInvite ? (
          <View style={[styles.previewBg, styles.centered]}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, color: "#6B7280", fontWeight: "600" }}>
              {t("loading.invitation")}
            </Text>
          </View>
        ) : invitationUrl ? (
          <Image
            source={{ uri: invitationUrl }}
            style={styles.previewBg}
            resizeMode="cover"
            borderRadius={16}
            onError={() => {
              Alert.alert(
                t("alerts.invite_image_fail_title"),
                t("alerts.invite_image_fail_msg")
              );
              setInvitationUrl(null);
            }}
          />
        ) : (
          <ImageBackground
            source={require("../../assets/images/modern1.jpeg")}
            style={styles.previewBg}
            imageStyle={{ borderRadius: 16 }}
            resizeMode="cover"
          >
            <View style={styles.previewOverlay}>
              <Text style={styles.p5}>{t("preview.invite_prefix")}</Text>
              <Text style={styles.p1}>{eventName}</Text>
              <Text numberOfLines={2} style={styles.p2}>
                {String(eventType).toUpperCase()}
              </Text>
              <Text numberOfLines={2} style={styles.p3}>
                {eventDescription}
              </Text>
              <Text style={styles.p4}>{formattedDateTime}</Text>
            </View>
          </ImageBackground>
        )}
      </View>

      {/* Pases para invitados */}
      {isGuest && guestPasses !== null && (
        <View style={styles.passesBox}>
          <View style={styles.passesIconWrap}>
            <Ionicons name="ticket-outline" size={18} color="#6B21A8" />
          </View>
          <Text style={styles.passesText}>{passText(guestPasses)}</Text>
        </View>
      )}

      {/* Acciones y CTA solo para owner */}
      {isOwner && (
        <>
          <View style={styles.grid}>
            <GridBtn
              icon="grid-outline"
              label={t("grid.explore_designs")}
              onPress={() =>
                navigation.navigate("ExploreDesigns", {
                  event: currentEvent,
                  eventId: currentEvent?.event_id,
                })
              }
            />
          </View>

          <TouchableOpacity
            style={styles.cta}
            onPress={() =>
              navigation.navigate("ExploreDesigns", {
                event: currentEvent,
                eventId: currentEvent?.event_id,
              })
            }
          >
            <Text style={styles.ctaText}>{t("cta.create_invitation")}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function GridBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.gridBtn}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.gridIconWrap}>
        <Ionicons name={icon} size={18} color="#6B21A8" />
      </View>
      <Text style={styles.gridLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 20, fontWeight: "800", color: "#111827" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginTop: 6,
    marginLeft: 16,
  },

  card: { paddingHorizontal: 16, marginTop: 12, paddingBottom: 10 },
  previewBg: {
    width: "100%",
    height: width * 0.9 * 1.5,
    borderRadius: 16,
    backgroundColor: "#FCE7F3",
  },
  centered: { alignItems: "center", justifyContent: "center" },

  previewOverlay: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  p1: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "center",
  },
  p2: {
    color: "#5B2B2B",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  p3: {
    color: "#6B2A4A",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  p4: {
    color: "#4B5563",
    marginTop: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  p5: { color: "#4B5563", fontSize: 14, fontWeight: "700", opacity: 0.8 },

  
  passesBox: {
    marginTop: 6,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F1E7FF",
  },
  passesIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  passesText: {
    fontWeight: "700",
    color: "#111827",
    fontSize: 14,
    flex: 1,
  },

  grid: {
    paddingHorizontal: 16,
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridBtn: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F1E7FF",
  },
  gridIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: {
    fontWeight: "700",
    color: "#111827",
    fontSize: 11,
    flex: 1,
    marginLeft: "20%",
  },

  cta: {
    marginTop: 18,
    marginHorizontal: 16,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#6B21A8",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
