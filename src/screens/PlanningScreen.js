// src/screens/PlanningScreen.js
import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../context/AuthContext";

const API_URL = "http://143.198.138.35:8000";

const PRIORITY_COLORS = {
  alta: "#DC2626",
  media: "#D97706",
  baja: "#16A34A",
};

export default function PlanningScreen({ navigation, route }) {
  const { eventId, category: categoryParam } = route.params;
  const { user } = useContext(AuthContext);

  const [tasks, setTasks] = useState(categoryParam.tasks || []);
  const [showAdd, setShowAdd] = useState(false);

  const [mode, setMode] = useState("create");
  const [editingTask, setEditingTask] = useState(null);

  const [checklistName, setChecklistName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState("baja");
  const [budget, setBudget] = useState("");
  const [isExpense, setIsExpense] = useState(false);

  const [savingTask, setSavingTask] = useState(false);
  const [updatingTask, setUpdatingTask] = useState(false);

  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [showDeletingToast, setShowDeletingToast] = useState(false);

  const loadTasks = async () => {
    if (!eventId || !categoryParam?.name || !user?.token) return;
    const categoryNameEscaped = encodeURIComponent(categoryParam.name);
    try {
      const res = await fetch(
        `${API_URL}/checklists/event/${eventId}/category-name/${categoryNameEscaped}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar tareas:", err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [eventId, categoryParam?.name, user?.token]);

  const toggleDone = async (task) => {
    if (deletingTaskId === task.id) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
      )
    );

    try {
      const res = await fetch(`${API_URL}/checklists/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ is_completed: !task.is_completed }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
      // rollback
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, is_completed: task.is_completed } : t
        )
      );
      Alert.alert("Error", "No se pudo actualizar la tarea.");
    }
  };

  const resetForm = () => {
    setChecklistName("");
    setTitle("");
    setDescription("");
    setDueDate(null);
    setPriority("baja");
    setBudget("");
    setIsExpense(false);
    setEditingTask(null);
    setMode("create");
  };

  const handleSave = async () => {
    if (savingTask) return;

    if (!title?.trim()) {
      Alert.alert(
        "Campo obligatorio",
        "Debes indicar un título para la tarea."
      );
      return;
    }
    if (!description?.trim() || !dueDate) {
      Alert.alert(
        "Error",
        "Por favor, completa los campos: Descripción y Fecha límite."
      );
      return;
    }
    if (isExpense && !budget) {
      Alert.alert(
        "Falta presupuesto",
        "Indica el budget estimado para el gasto."
      );
      return;
    }

    const payload = {
      event_id: eventId,
      checklist_name: "",
      title: title.trim(),
      description: description.trim(),
      due_date: dueDate ? dueDate.toISOString().slice(0, 16) : null,
      category: categoryParam.name,
      priority,
      is_expense: !!isExpense,
      ...(isExpense && budget ? { budget: parseFloat(budget) } : {}),
    };
    if (checklistName && checklistName.trim().length > 0) {
      payload.checklist_name = checklistName.trim();
    }

    try {
      setSavingTask(true);
      const res = await fetch(`${API_URL}/checklists/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const newTask = await res.json();
      setTasks((prev) => [newTask, ...prev]);

      setShowAdd(false);
      resetForm();
    } catch (err) {
      console.error("Error al crear tarea:", err);
      Alert.alert("Error", "No se pudo crear la tarea. Verifica los datos.");
    } finally {
      setSavingTask(false);
    }
  };

  const startEdit = (task) => {
    setMode("edit");
    setEditingTask(task);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setDueDate(task.due_date ? new Date(task.due_date) : null);
    setPriority(task.priority || "baja");
    setIsExpense(!!task.is_expense);
    setBudget(task.budget != null ? String(task.budget) : "");
    setShowAdd(true);
  };

  const handleUpdate = async () => {
    if (updatingTask || !editingTask) return;

    if (!title?.trim()) {
      Alert.alert(
        "Campo obligatorio",
        "Debes indicar un título para la tarea."
      );
      return;
    }
    if (!description?.trim() || !dueDate) {
      Alert.alert(
        "Error",
        "Por favor, completa los campos: Descripción y Fecha límite."
      );
      return;
    }
    if (isExpense && !budget) {
      Alert.alert(
        "Falta presupuesto",
        "Indica el budget estimado para el gasto."
      );
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      due_date: dueDate ? dueDate.toISOString().slice(0, 16) : null,
      priority,
      is_expense: !!isExpense,
      ...(isExpense && budget
        ? { budget: parseFloat(budget) }
        : { budget: null }),
    };

    try {
      setUpdatingTask(true);
      const res = await fetch(`${API_URL}/checklists/${editingTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

      setShowAdd(false);
      resetForm();
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
      Alert.alert("Error", "No se pudo actualizar la tarea.");
    } finally {
      setUpdatingTask(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (deletingTaskId) return;
    setDeletingTaskId(taskId);
    setShowDeletingToast(true);

    try {
      const res = await fetch(`${API_URL}/checklists/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      Alert.alert("Éxito", "Tarea eliminada correctamente");
      await loadTasks();
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
      Alert.alert("Error", "No se pudo eliminar la tarea.");
    } finally {
      setDeletingTaskId(null);
      setTimeout(() => setShowDeletingToast(false), 500);
    }
  };

  const ExpenseCheckbox = () => (
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={() => setIsExpense((prev) => !prev)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isExpense ? "checkbox-outline" : "square-outline"}
        size={22}
        color="#A861B7"
        style={{ marginRight: 8 }}
      />
      <Text style={styles.labelText}>¿Es gasto?</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#254236" />
        </TouchableOpacity>
        <Text style={styles.title}>{categoryParam.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>
          Agrega tus pendientes y marca el progreso.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {tasks.map((task) => (
          <View key={task.id} style={styles.taskRowWrap}>
            <TouchableOpacity
              style={styles.taskRow}
              onPress={() => toggleDone(task)}
              disabled={deletingTaskId === task.id}
            >
              <Ionicons
                name={
                  task.is_completed ? "checkmark-circle" : "ellipse-outline"
                }
                size={34}
                color={task.is_completed ? "#AF64BC" : "#CCC"}
              />
              <Text
                style={[
                  styles.taskLabel,
                  {
                    color: PRIORITY_COLORS[task.priority] || "#254236",
                    textDecorationLine: task.is_completed
                      ? "line-through"
                      : "none",
                  },
                ]}
              >
                {task.title}
              </Text>
            </TouchableOpacity>

            <View style={styles.rowActions}>
              <TouchableOpacity
                onPress={() => startEdit(task)}
                disabled={deletingTaskId === task.id}
                style={styles.iconBtn}
              >
                <Ionicons name="create-outline" size={22} color="#2563EB" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDelete(task.id)}
                disabled={deletingTaskId === task.id}
                style={styles.iconBtn}
              >
                {deletingTaskId === task.id ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="trash-outline" size={22} color="#DC2626" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowAdd(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={28} color="#254236" />
          <Text style={styles.addText}>Agregar tarea</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Toast simple de borrado */}
      {showDeletingToast && (
        <View style={styles.deletingToast}>
          <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Eliminando tarea…
          </Text>
        </View>
      )}

      {/* Modal crear/editar tarea */}
      <Modal visible={showAdd} animationType="fade">
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowAdd(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#A861B7" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {mode === "edit" ? "Editar tarea" : "Crear tarea"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContainer}>
            <View style={styles.labelWithIcon}>
              <Text style={styles.labelText}>Título</Text>
            </View>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Nombre de la tarea"
              placeholderTextColor="#888"
            />

            <View style={styles.labelWithIcon}>
              <Text style={styles.labelText}>Descripción</Text>
            </View>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalles..."
              placeholderTextColor="#888"
            />

            <View style={styles.labelWithIcon}>
              <Text style={styles.labelText}>Fecha límite</Text>
            </View>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>
                {dueDate
                  ? dueDate.toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Seleccionar fecha"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setDueDate(date);
                }}
              />
            )}

            <View>
              <View style={styles.labelWithIcon}>
                <Text style={styles.labelText}>Prioridad</Text>
              </View>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={priority}
                  onValueChange={setPriority}
                  style={styles.picker}
                >
                  {Object.keys(PRIORITY_COLORS).map((p) => (
                    <Picker.Item
                      key={p}
                      label={p.charAt(0).toUpperCase() + p.slice(1)}
                      value={p}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Checkbox de gasto */}
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsExpense((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isExpense ? "checkbox-outline" : "square-outline"}
                  size={22}
                  color="#A861B7"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.labelText}>¿Es gasto?</Text>
              </TouchableOpacity>
            </View>

            {/* Budget solo si es gasto */}
            {isExpense && (
              <>
                <View style={styles.labelWithIcon}>
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color="#A861B7"
                    style={styles.icon}
                  />
                  <Text style={styles.labelText}>Budget</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={budget}
                  onChangeText={setBudget}
                  placeholder="Ej. 1000.10"
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                />
              </>
            )}

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!title?.trim() || savingTask || updatingTask) && {
                  backgroundColor: "#ccc",
                },
              ]}
              onPress={mode === "edit" ? handleUpdate : handleSave}
              disabled={!title?.trim() || savingTask || updatingTask}
            >
              {savingTask || updatingTask ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveText}>
                  {mode === "edit" ? "Guardar cambios" : "Guardar tarea"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB", marginTop: 25 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  title: { fontSize: 25, fontWeight: "600", color: "#254236" },
  container: { padding: 16 },
  descriptionContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  description: { fontSize: 18, fontWeight: "600", color: "#815485" },

  taskRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    flex: 1,
  },
  taskLabel: { marginLeft: 12, fontSize: 12 },

  rowActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { padding: 6 },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    padding: 12,
    backgroundColor: "#E6D0EA",
    borderRadius: 8,
    elevation: 1,
  },
  addText: { marginLeft: 8, fontSize: 16, color: "#254236", fontWeight: "500" },

  // Modal
  modalScreen: { flex: 1, backgroundColor: "#F9FAFB" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
  },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  modalContainer: { padding: 16 },
  labelWithIcon: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  icon: { marginRight: 8 },
  labelText: { fontSize: 17, fontWeight: "600" },
  input: {
    marginTop: 8,
    backgroundColor: "#FFF",
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  pickerWrapper: {
    marginTop: 8,
    backgroundColor: "#FFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  picker: { width: "100%" },
  saveButton: {
    marginTop: 24,
    backgroundColor: "#AF64BC",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: { color: "#FFF", fontWeight: "600", fontSize: 16 },

  checkboxRow: { flexDirection: "row", alignItems: "center" },

  deletingToast: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
