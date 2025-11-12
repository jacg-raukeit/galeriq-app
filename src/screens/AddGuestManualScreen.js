import React, { useState, useContext, useEffect } from "react";
// --- MODIFICADO: Se anaden Modal ---
import { View, StyleSheet, Alert, Modal, TouchableOpacity } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
// --- NUEVO: Se anade Ionicons ---
import Ionicons from "react-native-vector-icons/Ionicons";

const API_URL = "http://143.198.138.35:8000";

export default function AddGuestManualScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);
  const { t } = useTranslation("add_guest");

  const eventId = route?.params?.eventId;
  const token = user?.token || user?.accessToken || "";

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [alias, setAlias] = useState("");
  const [nPasses, setNPasses] = useState("0");
  const [saving, setSaving] = useState(false);

  // --- MODIFICADO: Estados para TODOS los modales ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInvalidEmailModal, setShowInvalidEmailModal] = useState(false);
  const [showConfirmSaveModal, setShowConfirmSaveModal] = useState(false);
  // --- FIN MODIFICADO ---

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  // --- NUEVA FUNCION: Logica de guardado extraida ---
  const executeSave = async () => {
    setSaving(true);
    setShowConfirmSaveModal(false); // Oculta el modal de confirmacion

    const nPassesNumber = parseInt(nPasses, 10);

    try {
      const payload = {
        event_id: Number(eventId),
        full_name: nombre,
        email: correo,
        n_passes: nPassesNumber,
      };

      if (telefono) payload.phone = telefono;
      if (alias) payload.alias = alias;

      const resp = await fetch(`${API_URL}/guests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(
          `Error ${resp.status}: ${
            body || "No se pudo crear el invitado"
          }`
        );
      }

      await resp.json();
      setShowSuccessModal(true); // Muestra el modal de exito
    } catch (error) {
      console.error("Error al guardar invitado:", error);
      const msg = String(error?.message || "")
        .toLowerCase()
        .includes("422")
        ? t("alerts.error_422")
        : t("alerts.error_generic");
      Alert.alert(t("alerts.error_title"), msg);
    } finally {
      setSaving(false);
    }
  };
  // --- FIN NUEVA FUNCION ---

  // --- MODIFICADO: handleGuardar ahora solo valida y pide confirmacion ---
  const handleGuardar = async () => {
    if (!eventId) {
      Alert.alert(
        t("alerts.missing_info_title"),
        t("alerts.missing_info_desc")
      );
      return;
    }
    if (!nombre || !correo) {
      Alert.alert(
        t("alerts.missing_data_title"),
        t("alerts.missing_data_desc")
      );
      return;
    }

    // 1. Reemplazo de Alert de Email Invalido
    if (!validateEmail(correo)) {
      setShowInvalidEmailModal(true);
      return;
    }

    const nPassesNumber = parseInt(nPasses, 10);
    if (isNaN(nPassesNumber) || nPassesNumber < 1) {
      Alert.alert(
        t("alerts.invalid_passes_title"),
        t("alerts.invalid_passes_desc")
      );
      return;
    }

    // 2. Reemplazo de Alert de Confirmar Guardar
    setShowConfirmSaveModal(true);
  };
  // --- FIN MODIFICADO ---

  const handleCancelar = () => {
    if (nombre || correo || telefono || alias || (nPasses && nPasses !== "1")) {
      // Muestra modal de confirmacion para cancelar
      setShowCancelModal(true);
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
  let timer;
  if (showSuccessModal) {
    timer = setTimeout(() => {
      setShowSuccessModal(false);
      navigation.goBack();
    }, 1000);
  }
  
  return () => {
    if (timer) clearTimeout(timer);
  };
}, [showSuccessModal, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("title")}</Text>

      <TextInput
        label={t("fields.name")}
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
        disabled={saving}
      />
      <TextInput
        label={t("fields.email")}
        value={correo}
        onChangeText={setCorreo}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        disabled={saving}
      />
      <TextInput
  label={t("fields.phone_opt")}
  value={telefono}
  onChangeText={(text) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 12);
    setTelefono(cleaned);
  }}
  keyboardType="phone-pad"
  style={styles.input}
  disabled={saving}
  maxLength={12}
/>

      <TextInput
        label={t("fields.alias_opt")}
        value={alias}
        onChangeText={setAlias}
        style={styles.input}
        disabled={saving}
      />

      {/* Numero de pases */}
      <TextInput
        label={t("fields.passes")}
        value={nPasses}
        onChangeText={(t) => {
          const cleaned = t.replace(/[^0-9]/g, "").slice(0, 2);
          setNPasses(cleaned);
        }}
        keyboardType="number-pad"
        style={styles.input}
        disabled={saving}
        right={<TextInput.Affix text={t("fields.passes_suffix")} />}
      />

      <View style={{ flexDirection: "row", marginTop: 16 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Button
            mode="contained"
            onPress={handleGuardar}
            loading={saving}
            disabled={saving}
          >
            {t("buttons.save")}
          </Button>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Button
            mode="outlined"
            onPress={handleCancelar}
            textColor="red"
            style={{ borderColor: "red" }}
            disabled={saving}
          >
            {t("buttons.cancel")}
          </Button>
        </View>
      </View>

      {/* --- INICIO MODALES --- */}

      {/* Modal de Exito (CORREGIDO con navigation.goBack) */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.goBack(); // <-- CORREGIDO
        }}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalView}>
            <Ionicons
              name="checkmark-circle-outline"
              size={50}
              color="#10B981"
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>{t("alerts.success_title")}</Text>
            <Text style={styles.modalText}>{t("alerts.success_desc")}</Text>
            <Button
              mode="contained"
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack(); // <-- CORREGIDO
              }}
              style={styles.modalButton}
            >
              {t("buttons.ok")}
            </Button>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmar Cancelar */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalView}>
            <Ionicons
              name="alert-circle-outline"
              size={50}
              color="#F59E0B"
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>{t("alerts.cancel_title")}</Text>
            <Text style={styles.modalText}>{t("alerts.cancel_desc")}</Text>
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowCancelModal(false)}
                style={styles.modalButton}
              >
                {t("alerts.no")}
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  setShowCancelModal(false);
                  navigation.goBack();
                }}
                style={styles.modalButton}
                buttonColor="#DC2626"
              >
                {t("buttons.yes_exit")}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- INICIO NUEVOS MODALES --- */}

     {/* Modal de Email Invalido con X */}
<Modal
  visible={showInvalidEmailModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowInvalidEmailModal(false)}
>
  <View style={styles.backdrop}>
    <View style={styles.modalView}>
      {/* Botón X en la esquina superior derecha */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setShowInvalidEmailModal(false)}
      >
        <Ionicons name="close" size={24} color="#6B7280" />
      </TouchableOpacity>
      
      <Ionicons
        name="close-circle-outline"
        size={50}
        color="#EF4444"
        style={styles.modalIcon}
      />
      <Text style={styles.modalTitle}>{t("alerts.invalid_email_title")}</Text>
      <Text style={styles.modalText}>{t("alerts.invalid_email_desc")}</Text>
      <Button
        mode="contained"
        onPress={() => setShowInvalidEmailModal(false)}
        style={styles.modalButton}
      >
        {t("buttons.ok")}
      </Button>
    </View>
  </View>
</Modal>


      {/* Modal de Confirmar Guardar */}
      <Modal
        visible={showConfirmSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmSaveModal(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalView}>
            <Ionicons
              name="help-circle-outline"
              size={50}
              color="#3B82F6"
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>{t("alerts.confirm_save_title")}</Text>
            <Text style={styles.modalText}>
              {t("alerts.confirm_save_msg", { count: parseInt(nPasses, 10) || 0 })}
            </Text>
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowConfirmSaveModal(false)}
                style={styles.modalButton}
                disabled={saving}
              >
                {t("buttons.cancel")}
              </Button>
              <Button
                mode="contained"
                onPress={executeSave}
                style={styles.modalButton}
                loading={saving}
                disabled={saving}
              >
                {t("buttons.save")}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- FIN NUEVOS MODALES --- */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: "#fff" },
  title: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: "bold",
    marginTop: 10,
    color: "#111827",
  },
  input: { marginBottom: 12 },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalView: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 20,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },

   closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 4,
  },
});