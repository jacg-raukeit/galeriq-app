// src/screens/AgendaScreen.js
import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";

export default function AgendaScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { eventId, eventDate } = route.params;

  const [viewMode, setViewMode] = useState("Día");
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const colors = ["#FFECDC", "#EDDCF4", "#BA8FD8", "#FAB08C"];

  const formatTime = (t) => (t ? t.slice(0, 5) : "");

  const toLocalYMD = (input) => {
    const d =
      typeof input === "string"
        ? new Date(input.length <= 10 ? `${input}T00:00:00` : input)
        : new Date(input);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayYMD = toLocalYMD(new Date());

  const getCurrentWeekBounds = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  };

  const isInCurrentWeek = (dateStr) => {
    try {
      const { monday, sunday } = getCurrentWeekBounds();
      const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
      return d >= monday && d <= sunday;
    } catch {
      return false;
    }
  };

  const fetchStages = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `http://143.198.138.35:8000/stages/event/${eventId}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();

      data.sort((a, b) => {
        const timeA = new Date(`1970-01-01T${a.start_time}`);
        const timeB = new Date(`1970-01-01T${b.start_time}`);
        return timeA - timeB;
      });

      const stagesWithColor = data.map((stage) => ({
        ...stage,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));

      setStages(stagesWithColor);
    } catch {
      Alert.alert("Error", "No se pudieron cargar las actividades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const filteredStages = useMemo(() => {
    if (!stages?.length) return [];
    if (viewMode === "Lista") return stages;
    if (viewMode === "Día") {
      return stages.filter((s) => {
        const ymd = s?.date ? toLocalYMD(s.date) : null;
        return ymd === todayYMD;
      });
    }
    if (viewMode === "Semana") {
      return stages.filter((s) => {
        const ymd = s?.date ? s.date.split("T")[0] : null;
        return ymd ? isInCurrentWeek(ymd) : false;
      });
    }
    return stages;
  }, [stages, viewMode]);

  const openDetail = (stage) => {
    setSelectedStage(stage);
    setDetailModalVisible(true);
  };

  const startEditing = () => {
    setIsEditing(true);
    setModalVisible(true);
    setDetailModalVisible(false);
    const s = selectedStage;
    setTitle(s.title);
    setDate(s.date.split("T")[0]);
    setStartTime(s.start_time);
    setEndTime(s.end_time);
    setDescription(s.description || "");
    setLocation(s.location || "");
  };

  const handleSubmit = async () => {
    if (!title || !date || !startTime || !endTime) {
      return Alert.alert("Error", "Completa los campos obligatorios.");
    }
    try {
      const body = {
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        description,
        location,
      };
      const url = isEditing
        ? `http://143.198.138.35:8000/stages/${selectedStage.id}`
        : `http://143.198.138.35:8000/stages/${eventId}`;
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setModalVisible(false);
      setDetailModalVisible(false);
      setIsEditing(false);
      setSelectedStage(null);
      setTitle("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setDescription("");
      setLocation("");
      await fetchStages();
    } catch {
      Alert.alert(
        "Error",
        isEditing
          ? "No se pudo actualizar la actividad."
          : "No se pudo crear la actividad."
      );
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(
        `http://143.198.138.35:8000/stages/${selectedStage.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (!res.ok) throw new Error();
      setDetailModalVisible(false);
      await fetchStages();
    } catch {
      Alert.alert("Error", "No se pudo eliminar la actividad.");
    }
  };

  const formattedDate = new Date(eventDate).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const emptyMsg =
    viewMode === "Día"
      ? "No hay actividades para hoy."
      : viewMode === "Semana"
      ? "No hay actividades para esta semana."
      : "No hay actividades para mostrar.";

const isFormValid = title && date && startTime && endTime;


  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#254236" />
        </TouchableOpacity>
        <Text style={styles.title}>Galeriq</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.titleSection}>Agenda</Text>
      <Text style={styles.dateText}>{formattedDate}</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {["Día", "Semana", "Lista"].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.tab, viewMode === m && styles.tabActive]}
            onPress={() => setViewMode(m)}
          >
            <Text
              style={[styles.tabText, viewMode === m && styles.tabTextActive]}
            >
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timeline */}
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#6F4C8C"
            style={{ marginTop: 20 }}
          />
        ) : filteredStages.length === 0 ? (
          <Text style={styles.emptyText}>{emptyMsg}</Text>
        ) : (
          filteredStages.map((stage, i) => (
            <TouchableOpacity
              key={stage.id || i}
              style={styles.row}
              onPress={() => openDetail(stage)}
            >
              <Text style={styles.time}>{formatTime(stage.start_time)}</Text>
              <View style={[styles.card, { backgroundColor: stage.color }]}>
                <Ionicons name="calendar-outline" size={25} color="#254236" />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{stage.title}</Text>
                  {stage.description && (
                    <Text style={styles.cardSubtitle}>{stage.description}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Ionicons name="add-circle" size={38} color="#6F4C8C" />
          <Text style={styles.addText}>Agregar actividad</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Detalle Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF6F7" }}>
          {/* Header con flecha y TÍTULO CENTRADO */}
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="arrow-back" size={24} color="#254236" />
            </TouchableOpacity>
            <Text style={styles.detailHeaderTitle}>Detalles de Actividad</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Contenido centrado en tarjeta */}
          <ScrollView contentContainerStyle={styles.detailScroll}>
            <View style={styles.detailCard}>
              {selectedStage && (
                <>
                  <Text style={styles.detailText}>
                    <Text style={{ fontWeight: "700" }}>Título:</Text> {selectedStage.title}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={{ fontWeight: "700" }}>Fecha:</Text> {selectedStage.date.split("T")[0]}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={{ fontWeight: "700" }}>Hora:</Text> {formatTime(selectedStage.start_time)} - {formatTime(selectedStage.end_time)}
                  </Text>
                  {selectedStage.description ? (
                    <Text style={styles.detailText}>
                      <Text style={{ fontWeight: "700" }}>Descripción:</Text> {selectedStage.description}
                    </Text>
                  ) : null}
                  {selectedStage.location ? (
                    <Text style={styles.detailText}>
                      <Text style={{ fontWeight: "700" }}>Ubicación:</Text> {selectedStage.location}
                    </Text>
                  ) : null}
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.customButton} onPress={startEditing}>
                  <Text style={styles.buttonText}>Actualizar tarea</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.customButton, styles.deleteButton]}
                  onPress={handleDelete}
                >
                  <Text style={styles.buttonText}>Eliminar tarea</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Crear/Editar Modal */}
      <Modal
  visible={modalVisible}
  animationType="slide"
  transparent={false}
  onRequestClose={() => setModalVisible(false)}
>
  <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF6F7" }}>
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.modalTitle}>
        {isEditing ? "Editar Actividad" : "Crear etapa"}
      </Text>

      {/* Título (obligatorio) */}
      <Text style={styles.modalOptions}>
        Título de la etapa <Text style={styles.requiredText}>(Obligatorio)</Text>
      </Text>
      <TextInput
        style={[styles.input, !title && styles.inputError]}
        placeholder="Título"
        value={title}
        onChangeText={setTitle}
      />

      {/* Fecha (obligatorio) */}
      <Text style={styles.modalOptions}>
        Fecha <Text style={styles.requiredText}>(Obligatorio)</Text>
      </Text>
      <TouchableOpacity
        style={[styles.input, !date && styles.inputError]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text>{date || "Selecciona fecha"}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date ? new Date(date) : new Date()}
          mode="date"
          display="default"
          onChange={(e, selected) => {
            setShowDatePicker(false);
            if (selected) setDate(selected.toISOString().split("T")[0]);
          }}
        />
      )}

      {/* Hora inicio (obligatorio) */}
      <Text style={styles.modalOptions}>
        Hora inicio <Text style={styles.requiredText}>(Obligatorio)</Text>
      </Text>
      <TouchableOpacity
        style={[styles.input, !startTime && styles.inputError]}
        onPress={() => setShowStartPicker(true)}
      >
        <Text>{startTime ? formatTime(startTime) : "Hora inicio"}</Text>
      </TouchableOpacity>
      {showStartPicker && (
        <DateTimePicker
          value={startTime ? new Date(`1970-01-01T${startTime}`) : new Date()}
          mode="time"
          display="default"
          onChange={(e, selected) => {
            setShowStartPicker(false);
            if (selected) setStartTime(selected.toTimeString().split(" ")[0]);
          }}
        />
      )}

      {/* Hora fin (obligatorio) */}
      <Text style={styles.modalOptions}>
        Hora fin <Text style={styles.requiredText}>(Obligatorio)</Text>
      </Text>
      <TouchableOpacity
        style={[styles.input, !endTime && styles.inputError]}
        onPress={() => setShowEndPicker(true)}
      >
        <Text>{endTime ? formatTime(endTime) : "Hora fin"}</Text>
      </TouchableOpacity>
      {showEndPicker && (
        <DateTimePicker
          value={endTime ? new Date(`1970-01-01T${endTime}`) : new Date()}
          mode="time"
          display="default"
          onChange={(e, selected) => {
            setShowEndPicker(false);
            if (selected) setEndTime(selected.toTimeString().split(" ")[0]);
          }}
        />
      )}

      {/* Descripción (opcional) */}
      <Text style={styles.modalOptions}>Descripción</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Descripción de la actividad"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {/* Ubicación (opcional) */}
      <Text style={styles.modalOptions}>Ubicación</Text>
      <TextInput
        style={styles.input}
        placeholder="Ubicación de la actividad"
        value={location}
        onChangeText={setLocation}
      />

      {/* Botones */}
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.customButton2, styles.cancelButton]}
          onPress={() => {
            setModalVisible(false);
            setIsEditing(false);
          }}
        >
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.customButton2,
            styles.saveButton,
            !isFormValid && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid}
        >
          <Text style={styles.buttonText}>
            {isEditing ? "Guardar cambios" : "Crear etapa"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </SafeAreaView>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F0E7",
    marginTop: Platform.OS === "android" ? 25 : 0,
    marginBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  title: { fontSize: 28, fontWeight: "500", color: "#254236" },
  titleSection: {
    fontSize: 24,
    fontWeight: "800",
    color: "black",
    marginLeft: 16,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    color: "#254236",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tabs: { flexDirection: "row", marginHorizontal: 16, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFF",
    alignItems: "center",
    marginRight: 8,
  },
  tabActive: { backgroundColor: "#E8D2FD" },
  tabText: { color: "#254236", fontWeight: "500" },
  tabTextActive: { color: "#442D49" },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  time: { width: 60, fontSize: 14, color: "#A7A7A5", fontWeight: "500" },
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    elevation: 2,
  },
  cardText: { marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#254236" },
  cardSubtitle: { fontSize: 14, color: "#4B5563", marginTop: 4 },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 24,
    fontSize: 15,
    fontStyle: "italic",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    padding: 12,
    backgroundColor: "#F1E3F5",
    borderRadius: 25,
    elevation: 1,
    width: "85%",
    marginLeft: "15%",
    height: 59,
  },
  addText: { marginLeft: 8, fontSize: 16, color: "#254236", fontWeight: "500" },

  
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  detailHeaderTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#AF8EC1",
  },
  detailScroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  detailCard: {
    width: "92%",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  
  modalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#FDF6F7",
    borderRadius: 18,
    padding: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    color: "#AF8EC1",
  },
  modalOptions: {
    marginTop: 6,
    marginBottom: 4,
    color: "#6B5E70",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    backgroundColor: "#FFF",
  },
  modalButtons: {
    flexDirection: "column",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  customButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: "#D9534F",
  },
  customButton2: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: "#D9534F",
  },
  saveButton: {
    backgroundColor: "#AF8DC2",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  detailText: { fontSize: 14, marginBottom: 8, color: "#111827" },
  requiredText: {
  color: "red",
  fontSize: 12,
  fontWeight: "400",
},
inputError: {
  borderColor: "red",
},

disabledButton: {
  backgroundColor: "#CCC",
},
});
