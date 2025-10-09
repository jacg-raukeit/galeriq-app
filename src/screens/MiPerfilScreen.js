// src/screens/MiPerfilScreen.js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

const API_BASE = "http://143.198.138.35:8000";
const ME_URL = `${API_BASE}/me`;
const UPDATE_USER_URL = (id) => `${API_BASE}/me/${id}`;
const UPLOAD_PROFILE_PIC_URL = (id) => `${API_BASE}/users/${id}/profile-pic`;
const DELETE_PROFILE_PIC_URL = (id) => `${API_BASE}/users/${id}/profile-pic`;
const CHANGE_PASSWORD_URL = `${API_BASE}/password/change`;

const FALLBACK_AVATAR = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

function FieldReadOnly({ icon, label, value }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIconWrap}>
        <Ionicons name={icon} size={18} color="#7c7c8a" />
      </View>
      <View style={styles.fieldBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.readonlyBox}>
          <Text style={styles.fieldValue} numberOfLines={1}>
            {value || "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function FieldEditable({
  icon,
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
  error,
  maxLength,
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIconWrap}>
        <Ionicons name={icon} size={18} color="#6B21A8" />
      </View>
      <View style={styles.fieldBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View
          style={[
            styles.inputBox,
            error && { borderColor: "#fecaca", backgroundColor: "#fff1f2" },
          ]}
        >
          <TextInput
            style={styles.inputText}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            autoCapitalize={label === "Nombre" ? "words" : "none"}
            autoCorrect={label === "Nombre"}
            maxLength={maxLength}
          />
        </View>
        {!!error && <Text style={styles.errorInline}>{error}</Text>}
      </View>
    </View>
  );
}

function Skeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={{ paddingHorizontal: 18 }}>
      <View style={styles.avatarSkeleton} />
      <Animated.View style={[styles.skelLine, { width: "70%", opacity }]} />
      <Animated.View style={[styles.skelLine, { width: "50%", opacity }]} />
      {[...Array(5)].map((_, i) => (
        <Animated.View key={i} style={[styles.skelInput, { opacity }]} />
      ))}
    </View>
  );
}

export default function MiPerfilScreen() {
  const { t, i18n } = useTranslation("profile");
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [avatarUri, setAvatarUri] = useState(FALLBACK_AVATAR);

  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ full_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const [errEmail, setErrEmail] = useState("");
  const [errPhone, setErrPhone] = useState("");

  const headerFade = useRef(new Animated.Value(0)).current;
  const saveBarY = useRef(new Animated.Value(50)).current;
  const saveBarOpacity = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(-60)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const sheetBackdrop = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const [pwOpen, setPwOpen] = useState(false);
  const pwAnim = useRef(new Animated.Value(0)).current;
  const pwBackdrop = pwAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const pwTranslate = pwAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [oldVisible, setOldVisible] = useState(false);
  const [newVisible, setNewVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [errOldPw, setErrOldPw] = useState("");
  const [errNewPw, setErrNewPw] = useState("");
  const [errConfirmPw, setErrConfirmPw] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);

  const bearer = useMemo(() => user?.token || user?.access_token || "", [user]);

  const fetchMe = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(ME_URL, {
        headers: {
          "Content-Type": "application/json",
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} - ${txt}`);
      }
      const data = await res.json();
      setMe(data);
      setEdit({
        full_name: data?.full_name || data?.name || "",
        email: data?.email || "",
        phone: data?.phone || data?.phone_number || "",
      });
      if (
        data?.profile_image &&
        typeof data.profile_image === "string" &&
        data.profile_image.length > 0
      ) {
        setAvatarUri(data.profile_image);
      } else {
        setAvatarUri(FALLBACK_AVATAR);
      }
    } catch (e) {
      setError(e?.message || "Error al cargar perfil");
      setAvatarUri(FALLBACK_AVATAR);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }
  }, [bearer, headerFade]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    navigation?.setOptions?.({ title: t("header.title") });
  }, [i18n.language]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMe();
  }, [fetchMe]);

  const showSaveBar = () => {
    Animated.parallel([
      Animated.timing(saveBarY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(saveBarOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };
  const hideSaveBar = () => {
    Animated.parallel([
      Animated.timing(saveBarY, {
        toValue: 50,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(saveBarOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openSheet = () => {
    setSheetOpen(true);
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };
  const closeSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSheetOpen(false));
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    Animated.parallel([
      Animated.timing(toastY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastY, {
            toValue: -60,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();
      }, 1600);
    });
  };
  const [toast, setToast] = useState({ msg: "", type: "success" });

  const isDirty =
    !!me &&
    (edit.full_name !== (me.full_name || me.name || "") ||
      edit.email !== (me.email || "") ||
      edit.phone !== (me.phone || me.phone_number || ""));

  useEffect(() => {
    if (editing && isDirty) showSaveBar();
    else hideSaveBar();
  }, [editing, isDirty]);

  const validate = () => {
    let ok = true;
    setErrEmail("");
    setErrPhone("");

    if (!edit.full_name || edit.full_name.trim().length === 0) {
      Alert.alert(
        t("common.error"),
        t("errors.name_required") || "El nombre es obligatorio"
      );
      ok = false;
    }

    if (!edit.email || edit.email.trim().length === 0) {
      setErrEmail(t("errors.email_required") || "El correo es obligatorio");
      ok = false;
    } else if (!/^\S+@\S+\.\S+$/.test(edit.email.trim())) {
      setErrEmail(t("errors.email_invalid"));
      ok = false;
    }

    if (!edit.phone || edit.phone.trim().length === 0) {
      setErrPhone(t("errors.phone_required") || "El teléfono es obligatorio");
      ok = false;
    } else if (!/^\+?[\d\s\-]{7,14}$/.test(edit.phone.replace(/\s/g, ""))) {
      setErrPhone(t("errors.phone_invalid"));
      ok = false;
    }

    return ok;
  };

  const saveProfile = async () => {
    if (!me?.user_id) return;
    if (!validate()) return;
    try {
      setSaving(true);
      const qs = new URLSearchParams({
        full_name: edit.full_name || "",
        email: edit.email || "",
        phone: edit.phone || "",
      }).toString();
      const url = `${UPDATE_USER_URL(me.user_id)}?${qs}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${t("errors.save_failed")} (${res.status}): ${txt}`);
      }
      const updated = await res.json();
      setMe(updated);
      setEditing(false);
      showToast(t("toasts.profile_saved"));
    } catch (e) {
      Alert.alert(t("common.error"), e.message || t("errors.save_failed"));
      showToast(t("toasts.save_error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async (fromCamera = false) => {
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          return Alert.alert(
            t("errors.pick_perm_camera"),
            t("errors.pick_perm_camera_msg")
          );
        }
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          return Alert.alert(
            t("errors.pick_perm_camera"),
            t("errors.pick_perm_photos_msg")
          );
        }
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });

      if (result.canceled) {
        closeSheet();
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        closeSheet();
        return;
      }

      closeSheet();
      await uploadPhoto(asset.uri);
    } catch (e) {
      Alert.alert(t("common.error"), t("errors.pick_failed"));
    }
  };

  const uploadPhoto = async (uri) => {
    if (!me?.user_id) return;
    try {
      setSaving(true);
      const form = new FormData();
      const filename = uri.split("/").pop() || `profile_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || "jpg";
      const type = ext === "png" ? "image/png" : "image/jpeg";

      form.append("profile_image", {
        uri,
        name: filename,
        type,
      });

      const res = await fetch(UPLOAD_PROFILE_PIC_URL(me.user_id), {
        method: "POST",
        headers: {
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${t("errors.upload_failed")} (${res.status}): ${txt}`);
      }
      const updated = await res.json();
      setMe(updated);
      if (updated?.profile_image) setAvatarUri(updated.profile_image);
      showToast(t("toasts.photo_uploaded"));
    } catch (e) {
      Alert.alert(t("common.error"), e.message || t("errors.upload_failed"));
      showToast(t("toasts.upload_error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    if (!me?.user_id) return;
    try {
      closeSheet();
      setSaving(true);
      const res = await fetch(DELETE_PROFILE_PIC_URL(me.user_id), {
        method: "DELETE",
        headers: {
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${t("errors.delete_failed")} (${res.status}): ${txt}`);
      }
      const updated = await res.json();
      setMe(updated);
      setAvatarUri(FALLBACK_AVATAR);
      showToast(t("toasts.photo_deleted"));
    } catch (e) {
      Alert.alert(t("common.error"), e.message || t("errors.delete_failed"));
      showToast(t("toasts.delete_error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (!me) return;
    setEdit({
      full_name: me?.full_name || me?.name || "",
      email: me?.email || "",
      phone: me?.phone || me?.phone_number || "",
    });
    setErrEmail("");
    setErrPhone("");
    setEditing(false);
  };

  const openPw = () => {
    setPwOpen(true);
    Animated.timing(pwAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };
  const closePw = () => {
    Animated.timing(pwAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setPwOpen(false);
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
      setErrOldPw("");
      setErrNewPw("");
      setErrConfirmPw("");
      setOldVisible(false);
      setNewVisible(false);
      setConfirmVisible(false);
    });
  };

  const validatePw = () => {
    let ok = true;
    setErrOldPw("");
    setErrNewPw("");
    setErrConfirmPw("");
    if (!oldPw || oldPw.length < 1) {
      setErrOldPw(t("errors.pw_current_required"));
      ok = false;
    }
    if (!newPw || newPw.length < 8) {
      setErrNewPw(t("errors.pw_new_min"));
      ok = false;
    } else if (!/[A-Za-z]/.test(newPw) || !/\d/.test(newPw)) {
      setErrNewPw(t("errors.pw_new_rules"));
      ok = false;
    } else if (newPw === oldPw) {
      setErrNewPw(t("errors.pw_same"));
      ok = false;
    }
    if (confirmPw !== newPw) {
      setErrConfirmPw(t("errors.pw_mismatch"));
      ok = false;
    }
    return ok;
  };

  const changePassword = async () => {
    if (!validatePw()) return;
    try {
      setPwLoading(true);
      const form = new FormData();
      form.append("old_password", oldPw);
      form.append("new_password", newPw);

      const res = await fetch(CHANGE_PASSWORD_URL, {
        method: "POST",
        headers: {
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: form,
      });

      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text || "{}");
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg =
          data?.detail || data?.message || text || t("errors.pw_change_failed");
        throw new Error(msg);
      }

      showToast(t("toasts.pw_changed"));
      closePw();
    } catch (e) {
      Alert.alert(
        t("errors.pw_change_failed"),
        e.message || t("errors.pw_change_failed")
      );
      +showToast(t("toasts.pw_change_error"), "error");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={["#ffffff", "#fafafb", "#f6f7fb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      />
      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            transform: [{ translateY: toastY }],
            opacity: toastOpacity,
            backgroundColor: toast.type === "error" ? "#fee2e2" : "#dcfce7",
            borderColor: toast.type === "error" ? "#fecaca" : "#bbf7d0",
          },
        ]}
      >
        <Ionicons
          name={toast.type === "error" ? "alert-circle" : "checkmark-circle"}
          size={18}
          color={toast.type === "error" ? "#b91c1c" : "#16a34a"}
        />
        <Text
          style={[
            styles.toastTxt,
            { color: toast.type === "error" ? "#7f1d1d" : "#166534" },
          ]}
        >
          {toast.msg}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("header.title")}</Text>
        {!loading && !error && (
          <TouchableOpacity
            onPress={() => setEditing((v) => !v)}
            activeOpacity={0.9}
            style={styles.editBtn}
          >
            <Ionicons
              name={editing ? "close-outline" : "create-outline"}
              size={20}
              color="#6B21A8"
            />
            <Text style={styles.editTxt}>
              {editing ? t("header.cancel") : t("header.edit")}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <Skeleton />
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={22} color="#dc2626" />
            <Text style={styles.errorText}>
              {t("errors.load_profile_title")}
            </Text>
            <Text style={styles.errorSub}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMe}>
              <Text style={styles.retryTxt}>{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Avatar + nombre */}
            <View style={styles.topCard}>
              <View style={styles.avatarWrap}>
                <TouchableOpacity
                  style={styles.avatarClip}
                  onPress={() => setPreviewVisible(true)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatar}
                    resizeMode="cover"
                    onError={() => setAvatarUri(FALLBACK_AVATAR)}
                  />
                </TouchableOpacity>
                {editing && (
                  <TouchableOpacity
                    style={styles.badgeCam}
                    onPress={openSheet}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="camera" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.nameTxt} numberOfLines={1}>
                {me?.full_name || me?.name || t("common.user")}
              </Text>
            </View>

            {/* Campos */}
            <View style={styles.card}>
              {editing ? (
                <>
                  <FieldEditable
                    icon="person"
                    label={t("fields.name")}
                    value={edit.full_name}
                    onChangeText={(t) => {
                      if (t.length <= 50) {
                        setEdit((s) => ({ ...s, full_name: t }));
                      }
                    }}
                    placeholder={t("fields.name_placeholder")}
                    maxLength={50}
                  />
                  {/* <FieldEditable
                    icon="mail"
                    label={t("fields.email")}
                    value={edit.email}
                    onChangeText={(t) =>
                      setEdit((s) => ({ ...s, email: t.trim() }))
                    }
                    placeholder={t("fields.email_placeholder")}
                    keyboardType="email-address"
                    error={errEmail}
                  /> */}
                  <FieldEditable
                    icon="call"
                    label={t("fields.phone")}
                    value={edit.phone}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^\d\s+\-]/g, "");
                      if (cleaned.length <= 14) {
                        setEdit((s) => ({ ...s, phone: cleaned }));
                      }
                    }}
                    placeholder={t("fields.phone_placeholder")}
                    keyboardType="phone-pad"
                    error={errPhone}
                    maxLength={14}
                  />
                </>
              ) : (
                <>
                  <FieldReadOnly
                    icon="mail"
                    label={t("fields.email")}
                    value={me?.email}
                  />
                  <FieldReadOnly
                    icon="call"
                    label={t("fields.phone")}
                    value={me?.phone ?? me?.phone_number}
                  />
                </>
              )}
            </View>

            {/* Acción: Cambiar contraseña */}
            {!editing && (
              <View style={[styles.card, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={openPw}
                  activeOpacity={0.9}
                >
                  <View
                    style={[
                      styles.fieldIconWrap,
                      { backgroundColor: "#f5f3ff" },
                    ]}
                  >
                    <Ionicons name="key-outline" size={18} color="#6B21A8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>
                      {t("password.change_title")}
                    </Text>
                    <Text style={styles.actionSub}>
                      {t("password.subtitle")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}

            {!editing && (
              <View style={styles.noteBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#2563eb"
                />
                <Text style={styles.noteText}>{t("fields.readonly_hint")}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Barra de guardado */}
      {editing && (
        <Animated.View
          style={[
            styles.saveBar,
            { transform: [{ translateY: saveBarY }], opacity: saveBarOpacity },
          ]}
        >
          <TouchableOpacity
            style={[styles.saveBtn, styles.cancelSave]}
            onPress={cancelEdit}
            disabled={saving}
            activeOpacity={0.9}
          >
            <Text style={styles.cancelTxt}>{t("common.discard")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              styles.primarySave,
              saving && { opacity: 0.7 },
            ]}
            onPress={saveProfile}
            disabled={saving}
            activeOpacity={0.95}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.primaryTxt}>{t("common.save")}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Sheet acciones foto */}
      {sheetOpen && (
        <Modal
          transparent
          animationType="none"
          visible={sheetOpen}
          onRequestClose={closeSheet}
        >
          <Animated.View
            style={[styles.sheetBackdrop, { opacity: sheetBackdrop }]}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closeSheet}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheetTranslate }] },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t("photo.title")}</Text>
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => pickImage(false)}
              activeOpacity={0.9}
            >
              <Ionicons name="images-outline" size={22} color="#6B21A8" />
              <Text style={styles.sheetRowTxt}>{t("photo.pick_gallery")}</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => pickImage(true)}
              activeOpacity={0.9}
            >
              <Ionicons name="camera-outline" size={22} color="#6B21A8" />
              <Text style={styles.sheetRowTxt}>{t("photo.take_photo")}</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </TouchableOpacity>
            {me?.profile_image && (
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={removePhoto}
                activeOpacity={0.9}
              >
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
                <Text style={[styles.sheetRowTxt, { color: "#dc2626" }]}>
                  {t("photo.delete_photo")}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.sheetClose}
              onPress={closeSheet}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetCloseTxt}>{t("common.close")}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      )}

      {/* Modal Cambiar contraseña */}
      {pwOpen && (
        <Modal
          transparent
          animationType="none"
          visible={pwOpen}
          onRequestClose={closePw}
        >
          <Animated.View
            style={[styles.sheetBackdrop, { opacity: pwBackdrop }]}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closePw}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.pwSheet,
              { transform: [{ translateY: pwTranslate }] },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t("password.change_title")}</Text>

            {/* Old password */}
            <View style={styles.pwField}>
              <Text style={styles.fieldLabel}>{t("password.current")}</Text>
              <View style={[styles.inputBox, errOldPw && styles.inputError]}>
                <TextInput
                  style={[styles.inputText, { flex: 1 }]}
                  placeholder={t("password.current_placeholder")}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!oldVisible}
                  value={oldPw}
                  onChangeText={(t) => setOldPw(t)}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setOldVisible((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={oldVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {!!errOldPw && <Text style={styles.errorInline}>{errOldPw}</Text>}
            </View>

            {/* New password */}
            <View style={styles.pwField}>
              <Text style={styles.fieldLabel}>{t("password.new")}</Text>
              <View style={[styles.inputBox, errNewPw && styles.inputError]}>
                <TextInput
                  style={[styles.inputText, { flex: 1 }]}
                  placeholder={t("password.new_placeholder")}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!newVisible}
                  value={newPw}
                  onChangeText={(t) => setNewPw(t)}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setNewVisible((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={newVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {!!errNewPw && <Text style={styles.errorInline}>{errNewPw}</Text>}
            </View>

            {/* Confirm */}
            <View style={styles.pwField}>
              <Text style={styles.fieldLabel}>{t("password.confirm")}</Text>
              <View
                style={[styles.inputBox, errConfirmPw && styles.inputError]}
              >
                <TextInput
                  style={[styles.inputText, { flex: 1 }]}
                  placeholder={t("password.confirm_placeholder")}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!confirmVisible}
                  value={confirmPw}
                  onChangeText={(t) => setConfirmPw(t)}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setConfirmVisible((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={confirmVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {!!errConfirmPw && (
                <Text style={styles.errorInline}>{errConfirmPw}</Text>
              )}
            </View>

            {/* Botones */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.saveBtn, styles.cancelSave]}
                onPress={closePw}
                disabled={pwLoading}
              >
                <Text style={styles.cancelTxt}>{t("header.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  styles.primarySave,
                  pwLoading && { opacity: 0.7 },
                ]}
                onPress={changePassword}
                disabled={pwLoading}
                activeOpacity={0.95}
              >
                {pwLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="key-outline" size={18} color="#fff" />
                    <Text style={styles.primaryTxt}>{t("common.update")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>
      )}
     {/* Modal Preview Imagen */}
      {previewVisible && (
        <Modal
          transparent
          visible={previewVisible}
          onRequestClose={() => setPreviewVisible(false)}
          animationType="fade"
        >
          <View style={styles.previewBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setPreviewVisible(false)}
            />
            <View style={styles.previewContainer}>
              <TouchableOpacity
                style={styles.previewCloseBtn}
                onPress={() => setPreviewVisible(false)}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Image
                source={{ uri: avatarUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  bg: { ...StyleSheet.absoluteFillObject },

  toast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 50,
    left: 16,
    right: 16,
    zIndex: 20,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  toastTxt: { fontWeight: "700", fontSize: 13 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 38 : 0,
    paddingBottom: 8,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#f5f3ff",
  },
  editTxt: { color: "#6B21A8", fontWeight: "800", fontSize: 12.5 },

  topCard: { alignItems: "center", paddingVertical: 18, paddingHorizontal: 18 },
  avatarWrap: {
    position: "relative",
    width: 116,
    height: 116,
    borderRadius: 58,
    overflow: "visible",
    borderWidth: 3,
    borderColor: "#7DD3FC",
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  avatarClip: {
    width: "100%",
    height: "100%",
    borderRadius: 58,
    overflow: "hidden",
    backgroundColor: "#eef2ff",
  },
  avatar: { width: "100%", height: "100%" },
  badgeCam: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 23,
    backgroundColor: "#6B21A8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 10,
    elevation: 6,
  },
  nameTxt: { marginTop: 10, fontSize: 20, fontWeight: "700", color: "#0f172a" },

  card: {
    marginHorizontal: 18,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#eef0f4",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  fieldIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  fieldBody: { flex: 1 },
  fieldLabel: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  readonlyBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eef0f4",
    backgroundColor: "#f9fafb",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  fieldValue: { fontSize: 14, color: "#111827" },

  inputBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
  },

  inputText: {
    fontSize: 15,
    color: "#111827",
    flex: 1,
    minHeight: Platform.OS === "ios" ? 20 : undefined,
  },

  inputError: { borderColor: "#fecaca", backgroundColor: "#fff1f2" },
  errorInline: { marginTop: 6, color: "#b91c1c", fontSize: 12 },

  noteBox: {
    marginTop: 16,
    marginHorizontal: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noteText: { flex: 1, color: "#1e40af", fontSize: 13 },

  errorBox: {
    marginTop: 40,
    marginHorizontal: 18,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff1f2",
    alignItems: "center",
    gap: 6,
  },
  errorText: { fontWeight: "700", color: "#991b1b" },
  errorSub: { fontSize: 12, color: "#7f1d1d", textAlign: "center" },
  retryBtn: {
    marginTop: 10,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryTxt: { color: "#fff", fontWeight: "600" },

  avatarSkeleton: {
    width: 116,
    height: 116,
    borderRadius: 60,
    backgroundColor: "#f1f5f9",
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  skelLine: {
    height: 14,
    borderRadius: 8,
    backgroundColor: "#eef2f7",
    marginTop: 8,
    alignSelf: "center",
  },
  skelInput: {
    height: 54,
    borderRadius: 12,
    backgroundColor: "#eef2f7",
    marginTop: 14,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  actionTitle: { fontWeight: "700", color: "#111827" },
  actionSub: { fontSize: 12, color: "#6b7280" },

  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 50,
    padding: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelSave: { backgroundColor: "#f3f4f6" },
  primarySave: { backgroundColor: "#6B21A8" },
  cancelTxt: { color: "#111827", fontWeight: "700" },
  primaryTxt: { color: "#fff", fontWeight: "800" },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingBottom: 18,
    paddingHorizontal: 16,
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
  },
  pwSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingBottom: 18,
    paddingHorizontal: 16,
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetRowTxt: { flex: 1, color: "#111827", fontWeight: "600" },
  sheetClose: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "#efeff4",
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseTxt: { color: "#111827", fontWeight: "700" },

  pwField: { marginBottom: 12 },

previewBackdrop: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.95)",
  justifyContent: "center",
  alignItems: "center",
},
previewContainer: {
  width: "100%",
  height: "100%",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
},
previewCloseBtn: {
  position: "absolute",
  top: Platform.OS === "ios" ? 60 : 40,
  right: 20,
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
},
previewImage: {
  width: "100%",
  height: "80%",
  borderRadius: 12,
},


});
