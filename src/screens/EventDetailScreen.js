// src/screens/EventDetailScreen.js
import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function EventDetailScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { event: initialEvent } = useRoute().params;
  const { user } = useContext(AuthContext);

  const [updatingEvent, setUpdatingEvent] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  // ==== MODAL OWNER ====
  const [ownerVisible, setOwnerVisible] = useState(false);
const [ownerTab, setOwnerTab] = useState("add"); // "add" | "remove"
  const [ownerEmail, setOwnerEmail] = useState("");           // para agregar
  const [removeEmail, setRemoveEmail] = useState("");         // para eliminar
  const [assigningOwner, setAssigningOwner] = useState(false);
  const [removingOwner, setRemovingOwner] = useState(false);

  const [eventData, setEventData] = useState(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventAddress, setEventAddress] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [coverUri, setCoverUri] = useState(null);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [isOtherType, setIsOtherType] = useState(false);

  const [activeTab, setActiveTab] = useState(null);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const submenuAnim = useRef(new Animated.Value(0)).current;

  const [role, setRole] = useState(null); // 1 owner, 2 invitado
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleLabel, setRoleLabel] = useState("");
  const bearer = useMemo(() => user?.token || user?.access_token || "", [user]);

  const isOwner = role === 1;
  const isGuest = role === 2;

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

  useEffect(() => {
    if (initialEvent) {
      setEventData(initialEvent);
      setEventName(initialEvent.event_name);
      setEventDate(new Date(initialEvent.event_date));
      setEventAddress(initialEvent.event_address);
      setEventType(initialEvent.event_type);
      setEventDescription(initialEvent.event_description || "");
      setCoverUri(initialEvent.event_cover);
      const inList = EVENT_TYPES.includes(initialEvent.event_type);
      setIsOtherType(!inList || initialEvent.event_type === "Otro");
    }
  }, [initialEvent]);

  useEffect(() => {
    if (editVisible) {
      const inList = EVENT_TYPES.includes(eventType);
      setIsOtherType(!inList || eventType === "Otro");
    }
  }, [editVisible]);

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
    async (eventId) => {
      if (!eventId) return null;
      try {
        const res = await fetch(`${API_URL}/user/role?event_id=${encodeURIComponent(eventId)}`, {
          headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
        });
        const raw = await res.text();
        if (!res.ok) throw new Error(raw || `HTTP ${res.status}`);
        let data;
        try { data = JSON.parse(raw); } catch { data = raw; }
        const r = toRoleNumber(data);
        if (r != null) return r;
        throw new Error("role parse error");
      } catch {
        try {
          const res2 = await fetch(`${API_URL}/user/role`, {
            method: "POST",
            headers: {
              ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ event_id: String(eventId) }).toString(),
          });
          const raw2 = await res2.text();
          if (!res2.ok) throw new Error(raw2 || `HTTP ${res2.status}`);
          let data2;
          try { data2 = JSON.parse(raw2); } catch { data2 = raw2; }
          return toRoleNumber(data2);
        } catch (err2) {
          console.log("No fue posible obtener role:", err2?.message || err2);
          return null;
        }
      }
    },
    [bearer]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!initialEvent?.event_id) return;
      setRoleLoading(true);
      const r = await fetchRole(initialEvent.event_id);
      if (mounted) setRole(r);

      try {
        const res = await fetch(
          `${API_URL}/user/event-role?event_id=${encodeURIComponent(initialEvent.event_id)}`,
          { headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) } }
        );
        const raw = await res.text();
        let data;
        try { data = JSON.parse(raw); } catch { data = raw; }
        const label = typeof data === "string" ? data : data?.role ?? data?.name ?? "";
        if (mounted) setRoleLabel(String(label || "").trim());
      } catch {
        if (mounted) setRoleLabel("");
      } finally {
        if (mounted) setRoleLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [initialEvent?.event_id, bearer, fetchRole]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permisos", "Se requieren permisos para acceder a la galería");
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
      Alert.alert("Permisos", "Se requieren permisos para usar la cámara");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const onChangeDate = (_, selectedDate) => {
    if (Platform.OS === "ios") setShowDatePicker(false);
    if (selectedDate) setEventDate(selectedDate);
  };

  const openDateTimePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: eventDate,
        onChange: onChangeDate,
        mode: "datetime",
        is24Hour: true,
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const handleUpdate = async () => {
    if (updatingEvent) return;
    if (isOtherType && !eventType.trim()) {
      Alert.alert("Tipo de evento", 'Escribe el tipo de evento cuando selecciones "Otro".');
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

      let res = await fetch(`${API_URL}/events/${initialEvent.event_id}`, {
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
        coverForm.append("event_cover", { uri: coverUri, name: filename, type: mime });

        let coverRes = await fetch(`${API_URL}/events/${initialEvent.event_id}/cover`, {
          method: "POST",
          headers: { Authorization: `Bearer ${user.token}` },
          body: coverForm,
        });
        if (!coverRes.ok) throw new Error(await coverRes.text());
        const coverData = await coverRes.json();
        updated.event_cover = coverData.event_cover;
      }

      setEventData(updated);
      setEditVisible(false);
    } catch (err) {
      console.error("Error al actualizar evento:", err);
      Alert.alert("Error", "No se pudo actualizar el evento.");
    } finally {
      setUpdatingEvent(false);
    }
  };

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email.trim());

  // ======= OWNER: AGREGAR =======
  const handleAssignOwnerByEmail = async () => {
    if (assigningOwner) return;
    const email = ownerEmail.trim();
    if (!isValidEmail(email)) {
      Alert.alert("Correo inválido", "Ingresa un correo electrónico válido.");
      return;
    }
    if (!eventData?.event_id) {
      Alert.alert("Error", "No se encontró el ID del evento.");
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
          Alert.alert("No encontrado", "No se encontró el usuario. Verifica el correo e inténtalo de nuevo.");
        } else {
          Alert.alert("Aviso", String(detail));
        }
        return;
      }

      Alert.alert("Listo", "Owner asignado");
      setOwnerEmail("");
      setOwnerVisible(false);
    } catch (e) {
      console.error("Error asignando owner:", e);
      Alert.alert("Error", "No se pudo asignar el usuario como owner.");
    } finally {
      setAssigningOwner(false);
    }
  };

  // ======= OWNER: ELIMINAR =======
  // Intenta resolver user_id por email probando algunas rutas comunes del backend
const resolveUserIdByEmail = async (email) => {
  const headers = { Authorization: `Bearer ${user.token}` };

  // 1) Buscar en owners del evento (rápido y preciso)
  try {
    const r = await fetch(
      `${API_URL}/user/owners?event_id=${encodeURIComponent(eventData.event_id)}`,
      { headers }
    );
    if (r.ok) {
      const owners = await r.json(); // espera objetos con { user_id, email, ... }
      const hit = owners?.find?.((o) => String(o?.email).toLowerCase() === email.toLowerCase());
      if (hit?.user_id != null) return Number(hit.user_id);
    }
  } catch (e) {
    console.log("owners lookup failed:", e?.message || e);
  }

  // 2) Fallback: buscar en todos los usuarios (si el payload no es gigante)
  try {
    const r2 = await fetch(`${API_URL}/user/all`, { headers });
    if (r2.ok) {
      const users = await r2.json(); // espera { user_id, email, ... }
      const hit = users?.find?.((u) => String(u?.email).toLowerCase() === email.toLowerCase());
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
      Alert.alert("Correo inválido", "Ingresa un correo electrónico válido.");
      return;
    }
    if (!eventData?.event_id) {
      Alert.alert("Error", "No se encontró el ID del evento.");
      return;
    }

    try {
      setRemovingOwner(true);

      // 1) Resolver user_id por email
      const uid = await resolveUserIdByEmail(email);
      if (!uid) {
        Alert.alert("No encontrado", "No se pudo encontrar el usuario por ese correo.");
        return;
      }

      // 2) DELETE /user/owner?user_id=&event_id=
      const url = `${API_URL}/user/owner?user_id=${encodeURIComponent(uid)}&event_id=${encodeURIComponent(
        eventData.event_id
      )}`;

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
        Alert.alert("Aviso", msg);
        return;
      }

      Alert.alert("Listo", "Owner eliminado exitosamente.");
      setRemoveEmail("");
      setOwnerVisible(false);
    } catch (e) {
      console.error("Error eliminando owner:", e);
      Alert.alert("Error", "No se pudo eliminar el owner.");
    } finally {
      setRemovingOwner(false);
    }
  };

  if (!eventData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Evento no encontrado.</Text>
      </View>
    );
  }

  const prettyDate = new Date(eventData.event_date).toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const prettyTime = new Date(eventData.event_date).toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit",
  });

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
    navigation.navigate("Agenda", { eventId: eventData.event_id, eventDate: eventData.event_date });
  };
  const goPlanning = () => {
    setActiveTab(2);
    setSubmenuOpen(false);
    navigation.navigate("PlanningHome", { eventId: eventData.event_id });
  };
  const goExpenses = () => {
    setActiveTab(2);
    setSubmenuOpen(false);
    navigation.navigate("BudgetControl", { eventId: eventData.event_id });
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
    setOwnerTab("add"); // abre en Agregar
    setOwnerVisible(true);
  };

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>

          <Text numberOfLines={1} style={styles.headerTitle}>{eventData.event_name}</Text>

          {isOwner ? (
            <TouchableOpacity onPress={() => setEditVisible(true)} style={styles.headerIcon}>
              <Ionicons name="pencil" size={22} color="#6F4C8C" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </SafeAreaView>

      {/* CONTENIDO */}
      <ScrollView bounces contentContainerStyle={{ paddingBottom: 150 }}>
        {/* HERO */}
        <View style={styles.heroWrapper}>
          <ImageBackground
            source={eventData.event_cover ? { uri: eventData.event_cover } : null}
            style={styles.hero}
            imageStyle={styles.heroImg}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroChips}>
                {!!eventData.event_type && (
                  <View style={[styles.chip, { backgroundColor: "#6F4C8C" }]}>
                    <Ionicons name="pricetag-outline" size={14} color="white" />
                    <Text style={[styles.chipText, { color: "white" }]}>{eventData.event_type}</Text>
                  </View>
                )}
                {!!eventData.event_status && (
                  <View style={[styles.chip, { backgroundColor: "#254236" }]}>
                    <Ionicons name="ellipse-outline" size={12} color="white" />
                    <Text style={[styles.chipText, { color: "white" }]}>{eventData.event_status}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.heroTitle} numberOfLines={2}>{eventData.event_name}</Text>

              <View style={styles.heroMetaRow}>
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

              {!!eventData.event_address && (
                <View style={[styles.metaItem, { marginTop: 6 }]}>
                  <Ionicons name="location-outline" size={16} color="#F9FAFB" />
                  <Text style={styles.metaText} numberOfLines={1}>{eventData.event_address}</Text>
                </View>
              )}
            </View>
          </ImageBackground>
        </View>

        {/* INFO */}
        <View style={styles.sectionCard}>
          <SectionTitle icon="document-text-outline" title="Descripción" />
          <Text style={styles.sectionText}>{eventData.event_description?.trim() || "Sin descripción"}</Text>
        </View>

        <View style={styles.sectionCard}>
          <SectionTitle icon="person-circle-outline" title="Tu rol en el evento es" />
          <Text style={styles.gridValue}>{roleLoading ? "Cargando…" : roleLabel || "—"}</Text>
        </View>

        {isOwner && !roleLoading && (
          <View style={styles.grid}>
            <View style={styles.gridCard}>
              <SectionTitle icon="alarm-outline" title="Creado" />
              <Text style={styles.gridValue}>
                {new Date(eventData.created_at).toLocaleString("es-ES")}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.sectionCard}>
          <SectionTitle icon="map-outline" title="Dirección" />
          <Text style={styles.sectionText}>{eventData.event_address || "Sin dirección"}</Text>
        </View>
      </ScrollView>

      {/* SUBMENÚ flotante (solo owners) */}
      {isOwner && submenuOpen && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.submenuOverlay,
            { opacity: submenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
          ]}
        >
          <AnimatedTouchableOpacity
            activeOpacity={1}
            onPress={() => animateSubmenuOut(() => setSubmenuOpen(false))}
            style={[
              styles.submenuBackdrop,
              { opacity: submenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }) },
            ]}
          />
          <Animated.View
            style={[
              styles.submenuPanel,
              {
                transform: [
                  { translateY: submenuAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -36] }) },
                  { scale: submenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
                ],
                opacity: submenuAnim,
              },
            ]}
          >
            <MiniAction icon="calendar-outline" label="Agenda" onPress={goAgenda} />
            <MiniAction icon="list-outline" label="Planeación" onPress={goPlanning} />
            <MiniAction icon="cash-outline" label="Gastos" onPress={goExpenses} />
          </Animated.View>
        </Animated.View>
      )}

      {/* TAB BAR según rol */}
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
              <TabItem icon="sparkles-outline" label="Mis eventos" active={activeTab === 0} onPress={goMyEvents} />
              <TabItem icon="clipboard-outline" label="Acciones" active={activeTab === 1 || submenuOpen} onPress={toggleSubmenu} />
              <TabItem icon="people-outline" label="Invitados" active={activeTab === 3} onPress={goGuests} />
              <TabItem icon="images-outline" label="Álbumes" active={activeTab === 4} onPress={goAlbums} />
              <TabItem icon="mail-open-outline" label="Invitaciones" active={activeTab === 5} onPress={goInvitations} />
              <TabItem icon="person-add-outline" label="Owner" active={activeTab === 6} onPress={openOwner} />
            </>
          ) : (
            <>
              <TabItem icon="images-outline" label="Álbumes" active={activeTab === 4} onPress={goAlbums} />
              <TabItem icon="mail-open-outline" label="Invitaciones" active={activeTab === 5} onPress={goInvitations} />
            </>
          )}
        </View>
      </SafeAreaView>

      {/* MODAL EDITAR (solo owners) */}
      {isOwner && (
        <Modal visible={editVisible} animationType="slide">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => !updatingEvent && setEditVisible(false)} disabled={updatingEvent}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Evento</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={[styles.modalContainer, { paddingTop: insets.top }]}>
            <View style={styles.coverPicker}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverPreview} />
              ) : (
                <View style={[styles.coverPreview, styles.coverPlaceholder]}>
                  <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                  <Text style={{ color: "#9CA3AF", marginTop: 6 }}>Seleccionar portada</Text>
                </View>
              )}
              <View style={styles.coverActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={pickImage}>
                  <Ionicons name="images-outline" size={18} color="#ffff" />
                  <Text style={styles.iconBtnText}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={18} color="#ffff" />
                  <Text style={styles.iconBtnText}>Cámara</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Field label="Nombre">
              <TextInput
                style={styles.input}
                value={eventName}
                onChangeText={setEventName}
                placeholder="Ej. Boda de Ana y Luis"
                placeholderTextColor="#6B7280"
              />
            </Field>

            <Field label="Fecha y hora">
              <TouchableOpacity style={styles.input} onPress={openDateTimePicker}>
                <Text>
                  {eventDate.toLocaleString("es-ES", {
                    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>
              {Platform.OS === "ios" && showDatePicker && (
                <DateTimePicker value={eventDate} mode="datetime" display="spinner" onChange={onChangeDate} minimumDate={new Date()} />
              )}
            </Field>

            <Field label="Dirección">
              <TextInput
                style={styles.input}
                value={eventAddress}
                onChangeText={setEventAddress}
                placeholder="Ej. Jardín El Roble, Cuernavaca"
                placeholderTextColor="#6B7280"
              />
            </Field>

            <Field label="Tipo de evento">
              <TouchableOpacity style={styles.input} onPress={() => setTypePickerVisible(true)} activeOpacity={0.9}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: eventType ? "#111827" : "#9CA3AF" }}>
                    {eventType || "Selecciona tipo"}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={18} color="#6B7280" />
                </View>
              </TouchableOpacity>

              {isOtherType && (
                <>
                  <Text style={styles.helperText}>Especifica el tipo de evento</Text>
                  <TextInput
                    style={styles.input}
                    value={EVENT_TYPES.includes(eventType) ? "" : eventType}
                    onChangeText={setEventType}
                    placeholder="Escribe el tipo de evento"
                    autoCapitalize="sentences"
                    placeholderTextColor="#6B7280"
                  />
                </>
              )}
            </Field>

            <Field label="Descripción">
              <TextInput
                style={[styles.input, { height: 110, textAlignVertical: "top" }]}
                multiline
                value={eventDescription}
                onChangeText={setEventDescription}
                placeholder="Detalles y notas del evento"
                placeholderTextColor="#6B7280"
              />
            </Field>

            <TouchableOpacity
              style={[styles.saveButton, updatingEvent && { opacity: 0.6 }]}
              onPress={handleUpdate}
              disabled={updatingEvent}
              accessibilityRole="button"
              accessibilityState={{ disabled: updatingEvent, busy: updatingEvent }}
            >
              {updatingEvent ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Actualizar Evento</Text>}
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
      >
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setTypePickerVisible(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Selecciona el tipo de evento</Text>
            <TouchableOpacity onPress={() => setTypePickerVisible(false)}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          {EVENT_TYPES.map((opt) => {
            const selected = (!isOtherType && eventType === opt) || (opt === "Otro" && isOtherType);
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
                <Text style={[styles.pickerText, selected && styles.pickerTextSelected]}>{opt}</Text>
                {selected && <Ionicons name="checkmark" size={18} color="#6B21A8" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* MODAL OWNER (agregar / eliminar) */}
      {isOwner && (
        <Modal visible={ownerVisible} animationType="slide" onRequestClose={() => setOwnerVisible(false)}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setOwnerVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Gestionar owner</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
            {/* Tabs */}
            <View style={styles.ownerTabs}>
              <TouchableOpacity
                style={[styles.ownerTabBtn, ownerTab === "add" && styles.ownerTabBtnActive]}
                onPress={() => setOwnerTab("add")}
                activeOpacity={0.9}
              >
                <Text style={[styles.ownerTabText, ownerTab === "add" && styles.ownerTabTextActive]}>
                  Agregar owner
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ownerTabBtn, ownerTab === "remove" && styles.ownerTabBtnActive]}
                onPress={() => setOwnerTab("remove")}
                activeOpacity={0.9}
              >
                <Text style={[styles.ownerTabText, ownerTab === "remove" && styles.ownerTabTextActive]}>
                  Eliminar owner
                </Text>
              </TouchableOpacity>
            </View>

            {ownerTab === "add" ? (
              <>
                <Field label="Correo del usuario">
                  <TextInput
                    style={styles.input}
                    placeholder="correo@ejemplo.com"
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
                    { opacity: isValidEmail(ownerEmail) && !assigningOwner ? 1 : 0.6, marginTop: 8 },
                  ]}
                  disabled={!isValidEmail(ownerEmail) || assigningOwner}
                  onPress={handleAssignOwnerByEmail}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isValidEmail(ownerEmail) || assigningOwner, busy: assigningOwner }}
                >
                  {assigningOwner ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveText}>Asignar como owner</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Field label="Correo del owner a eliminar">
                  <TextInput
                    style={styles.input}
                    placeholder="correo@ejemplo.com"
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
                    { opacity: isValidEmail(removeEmail) && !removingOwner ? 1 : 0.6, marginTop: 8 },
                  ]}
                  disabled={!isValidEmail(removeEmail) || removingOwner}
                  onPress={handleRemoveOwnerByEmail}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isValidEmail(removeEmail) || removingOwner, busy: removingOwner }}
                >
                  {removingOwner ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.removeText}>Eliminar owner</Text>
                  )}
                </TouchableOpacity>

                {/* <Text style={styles.helperText}>
                  Se buscará el usuario por correo y, si existe, se eliminará su rol de owner en este evento.
                </Text> */}
              </>
            )}
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
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={20} color={active ? "#6B21A8" : "#6B7280"} />
      <Text style={[styles.tabLabel, active && { color: "#111827", fontWeight: "700" }]} numberOfLines={1}>
        {label}
      </Text>
      {active && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );
}

function MiniAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.miniAction} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.miniIconWrap}>
        <Ionicons name={icon} size={18} color="#254236" />
      </View>
      <Text style={styles.miniLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FA", marginTop: 28 },
  safe: { backgroundColor: "#F5F7FA" },
  header: {
    height: 56, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  headerIcon: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  headerTitle: { flex: 1, marginHorizontal: 8, fontSize: 16, fontWeight: "700", color: "#111827" },

  heroWrapper: { paddingHorizontal: 16, marginTop: 6 },
  hero: { height: 220, borderRadius: 16, overflow: "hidden", backgroundColor: "#E5E7EB" },
  heroImg: { resizeMode: "cover" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(17,24,39,0.35)" },
  heroContent: { flex: 1, padding: 16, justifyContent: "flex-end" },
  heroChips: { flexDirection: "row", gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, gap: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  heroTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  heroMetaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: "#F9FAFB", fontWeight: "600" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#F9FAFB", opacity: 0.85 },

  sectionCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  sectionText: { fontSize: 15, color: "#334155", marginTop: 6, lineHeight: 22 },

  grid: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 12 },
  gridCard: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  gridValue: { fontSize: 15, color: "#374151", marginTop: 6, fontWeight: "600" },

  submenuOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", alignItems: "center" },
  submenuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  submenuPanel: {
    position: "absolute", bottom: 96, alignSelf: "center", flexDirection: "row", gap: 12,
    backgroundColor: "#FFFFFF", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  miniAction: { alignItems: "center", width: 80 },
  miniIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#E6EFEA" },
  miniLabel: { marginTop: 6, fontSize: 12, color: "#111827", fontWeight: "600" },

  tabSafeArea: { backgroundColor: "transparent" },
  tabBar: {
    position: "absolute", left: 16, right: 16, bottom: 16, backgroundColor: "#FFFFFF", borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10, marginBottom: 35,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  tabLabel: { fontSize: 8, marginTop: 4, color: "#6B7280" },
  tabIndicator: { width: 28, height: 3, borderRadius: 999, backgroundColor: "#6B21A8", marginTop: 6 },
  tabSkel: { flex: 1, height: 32, marginHorizontal: 4, borderRadius: 10, backgroundColor: "#EEF2F7" },

  modalHeader: {
    height: 56, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  modalContainer: { padding: 16 },

  coverPicker: { marginBottom: 16 },
  coverPreview: { width: "100%", height: 200, borderRadius: 14, backgroundColor: "#F3F4F6" },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  coverActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  iconBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#976BC4",
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  iconBtnText: { color: "#FFFFFF", fontWeight: "700" },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#6B7280", marginBottom: 6 },
  input: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: "#111827",
  },
  helperText: { marginTop: 6, marginBottom: 6, color: "#6B7280", fontSize: 12 },

  saveButton: {
    marginTop: 18, backgroundColor: "#976BC4", paddingVertical: 14, borderRadius: 12, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  saveText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  // Botón eliminar (rojo)
  removeButton: {
    marginTop: 18, backgroundColor: "#DC2626", paddingVertical: 14, borderRadius: 12, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  removeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#6B7280" },

  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  pickerSheet: {
    position: "absolute", left: 16, right: 16, bottom: 20, backgroundColor: "#FFFFFF", borderRadius: 16,
    paddingVertical: 8, paddingHorizontal: 12, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  pickerHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", marginBottom: 6,
  },
  pickerTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  pickerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  pickerText: { fontSize: 15, color: "#111827" },
  pickerTextSelected: { color: "#6B21A8", fontWeight: "800" },

  // Tabs del modal de Owner
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
});
