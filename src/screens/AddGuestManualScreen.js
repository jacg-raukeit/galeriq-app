// src/screens/AddGuestManualScreen.js
import React, { useState, useContext } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

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

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

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
    if (!validateEmail(correo)) {
      Alert.alert(
        t("alerts.invalid_email_title"),
        t("alerts.invalid_email_desc")
      );
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

    Alert.alert(
      t("alerts.confirm_save_title"),
      t("alerts.confirm_save_msg", { count: nPassesNumber }),
      [
        { text: t("buttons.cancel"), style: "cancel" },
        {
          text: t("buttons.save"),
          style: "default",
          onPress: async () => {
            try {
              setSaving(true);

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
              Alert.alert(t("alerts.success_title"), t("alerts.success_desc"), [
                { text: t("buttons.ok"), onPress: () => navigation.goBack() },
              ]);
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
          },
        },
      ]
    );
  };

  const handleCancelar = () => {
    if (nombre || correo || telefono || alias || (nPasses && nPasses !== "1")) {
      Alert.alert(t("alerts.cancel_title"), t("alerts.cancel_desc"), [
        { text: t("alerts.no"), style: "cancel" },
        {
          text: t("buttons.yes_exit"),
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]);
    } else {
      navigation.goBack();
    }
  };

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
        onChangeText={setTelefono}
        keyboardType="phone-pad"
        style={styles.input}
        disabled={saving}
      />
      <TextInput
        label={t("fields.alias_opt")}
        value={alias}
        onChangeText={setAlias}
        style={styles.input}
        disabled={saving}
      />

      {/* Número de pases */}
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
});
