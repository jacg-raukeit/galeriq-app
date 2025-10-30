// src/screens/EventDetailScreen.js
import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import i18n from "../i18n/i18n";

const API_URL = "http://143.198.138.35:8000";

const EVENT_TYPES = [
  "Boda",
  "Cumpleaños",
  "XV Anos",
  "Graduacion",
  "Bautizo",
  "Evento Corporativo",
  "Otro",
];

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);
const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const HERO_H = Math.max(280, SCREEN_H * 0.5);

export default function EventDetailScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const initialEvent = route?.params?.event || null;
  const { t } = useTranslation("event_detail");
  const locale = i18n.language?.startsWith("es") ? "es-ES" : "en-US";

  const { user } = useContext(AuthContext);
  const bearer = useMemo(() => user?.token || user?.access_token || "", [user]);

  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [iosDateModalVisible, setIosDateModalVisible] = useState(false);
  const [iosTimeModalVisible, setIosTimeModalVisible] = useState(false);
  const [tempDateIOS, setTempDateIOS] = useState(new Date());
  const [tempTimeIOS, setTempTimeIOS] = useState(new Date());

  const [eventAddress, setEventAddress] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [coverUri, setCoverUri] = useState(null);

  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [isOtherType, setIsOtherType] = useState(false);

  const [updatingEvent, setUpdatingEvent] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  const [ownerVisible, setOwnerVisible] = useState(false);
  const [ownerTab, setOwnerTab] = useState("add");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [removeEmail, setRemoveEmail] = useState("");
  const [assigningOwner, setAssigningOwner] = useState(false);
  const [removingOwner, setRemovingOwner] = useState(false);

  const [activeTab, setActiveTab] = useState(null);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const submenuAnim = useRef(new Animated.Value(0)).current;

  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleLabel, setRoleLabel] = useState("");

  const isOwner = role === 1;
  const isGuest = role === 2;

  const toRoleNumber = (data) => {
    if (data == null) return null;
    if (typeof data === "number") return data;
    if (typeof data === "string") {
      const n = parseInt(data, 10);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof data === "object") {
      if (data.role_id != null) return parseInt(String(data.role_id), 10);
      if (data.role != null) return parseInt(String(data.role), 10);
    }
    return null;
  };

  const toRoleLabel = (raw) => {
    if (raw && typeof raw === "object") {
      const roleId =
        raw.role_id != null ? parseInt(String(raw.role_id), 10) : null;
      const isAdmin = !!raw.is_admin;
      if (roleId === 1) return isAdmin ? "Administrador" : "Organizador";
      if (roleId === 2) return "Invitado";
      if (raw.type) return String(raw.type);
      if (raw.name) return String(raw.name);
      if (raw.label) return String(raw.label);
    }
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
        ? parseInt(raw, 10)
        : null;
    if (n === 1) return "Organizador";
    if (n === 2) return "Invitado";
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return "—";
  };

  const targetEventId =
    initialEvent?.event_id ??
    route?.params?.eventId ??
    route?.params?.id ??
    null;

  useEffect(() => {
    let mounted = true;

    const seedStateFromEvent = (ev) => {
      setEventData(ev);
      setEventName(ev.event_name || "");
      setEventDate(ev.event_date ? new Date(ev.event_date) : new Date());
      setEventAddress(ev.event_address || "");
      setEventType(ev.event_type || "");
      setEventDescription(ev.event_description || "");
      setCoverUri(ev.event_cover || null);

      const inList = EVENT_TYPES.includes(ev.event_type);
      setIsOtherType(!inList || ev.event_type === "Otro");

      if (ev?.role != null) {
        const rNum = toRoleNumber(ev.role);
        const rLbl = toRoleLabel(ev.role);
        setRole(rNum);
        setRoleLabel(rLbl);
        setRoleLoading(false);
      }
    };

    const fetchEventById = async () => {
      if (!targetEventId) {
        if (initialEvent?.event_id) {
          seedStateFromEvent(initialEvent);
          setLoading(false);
        } else {
          setLoading(false);
          Alert.alert(t("alerts.event_title"), t("alerts.event_id_missing"));
        }
        return;
      }

      try {
        setLoading(true);
        setRoleLoading(true);

        const res = await fetch(
          `${API_URL}/events/${encodeURIComponent(targetEventId)}`,
          {
            method: "GET",
            headers: {
              ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
            },
          }
        );

        const raw = await res.text();
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            Alert.alert(t("session.title"), t("session.expired"));
            navigation.goBack();
            return;
          }
          if (res.status === 404) {
            Alert.alert(t("alerts.event_title"), t("alerts.event_not_found"));
            navigation.goBack();
            return;
          }
          throw new Error(raw || `HTTP ${res.status}`);
        }

        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }

        const roleFromApi = data?.role;
        const roleNumber = toRoleNumber(roleFromApi);
        const label = toRoleLabel(roleFromApi);

        if (!mounted) return;

        seedStateFromEvent(data);
        setRole(roleNumber);
        setRoleLabel(label);
      } catch (e) {
        if (mounted) {
          console.error("Error cargando evento por ID:", e?.message || e);
          Alert.alert(t("alerts.error_title"), t("alerts.error_loading_event"));
        }
      } finally {
        if (mounted) {
          setRoleLoading(false);
          setLoading(false);
        }
      }
    };

    fetchEventById();
    return () => {
      mounted = false;
    };
  }, [targetEventId, bearer]);

  const animateSubmenuIn = () => {
    Animated.timing(submenuAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const animateSubmenuOut = (onEnd) => {
    Animated.timing(submenuAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onEnd && onEnd();
    });
  };

  const onChangeDateAndroid = (_, selected) => {
    setShowDatePicker(false);
    if (selected) {
      const newDate = new Date(selected);
      newDate.setHours(
        eventDate.getHours(),
        eventDate.getMinutes(),
        eventDate.getSeconds()
      );
      setEventDate(newDate);
      setShowTimePicker(true);
    }
  };

  const onChangeTimeAndroid = (_, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(eventDate);
      newDate.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        selectedTime.getSeconds()
      );
      setEventDate(newDate);
    }
  };

  const openIOSDateModal = () => {
    setTempDateIOS(new Date(eventDate));
    setIosDateModalVisible(true);
  };

  const confirmIOSDate = () => {
    const merged = new Date(eventDate);
    merged.setFullYear(
      tempDateIOS.getFullYear(),
      tempDateIOS.getMonth(),
      tempDateIOS.getDate()
    );
    setEventDate(merged);
    setIosDateModalVisible(false);

    setTempTimeIOS(new Date(merged));
    setIosTimeModalVisible(true);
  };

  const cancelIOSDate = () => {
    setIosDateModalVisible(false);
  };

  const confirmIOSTime = () => {
    const updated = new Date(eventDate);
    updated.setHours(tempTimeIOS.getHours(), tempTimeIOS.getMinutes(), 0, 0);
    setEventDate(updated);
    setIosTimeModalVisible(false);
  };

  const cancelIOSTime = () => {
    setIosTimeModalVisible(false);
  };

  const openDateFlow = () => {
    if (Platform.OS === "ios") {
      openIOSDateModal();
    } else {
      setShowDatePicker(true);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("alerts.permissions_title"), t("alerts.need_gallery"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("alerts.permissions_title"), t("alerts.need_camera"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const handleUpdate = async () => {
    if (updatingEvent) return;

    if (isOtherType && !eventType.trim()) {
      Alert.alert(
        t("alerts.type_required_title"),
        t("alerts.type_required_msg")
      );
      return;
    }

    try {
      setUpdatingEvent(true);
      const form = new FormData();
      form.append("event_name", eventName);
      form.append("event_date", eventDate.toISOString());
      form.append("event_address", eventAddress);
      form.append("event_type", eventType);
      form.append("event_description", eventDescription);

      let res = await fetch(`${API_URL}/events/${eventData.event_id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${user.token}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();

      if (coverUri && !String(coverUri).startsWith("http")) {
        const coverForm = new FormData();
        const filename = coverUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename || "");
        const mime = match ? `image/${match[1]}` : "image/jpeg";
        coverForm.append("event_cover", {
          uri: coverUri,
          name: filename,
          type: mime,
        });

        let coverRes = await fetch(
          `${API_URL}/events/${eventData.event_id}/cover`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${user.token}` },
            body: coverForm,
          }
        );
        if (!coverRes.ok) throw new Error(await coverRes.text());
        const coverData = await coverRes.json();
        updated.event_cover = coverData.event_cover;
      }

      setEventData(updated);
      setEventName(updated.event_name || "");
      setEventDate(
        updated.event_date ? new Date(updated.event_date) : new Date()
      );
      setEventAddress(updated.event_address || "");
      setEventType(updated.event_type || "");
      setEventDescription(updated.event_description || "");
      setCoverUri(updated.event_cover || null);
      const inList = EVENT_TYPES.includes(updated.event_type);
      setIsOtherType(!inList || updated.event_type === "Otro");

      setEditVisible(false);
    } catch (err) {
      console.error("Error al actualizar evento:", err);
      Alert.alert(t("alerts.error_title"), t("alerts.error_updating_event"));
    } finally {
      setUpdatingEvent(false);
    }
  };

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email.trim());

  const handleAssignOwnerByEmail = async () => {
    if (assigningOwner) return;
    const email = ownerEmail.trim();
    if (!isValidEmail(email)) {
      Alert.alert(
        t("owner_modal.validations.email_invalid_title"),
        t("owner_modal.validations.email_invalid_msg")
      );
      return;
    }
    if (!eventData?.event_id) {
      Alert.alert(
        t("owner_modal.errors.id_missing_title"),
        t("owner_modal.errors.id_missing_msg")
      );
      return;
    }

    try {
      setAssigningOwner(true);
      const form = new FormData();
      form.append("email", email);
      form.append("event_id", String(eventData.event_id));

      const res = await fetch(`${API_URL}/user/add-owner`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
        body: form,
      });

      const raw = await res.text();
      if (!res.ok) {
        let detail = "No se pudo asignar el owner.";
        try {
          const data = JSON.parse(raw);
          if (data?.detail) detail = data.detail;
        } catch {}
        if (res.status === 404) {
          Alert.alert(
            t("owner_modal.api.not_found_title"),
            t("owner_modal.api.not_found_user")
          );
        } else {
          Alert.alert(t("owner_modal.api.notice_title"), String(detail));
        }
        return;
      }

      Alert.alert(
        t("owner_modal.success.title"),
        t("owner_modal.success.assigned")
      );
      setOwnerEmail("");
      setOwnerVisible(false);
    } catch (e) {
      console.error("Error asignando owner:", e);
      Alert.alert(
        t("owner_modal.errors.assign_title"),
        t("owner_modal.errors.assign_msg")
      );
    } finally {
      setAssigningOwner(false);
    }
  };

  const resolveUserIdByEmail = async (email) => {
    const headers = { Authorization: `Bearer ${user.token}` };

    try {
      const r = await fetch(
        `${API_URL}/user/owners?event_id=${encodeURIComponent(
          eventData.event_id
        )}`,
        { headers }
      );
      if (r.ok) {
        const owners = await r.json();
        const hit = owners?.find?.(
          (o) => String(o?.email).toLowerCase() === email.toLowerCase()
        );
        if (hit?.user_id != null) return Number(hit.user_id);
      }
    } catch (e) {
      console.log("owners lookup failed:", e?.message || e);
    }

    try {
      const r2 = await fetch(`${API_URL}/user/all`, { headers });
      if (r2.ok) {
        const users = await r2.json();
        const hit = users?.find?.(
          (u) => String(u?.email).toLowerCase() === email.toLowerCase()
        );
        if (hit?.user_id != null) return Number(hit.user_id);
      }
    } catch (e) {
      console.log("all users lookup failed:", e?.message || e);
    }

    return null;
  };

  const handleRemoveOwnerByEmail = async () => {
    if (removingOwner) return;
    const email = removeEmail.trim();
    if (!isValidEmail(email)) {
      Alert.alert(
        t("owner_modal.validations.email_invalid_title"),
        t("owner_modal.validations.email_invalid_msg")
      );
      return;
    }
    if (!eventData?.event_id) {
      Alert.alert(
        t("owner_modal.errors.id_missing_title"),
        t("owner_modal.errors.id_missing_msg")
      );
      return;
    }

    try {
      setRemovingOwner(true);

      const uid = await resolveUserIdByEmail(email);
      if (!uid) {
        Alert.alert(
          "No encontrado",
          "No se pudo encontrar el usuario por ese correo."
        );
        return;
      }

      const url = `${API_URL}/user/owner?user_id=${encodeURIComponent(
        uid
      )}&event_id=${encodeURIComponent(eventData.event_id)}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const raw = await res.text();
      if (!res.ok) {
        let msg = "No se pudo eliminar el owner.";
        try {
          const data = JSON.parse(raw);
          if (data?.detail) msg = data.detail;
        } catch {}
        Alert.alert(t("owner_modal.api.notice_title"), msg);
        return;
      }

      Alert.alert(
        t("owner_modal.success.title"),
        t("owner_modal.success.removed")
      );
      setRemoveEmail("");
      setOwnerVisible(false);
    } catch (e) {
      console.error("Error eliminando owner:", e);
      Alert.alert(
        t("owner_modal.errors.remove_title"),
        t("owner_modal.errors.remove_msg")
      );
    } finally {
      setRemovingOwner(false);
    }
  };

  const goMyEvents = () => {
    setActiveTab(0);
    setSubmenuOpen(false);
    navigation.navigate("Events");
  };
  const toggleSubmenu = () => {
    if (!isOwner) return;
    setActiveTab(1);
    if (submenuOpen) {
      animateSubmenuOut(() => setSubmenuOpen(false));
    } else {
      setSubmenuOpen(true);
      requestAnimationFrame(animateSubmenuIn);
    }
  };
  const goAgenda = () => {
    setActiveTab(2);
    setSubmenuOpen(false);
    navigation.navigate("Agenda", {
      eventId: eventData.event_id,
      eventDate: eventData.event_date,
    });
  };
  const goPlanning = () => {
    setActiveTab(2);
    setSubmenuOpen(false);
   navigation.navigate("PlanningHome", { 
    eventId: eventData.event_id,
    eventDate: eventData.event_date
  });
  };
  const goExpenses = () => {
    setActiveTab(2);
    setSubmenuOpen(false);
   navigation.navigate("BudgetControl", { 
    eventId: eventData.event_id,
    eventDate: eventData.event_date
  });
  };
  const goGuests = () => {
    setActiveTab(3);
    setSubmenuOpen(false);
    navigation.navigate("GuestList", { eventId: eventData.event_id });
  };
  const goAlbums = () => {
    setActiveTab(4);
    setSubmenuOpen(false);
    navigation.navigate("PortadaAlbums", { eventId: eventData.event_id });
  };
  const goInvitations = () => {
    setActiveTab(5);
    setSubmenuOpen(false);
    navigation.navigate("InvitationsHome", { eventId: eventData.event_id });
  };
  const openOwner = () => {
    if (!isOwner) return;
    setActiveTab(6);
    setSubmenuOpen(false);
    setOwnerTab("add");
    setOwnerVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.empty, { paddingTop: 40 }]}>
        <ActivityIndicator size="large" color="#6B21A8" />
        <Text style={{ marginTop: 8, color: "#6B7280" }}>{t("loading")}</Text>
      </View>
    );
  }

  if (!eventData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t("not_found")}</Text>
      </View>
    );
  }

  const prettyDate = new Date(eventData.event_date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const prettyTime = new Date(eventData.event_date).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.root}>
      {/* ====== HERO pegado arriba ====== */}
      <View style={{ width: SCREEN_W, height: HERO_H }}>
        <ImageBackground
          source={eventData.event_cover ? { uri: eventData.event_cover } : null}
          style={StyleSheet.absoluteFill}
          imageStyle={{ resizeMode: "cover" }}
        >
          {/* degradado inferior para legibilidad */}
          <LinearGradient
            colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.55)"]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        {/* Botones flotantes con blur */}
        <View style={[styles.topActions, { paddingTop: insets.top + 6 }]}>
          <BlurView intensity={30} tint="dark" style={styles.blurIconWrap}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconHit}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          </BlurView>

          {isOwner ? (
            <BlurView intensity={30} tint="dark" style={styles.blurIconWrap}>
              <TouchableOpacity
                onPress={() => setEditVisible(true)}
                style={styles.iconHit}
              >
                <Ionicons name="pencil" size={20} color="#fff" />
              </TouchableOpacity>
            </BlurView>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* Contenido (título + meta) anclado abajo */}
        <View style={styles.heroBottom}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {eventData.event_name}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#F9FAFB" />
              <Text style={styles.metaText}>{prettyDate}</Text>
            </View>
            <View style={styles.dot} />
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#F9FAFB" />
              <Text style={styles.metaText}>{prettyTime}</Text>
            </View>
          </View>

          {/* Dirección y tag en columna */}
  <View style={styles.bottomMetaContainer}>
    {!!eventData.event_address && (
      <View style={[styles.metaItem, { marginBottom: 4 }]}>
        <Ionicons name="location-outline" size={16} color="#F9FAFB" />
        <Text style={styles.metaText} numberOfLines={2}>
          {eventData.event_address}
        </Text>
      </View>
    )}
        </View>

       {!!eventData.event_type && (
      <View style={styles.typePillInline}>
        <Ionicons name="pricetag-outline" size={14} color="#fff" />
        <Text style={styles.typePillText}>{eventData.event_type}</Text>
      </View>
    )}
  </View>
</View>

      {/* ====== CONTENIDO ====== */}
      <ScrollView bounces contentContainerStyle={{ paddingBottom: 150 }}>
        <View style={styles.sectionCard}>
          <SectionTitle
            icon="document-text-outline"
            title={t("section.description_title")}
          />
          <Text style={styles.sectionText}>
            {eventData.event_description?.trim() ||
              t("section.description_empty")}
          </Text>
        </View>
      </ScrollView>

      {/* SUBMENÚ flotante (solo owners) */}
      {isOwner && submenuOpen && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.submenuOverlay,
            {
              opacity: submenuAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <AnimatedTouchableOpacity
            activeOpacity={1}
            onPress={() => animateSubmenuOut(() => setSubmenuOpen(false))}
            style={[
              styles.submenuBackdrop,
              {
                opacity: submenuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.25],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.submenuPanel,
              {
                transform: [
                  {
                    translateY: submenuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, -36],
                    }),
                  },
                  {
                    scale: submenuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
                opacity: submenuAnim,
              },
            ]}
          >
            <MiniAction
              icon="calendar-outline"
              label={t("mini_actions.agenda")}
              onPress={goAgenda}
            />
            <MiniAction
              icon="list-outline"
              label={t("mini_actions.planning")}
              onPress={goPlanning}
            />
            <MiniAction
              icon="cash-outline"
              label={t("mini_actions.expenses")}
              onPress={goExpenses}
            />
          </Animated.View>
        </Animated.View>
      )}

      {/* TAB BAR  */}
      <SafeAreaView style={styles.tabSafeArea}>
        <View style={styles.tabBar}>
          {roleLoading ? (
            <>
              <View style={styles.tabSkel} />
              <View style={styles.tabSkel} />
              <View style={styles.tabSkel} />
              <View style={styles.tabSkel} />
            </>
          ) : isOwner ? (
            <>
              <TabItem
                icon="clipboard-outline"
                label={t("tabs.actions")}
                active={submenuOpen}
                onPress={toggleSubmenu}
              />
              <TabItem
                icon="people-outline"
                label={t("tabs.guests")}
                active={false}
                onPress={goGuests}
              />
              <TabItem
                icon="images-outline"
                label={t("tabs.albums")}
                active={false}
                onPress={goAlbums}
              />
              <TabItem
                icon="mail-open-outline"
                label={t("tabs.invites")}
                active={false}
                onPress={goInvitations}
              />
              <TabItem
                icon="person-add-outline"
                label={t("tabs.owner")}
                active={false}
                onPress={openOwner}
              />
            </>
          ) : (
            <>
              <TabItem
                icon="images-outline"
                label={t("tabs.albums")}
                active={false}
                onPress={goAlbums}
              />
              <TabItem
                icon="mail-open-outline"
                label={t("tabs.invites")}
                active={false}
                onPress={goInvitations}
              />
            </>
          )}
        </View>
      </SafeAreaView>

      {/* ====== MODALES ====== */}
      {isOwner && (
        <Modal
          visible={editVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => !updatingEvent && setEditVisible(false)}
              disabled={updatingEvent}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("edit_modal.title")}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.modalContainer,
              { paddingTop: insets.top },
            ]}
          >
            <View style={styles.coverPicker}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverPreview} />
              ) : (
                <View style={[styles.coverPreview, styles.coverPlaceholder]}>
                  <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                  <Text style={{ color: "#9CA3AF", marginTop: 6 }}>
                    {t("edit_modal.cover.select")}
                  </Text>
                </View>
              )}
              <View style={styles.coverActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={pickImage}>
                  <Ionicons name="images-outline" size={18} color="#ffff" />
                  <Text style={styles.iconBtnText}>
                    {t("edit_modal.cover.gallery")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={18} color="#ffff" />
                  <Text style={styles.iconBtnText}>
                    {t("edit_modal.cover.camera")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Field label={t("edit_modal.fields.name.label")}>
              <TextInput
                style={styles.input}
                value={eventName}
                onChangeText={setEventName}
                placeholder={t("edit_modal.fields.name.placeholder")}
                placeholderTextColor="#6B7280"
              />
            </Field>

            {/* === Fecha/hora === */}
            <Field label={t("edit_modal.fields.datetime.label")}>
              <TouchableOpacity
                style={styles.input}
                onPress={openDateFlow}
                activeOpacity={0.9}
              >
                <Text>
                  {eventDate.toLocaleString(locale, {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>

              {/* ANDROID: pickers nativos inline */}
              {Platform.OS === "android" && showDatePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={onChangeDateAndroid}
                />
              )}
              {Platform.OS === "android" && showTimePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="time"
                  display="default"
                  onChange={onChangeTimeAndroid}
                />
              )}
            </Field>

            <Field label={t("edit_modal.fields.address.label")}>
              <TextInput
                style={styles.input}
                value={eventAddress}
                onChangeText={setEventAddress}
                placeholder={t("edit_modal.fields.address.placeholder")}
                placeholderTextColor="#6B7280"
              />
            </Field>

            <Field label={t("edit_modal.fields.type.label")}>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setTypePickerVisible(true)}
                activeOpacity={0.9}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: eventType ? "#111827" : "#9CA3AF" }}>
                    {eventType ||
                      t("edit_modal.fields.type.select_placeholder")}
                  </Text>
                  <Ionicons
                    name="chevron-down-outline"
                    size={18}
                    color="#6B7280"
                  />
                </View>
              </TouchableOpacity>

              {isOtherType && (
                <>
                  <Text style={styles.helperText}>
                    {t("edit_modal.fields.type.helper_other")}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={EVENT_TYPES.includes(eventType) ? "" : eventType}
                    onChangeText={setEventType}
                    placeholder={t("edit_modal.fields.type.other_placeholder")}
                    autoCapitalize="sentences"
                    placeholderTextColor="#6B7280"
                  />
                </>
              )}
            </Field>

            <Field label={t("edit_modal.fields.description.label")}>
              <TextInput
                style={[
                  styles.input,
                  { height: 110, textAlignVertical: "top" },
                ]}
                multiline
                value={eventDescription}
                onChangeText={setEventDescription}
                placeholder={t("edit_modal.fields.description.placeholder")}
                placeholderTextColor="#6B7280"
              />
            </Field>

            <TouchableOpacity
              style={[styles.saveButton, updatingEvent && { opacity: 0.6 }]}
              onPress={handleUpdate}
              disabled={updatingEvent}
              accessibilityRole="button"
              accessibilityState={{
                disabled: updatingEvent,
                busy: updatingEvent,
              }}
            >
              {updatingEvent ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveText}>
                  {t("edit_modal.update_button")}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Modal>
      )}

      {/* TYPE PICKER */}
      <Modal
        visible={typePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerVisible(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
        />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{t("type_picker.title")}</Text>
            <TouchableOpacity onPress={() => setTypePickerVisible(false)}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          {EVENT_TYPES.map((opt) => {
            const selected =
              (!isOtherType && eventType === opt) ||
              (opt === "Otro" && isOtherType);
            return (
              <TouchableOpacity
                key={opt}
                style={styles.pickerRow}
                activeOpacity={0.85}
                onPress={() => {
                  if (opt === "Otro") {
                    setIsOtherType(true);
                    if (EVENT_TYPES.includes(eventType)) setEventType("");
                  } else {
                    setIsOtherType(false);
                    setEventType(opt);
                  }
                  setTypePickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerText,
                    selected && styles.pickerTextSelected,
                  ]}
                >
                  {opt}
                </Text>
                {selected && (
                  <Ionicons name="checkmark" size={18} color="#6B21A8" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* MODAL OWNER */}
      {isOwner && (
  <Modal 
    visible={ownerVisible} 
    transparent
    animationType="slide" 
    onRequestClose={() => setOwnerVisible(false)}
    presentationStyle="overFullScreen"
  >
    <TouchableOpacity 
      style={styles.ownerModalBackdrop} 
      activeOpacity={1} 
      onPress={() => setOwnerVisible(false)}
    />
    <View style={styles.ownerModalSheet}>
          <View style={styles.ownerSheetHeader}>
  <View style={styles.ownerSheetHandle} />
  <Text style={styles.ownerSheetTitle}>{t("owner_modal.title")}</Text>
  <TouchableOpacity 
    style={styles.ownerSheetClose}
    onPress={() => setOwnerVisible(false)}
  >
    <Ionicons name="close" size={22} color="#6B7280" />
  </TouchableOpacity>
</View>

<View style={styles.ownerSheetContent}>
            {/* Tabs */}
            <View style={styles.ownerTabs}>
              <TouchableOpacity
                style={[
                  styles.ownerTabBtn,
                  ownerTab === "add" && styles.ownerTabBtnActive,
                ]}
                onPress={() => setOwnerTab("add")}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.ownerTabText,
                    ownerTab === "add" && styles.ownerTabTextActive,
                  ]}
                >
                  {t("owner_modal.tabs.add")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ownerTabBtn,
                  ownerTab === "remove" && styles.ownerTabBtnActive,
                ]}
                onPress={() => setOwnerTab("remove")}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.ownerTabText,
                    ownerTab === "remove" && styles.ownerTabTextActive,
                  ]}
                >
                  {t("owner_modal.tabs.remove")}
                </Text>
              </TouchableOpacity>
            </View>

            {ownerTab === "add" ? (
              <>
                <Field label={t("owner_modal.fields.user_email_label")}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("owner_modal.fields.email_placeholder")}
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </Field>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    {
                      opacity:
                        isValidEmail(ownerEmail) && !assigningOwner ? 1 : 0.6,
                      marginTop: 8,
                    },
                  ]}
                  disabled={!isValidEmail(ownerEmail) || assigningOwner}
                  onPress={handleAssignOwnerByEmail}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: !isValidEmail(ownerEmail) || assigningOwner,
                    busy: assigningOwner,
                  }}
                >
                  {assigningOwner ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveText}>
                      {t("owner_modal.buttons.assign")}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Field label={t("owner_modal.fields.owner_email_remove_label")}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("owner_modal.fields.email_placeholder")}
                    value={removeEmail}
                    onChangeText={setRemoveEmail}
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </Field>

                <TouchableOpacity
                  style={[
                    styles.removeButton,
                    {
                      opacity:
                        isValidEmail(removeEmail) && !removingOwner ? 1 : 0.6,
                      marginTop: 8,
                    },
                  ]}
                  disabled={!isValidEmail(removeEmail) || removingOwner}
                  onPress={handleRemoveOwnerByEmail}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: !isValidEmail(removeEmail) || removingOwner,
                    busy: removingOwner,
                  }}
                >
                  {removingOwner ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.removeText}>
                      {t("owner_modal.buttons.remove")}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
        </View>
        </View>
      </Modal>
    )}

      {/* ===== iOS: dos MODALES ===== */}
      {Platform.OS === "ios" && (
        <Modal
          visible={iosDateModalVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelIOSDate}
          presentationStyle="overFullScreen"
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t("labels.select_date")}</Text>
              <DateTimePicker
                value={tempDateIOS}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_, d) => d && setTempDateIOS(d)}
                style={styles.pickerIOS}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.btnCancel]}
                  onPress={cancelIOSDate}
                >
                  <Text style={styles.btnCancelText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.btnAccept]}
                  onPress={confirmIOSDate}
                >
                  <Text style={styles.btnAcceptText}>{t("common.accept")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === "ios" && (
        <Modal
          visible={iosTimeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelIOSTime}
          presentationStyle="overFullScreen"
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t("labels.select_time")}</Text>
              <DateTimePicker
                value={tempTimeIOS}
                mode="time"
                display="spinner"
                onChange={(_, d) => d && setTempTimeIOS(d)}
                style={styles.pickerIOS}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.btnCancel]}
                  onPress={cancelIOSTime}
                >
                  <Text style={styles.btnCancelText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.btnAccept]}
                  onPress={confirmIOSTime}
                >
                  <Text style={styles.btnAcceptText}>{t("common.accept")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={18} color="#4B5563" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function TabItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={20} color={active ? "#6B21A8" : "#6B7280"} />
      <Text
        style={[
          styles.tabLabel,
          active && { color: "#111827", fontWeight: "700" },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {active && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );
}

function MiniAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.miniAction}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.miniIconWrap}>
        <Ionicons name={icon} size={18} color="#254236" />
      </View>
      <Text style={styles.miniLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FA" },

  topActions: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 0,
    zIndex: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  blurIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  iconHit: { flex: 1, alignItems: "center", justifyContent: "center" },

  heroBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
  },
  heroTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: "#F9FAFB", fontWeight: "600" },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F9FAFB",
    opacity: 0.85,
  },

  typePill: {
    position: "absolute",
    right: 16,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  typePillText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  sectionCard: {
    backgroundColor: "transparent",
    borderRadius: 0,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  sectionText: { fontSize: 15, color: "#334155", marginTop: 6, lineHeight: 22 },

  gridValue: {
    fontSize: 15,
    color: "#374151",
    marginTop: 6,
    fontWeight: "600",
  },

  submenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  submenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  submenuPanel: {
    position: "absolute",
    bottom: 96,
    alignSelf: "center",
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  miniAction: { alignItems: "center", width: 80 },
  miniIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6EFEA",
  },
  miniLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },

  tabSafeArea: { backgroundColor: "transparent" },
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    marginBottom: 35,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabLabel: { fontSize: 8, marginTop: 4, color: "#6B7280" },
  tabIndicator: {
    width: 28,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#6B21A8",
    marginTop: 6,
  },
  tabSkel: {
    flex: 1,
    height: 32,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#EEF2F7",
  },

  modalHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalContainer: { padding: 16 },

  coverPicker: { marginBottom: 16 },
  coverPreview: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  coverActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#976BC4",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtnText: { color: "#FFFFFF", fontWeight: "700" },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  helperText: { marginTop: 6, marginBottom: 6, color: "#6B7280", fontSize: 12 },

  saveButton: {
    marginTop: 18,
    backgroundColor: "#976BC4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  removeButton: {
    marginTop: 18,
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  removeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#6B7280" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  pickerIOS: { alignSelf: "center" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  btnCancel: { backgroundColor: "#F3F4F6" },
  btnCancelText: { color: "#374151", fontWeight: "600" },
  btnAccept: { backgroundColor: "#6B21A8" },
  btnAcceptText: { color: "#FFF", fontWeight: "700" },

  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  pickerSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 6,
  },
  pickerTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerText: { fontSize: 15, color: "#111827" },
  pickerTextSelected: { color: "#6B21A8", fontWeight: "800" },


ownerModalBackdrop: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "flex-end",
},
ownerModalSheet: {
  backgroundColor: "#FFFFFF",
  // borderTopLeftRadius: 24,
  // borderTopRightRadius: 24,
  height: SCREEN_H * 0.45,
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: -4 },
  elevation: 12,
},
ownerSheetHeader: {
  paddingTop: 12,
  paddingBottom: 16,
  paddingHorizontal: 20,
  borderBottomWidth: 1,
  borderBottomColor: "#F3F4F6",
  alignItems: "center",
},
ownerSheetHandle: {
  width: 40,
  height: 4,
  backgroundColor: "#D1D5DB",
  borderRadius: 2,
  marginBottom: 16,
},
ownerSheetTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#111827",
},
ownerSheetClose: {
  position: "absolute",
  right: 16,
  top: 16,
  padding: 4,
},
ownerSheetContent: {
  flex: 1,
  padding: 20,
  paddingBottom: 32,
},


  ownerTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  ownerTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  ownerTabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  ownerTabText: { color: "#6B7280", fontWeight: "700" },
  ownerTabTextActive: { color: "#111827" },

  bottomMetaContainer: {
  marginTop: 6,
},
typePillInline: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  // paddingHorizontal: 12,
  // paddingVertical: 6,
  // borderRadius: 12,
  overflow: "hidden",
  alignSelf: 'flex-start',
  // backgroundColor: 'rgba(0,0,0,0.3)',
},
});