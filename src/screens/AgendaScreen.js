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
  Switch,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";

export default function AgendaScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { eventId, eventDate } = route.params;

  const TAB_BAR_HEIGHT = 72;         
  const EXTRA_SAFE_SPACE = 28;       
  const CONTENT_BOTTOM_INSET = TAB_BAR_HEIGHT + EXTRA_SAFE_SPACE;

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

  const [submittingStage, setSubmittingStage] = useState(false);

  const [allDay, setAllDay] = useState(false);
  const [createAlbum, setCreateAlbum] = useState(false);

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
      const d = new Date(
        dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr
      );
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
        const sA = a.start_time || "00:00:00";
        const sB = b.start_time || "00:00:00";
        const timeA = new Date(`1970-01-01T${sA}`);
        const timeB = new Date(`1970-01-01T${sB}`);
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
    setStartTime(s.start_time || "");
    setEndTime(s.end_time || "");
    setDescription(s.description || "");
    setLocation(s.location || "");
    setCreateAlbum(false);
    setAllDay(false);
  };

  const handleSubmit = async () => {
    if (submittingStage) return;

    if (!title || !date || (!allDay && (!startTime || !endTime))) {
      return Alert.alert("Error", "Completa los campos obligatorios.");
    }

    try {
      setSubmittingStage(true);

      const body = {
        title,
        date,
        start_time: allDay ? "00:00:00" : startTime,
        end_time: allDay ? "23:59:59" : endTime,
        description,
        location,
        ...(isEditing
          ? {}
          : { is_album: Boolean(createAlbum), all_day: Boolean(allDay) }),
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
      setCreateAlbum(false);
      setAllDay(false);

      await fetchStages();
    } catch {
      Alert.alert(
        "Error",
        isEditing
          ? "No se pudo actualizar la actividad."
          : "No se pudo crear la actividad."
      );
    } finally {
      setSubmittingStage(false); 
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

  const isFormValid = title && date && (allDay || (startTime && endTime));

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

      {/* Lista/Timeline */}
       <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: CONTENT_BOTTOM_INSET }]}
        keyboardShouldPersistTaps="handled"
      >
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
              <Text style={styles.time}>
                {stage.all_day ? "Todo el día" : formatTime(stage.start_time)}
              </Text>
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
            setCreateAlbum(false);
            setAllDay(false);
            setTitle("");
            setDate("");
            setStartTime("");
            setEndTime("");
            setDescription("");
            setLocation("");
            setModalVisible(true);
          }}
        >
          <Ionicons name="add-circle" size={38} color="#6F4C8C" />
          <Text style={styles.addText}>Agregar actividad</Text>
        </TouchableOpacity>

        {/* spacer extra */}
        <View style={{ height: 8 }} />
      </ScrollView>




      {/* Tab bar inferior */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => {
            navigation.replace("PlanningHome", {
              initialTab: "checklist",
              eventId,
              eventDate,
            });
          }}
        >
          <Ionicons name="list-outline" size={20} color={"#254236"} />
          <Text style={styles.tabText}>Checklist</Text>
        </TouchableOpacity>

        <TouchableOpacity
  style={styles.tabButton}
  onPress={() => navigation.replace('BudgetControl', { eventId })}
>
  <Ionicons name="cash-outline" size={20} color={"#254236"} />
  <Text style={styles.tabText}>Gastos</Text>
</TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, styles.tabActive]}
          onPress={() => {}}
          disabled
        >
          <Ionicons name="calendar-outline" size={20} color={"#FFF"} />
          <Text style={[styles.tabText, styles.tabTextActive]}>Agenda</Text>
        </TouchableOpacity>
      </View>


{/* Detalle */}
<Modal
  visible={detailModalVisible}
  animationType="fade"
  transparent
  statusBarTranslucent
  onRequestClose={() => setDetailModalVisible(false)}
>
  {/* Backdrop a pantalla completa */}
  <View style={styles.modalBackdrop}>
    {/* Panel centrado */}
    <View style={styles.detailSheet}>
      {/* Header del panel */}
      <View style={styles.detailSheetHeader}>
        <Text style={styles.detailHeaderTitle}>Detalles de Actividad</Text>

        <TouchableOpacity onPress={() => setDetailModalVisible(false)} hitSlop={{top:10,left:10,bottom:10,right:10}}>
          <Ionicons name="close" size={22} color="#254236" />
        </TouchableOpacity>
      </View>

      {/* Contenido con scroll si se desborda */}
      <ScrollView
        contentContainerStyle={styles.detailSheetContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
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
                <Text style={{ fontWeight: "700" }}>Hora:</Text>{" "}
                {selectedStage.all_day
                  ? "Todo el día"
                  : `${formatTime(selectedStage.start_time)} - ${formatTime(selectedStage.end_time)}`}
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

          <View style={styles.modalButtonsColumn}>
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
    </View>
  </View>
</Modal>


      {/* Crear/Editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          if (!submittingStage) {
            setModalVisible(false);
            setIsEditing(false);
          }
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF6F7" }}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Editar Actividad" : "Crear etapa"}
            </Text>
            <Text style={styles.modalOptionsObligatorio}>
              Los campos marcados con (*) son obligatorios
            </Text>

            {/* Título */}
            <Text style={styles.modalOptions}>
              Título de la etapa <Text style={styles.requiredText}>(*)</Text>
            </Text>
            <TextInput
  style={styles.input}
  placeholder="Título"
  value={title}
  editable={!submittingStage}
  onChangeText={setTitle}
/>

            {/* Descripción (opcional) */}
            <Text style={styles.modalOptions}>Descripción</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Descripción de la actividad"
              value={description}
              editable={!submittingStage}
              onChangeText={setDescription}
              multiline
            />

            {/* Fecha */}
            <Text style={styles.modalOptions}>
              Fecha <Text style={styles.requiredText}>(*)</Text>
            </Text>
            <TouchableOpacity
              style={[styles.input, submittingStage && { opacity: 0.6 }]}
              onPress={() => !submittingStage && setShowDatePicker(true)}
              disabled={submittingStage}
              activeOpacity={0.7}
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

            {/* Hora inicio + Hora fin (solo si NO es todo el día) */}
            {!allDay && (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.input, submittingStage && { opacity: 0.6 }]}
                    onPress={() => !submittingStage && setShowStartPicker(true)}
                    disabled={submittingStage}
                  >
                    <Text>{startTime ? formatTime(startTime) : "Inicio"}</Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={
                        startTime
                          ? new Date(`1970-01-01T${startTime}`)
                          : new Date()
                      }
                      mode="time"
                      display="default"
                      onChange={(e, selected) => {
                        setShowStartPicker(false);
                        if (selected)
                          setStartTime(selected.toTimeString().split(" ")[0]);
                      }}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.input, submittingStage && { opacity: 0.6 }]}
                    onPress={() => !submittingStage && setShowEndPicker(true)}
                    disabled={submittingStage}
                  >
                    <Text>{endTime ? formatTime(endTime) : "Fin"}</Text>
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={
                        endTime ? new Date(`1970-01-01T${endTime}`) : new Date()
                      }
                      mode="time"
                      display="default"
                      onChange={(e, selected) => {
                        setShowEndPicker(false);
                        if (selected)
                          setEndTime(selected.toTimeString().split(" ")[0]);
                      }}
                    />
                  )}
                </View>
              </View>
            )}

            {/* ¿Todo el día? (checkbox, solo CREAR) */}
            {!isEditing && (
              <TouchableOpacity
                style={[styles.checkboxRow, submittingStage && { opacity: 0.6 }]}
                onPress={() => !submittingStage && setAllDay((v) => !v)}
                activeOpacity={0.7}
                disabled={submittingStage}
              >
                <Text style={styles.modalOptions}>¿Todo el día?</Text>
                <Ionicons
                  name={allDay ? "checkbox" : "square-outline"}
                  size={22}
                  color={allDay ? "#6F4C8C" : "#6B5E70"}
                />
              </TouchableOpacity>
            )}

            {/* ¿Crear álbum? (switch, solo CREAR) */}
            {!isEditing && (
              <View style={[styles.switchRow, submittingStage && { opacity: 0.6 }]}>
                <Text style={styles.modalOptions}>¿Crear álbum?</Text>
                <Switch
                  value={createAlbum}
                  onValueChange={(v) => !submittingStage && setCreateAlbum(v)}
                  disabled={submittingStage}
                  trackColor={{ false: "#d4d4d8", true: "#C7A7E0" }}
                  thumbColor={createAlbum ? "#6F4C8C" : "#f4f3f4"}
                />
              </View>
            )}

            {/* Botones */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.customButton2,
                  styles.cancelButton,
                  submittingStage && { opacity: 0.6 },
                ]}
                onPress={() => {
                  if (!submittingStage) {
                    setModalVisible(false);
                    setIsEditing(false);
                  }
                }}
                disabled={submittingStage}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.customButton2,
                  styles.saveButton,
                  (!isFormValid || submittingStage) && styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid || submittingStage}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isFormValid || submittingStage, busy: submittingStage }}
              >
                {submittingStage ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isEditing ? "Guardar cambios" : "Crear etapa"}
                  </Text>
                )}
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
  time: { width: 90, fontSize: 14, color: "#A7A7A5", fontWeight: "500" },
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

  tabBar: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 8,
    borderColor: "#EAEBDB",
    borderWidth: 1,
    elevation: 2,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  tabActive: { backgroundColor: "#254236" },
  tabText: { marginLeft: 6, color: "#254236", fontWeight: "600" },
  tabTextActive: { color: "#FFF" },

  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
 
  detailScroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
detailCard: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  detailText: { fontSize: 14, marginBottom: 8, color: "#111827" },

  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    color: "#AF8EC1",
  },
  modalOptionsObligatorio: {
    fontSize: 10,
    color: "red",
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
  switchRow: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkboxRow: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  modalButtonsColumn: {
    flexDirection: "column",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  customButton: {
    backgroundColor: "#C8A5E6",
    padding: 10,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: "#F28B82",
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

  // Backdrop morado claro, ocupa toda la pantalla
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#EBD6FB',
    // backgroundColor: '#EBD8F590', 
    justifyContent: 'center',
    padding: 20,
  },

  // Panel/Sheet centrado
  detailSheet: {
    width: '90%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#FDF6F7',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  // Header dentro del panel
  detailSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 10,
  },

  // Reusa tu color/línea visual
  detailHeaderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#AF8EC1',
  },

  // Área scrolleable del panel
  detailSheetContent: {
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
});
