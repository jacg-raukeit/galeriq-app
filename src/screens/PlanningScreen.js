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
import { useTranslation } from "react-i18next";

const API_URL = "http://143.198.138.35:8000";

const PRIORITY_COLORS = {
  alta: "#DC2626",
  media: "#D97706",
  baja: "#16A34A",
};

export default function PlanningScreen({ navigation, route }) {
  const { t, i18n } = useTranslation("planning");
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
      Alert.alert(t("alerts.error_title"), t("alerts.toggle_failed"));
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
     Alert.alert(t("alerts.required_title"), t("alerts.title_required_msg"));
      return;
    }
    if (isExpense && !budget) {
     Alert.alert(t("alerts.budget_required_title"), t("alerts.budget_required_msg"));
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
      Alert.alert(t("alerts.error_title"), t("alerts.create_failed"));
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
  
  const startView = (task) => {
    setMode("view");
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
        Alert.alert(t("alerts.required_title"), t("alerts.title_required_msg"));
      return;
    }
    if (isExpense && !budget) {
        Alert.alert(t("alerts.budget_required_title"), t("alerts.budget_required_msg"));
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
      Alert.alert(t("alerts.error_title"), t("alerts.update_failed"));
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
      // Alert.alert(t("alerts.success_title"), t("alerts.delete_success"));
      await loadTasks();
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
     Alert.alert(t("alerts.error_title"), t("alerts.delete_failed"));
    } finally {
      setDeletingTaskId(null);
      setTimeout(() => setShowDeletingToast(false), 500);
    }
  };

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
        <Text style={styles.description}>{t("header.description")}</Text>
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
                onPress={() => startView(task)}
                disabled={deletingTaskId === task.id}
                style={styles.iconBtn}
              >
                <Ionicons name="eye-outline" size={22} color="#3B82F6" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => startEdit(task)}
                disabled={deletingTaskId === task.id}
                style={styles.iconBtn}
              >
                <Ionicons name="pencil-outline" size={22} color="#2563EB" />
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
          <Text style={styles.addText}>{t("list.add_task")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {showDeletingToast && (
        <View style={styles.deletingToast}>
          <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            {t("toast.deleting")}
          </Text>
        </View>
      )}

      <Modal visible={showAdd} animationType="fade" onRequestClose={() => { setShowAdd(false); resetForm(); }}>
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
              {mode === 'edit'
                ? t("modal.edit_title")
                : mode === 'view'
                ? t("modal.view_title")
                : t("modal.create_title")}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContainer}>
            <Text style={styles.labelText}>{t("modal.fields.title")}</Text>
            {mode === 'view' ? (
              <Text style={styles.readOnlyField}>{title}</Text>
            ) : (
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t("modal.fields.title_placeholder")} placeholderTextColor="#888" />
            )}

            <Text style={styles.labelText}>{t("modal.fields.description")}</Text>
            {mode === 'view' ? (
              <Text style={styles.readOnlyField}>{description || t("modal.fields.no_description")}</Text>
            ) : (
              <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder={t("modal.fields.description_placeholder")} placeholderTextColor="#888" />
            )}

            <Text style={styles.labelText}>{t("modal.fields.due_date")}</Text>
            {mode === 'view' ? (
                <Text style={styles.readOnlyField}>
                    {dueDate ? dueDate.toLocaleDateString(i18n.language || undefined, { day: "2-digit", month: "long", year: "numeric" }) : t("modal.fields.no_due_date")}
                </Text>
            ) : (
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text>{dueDate ? dueDate.toLocaleDateString(i18n.language || undefined, { day: "2-digit", month: "long", year: "numeric" }) : t("modal.fields.due_date_placeholder")}</Text>
              </TouchableOpacity>
            )}
            {showDatePicker && mode !== 'view' && (
              <DateTimePicker value={dueDate || new Date()} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setDueDate(date);
                }}
              />
            )}

            <Text style={styles.labelText}>{t("modal.fields.priority")}</Text>
            {mode === 'view' ? (
                <Text style={styles.readOnlyField}>{t(`priority.options.${priority}`)}</Text>
            ) : (
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={priority} onValueChange={setPriority} style={styles.picker}>
                  {Object.keys(PRIORITY_COLORS).map((p) => (
                    <Picker.Item key={p} label={t(`priority.options.${p}`)} value={p} />
                  ))}
                </Picker>
              </View>
            )}
            
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => mode !== 'view' && setIsExpense((prev) => !prev)}
                activeOpacity={mode === 'view' ? 1 : 0.7}
              >
                <Ionicons name={isExpense ? "checkbox-outline" : "square-outline"} size={22} color="#A861B7" style={{ marginRight: 8 }} />
                <Text style={styles.labelText}>{t("modal.fields.is_expense")}</Text>
              </TouchableOpacity>
            </View>

            {isExpense && (
              <>
                <Text style={styles.labelText}>{t("modal.fields.budget")}</Text>
                {mode === 'view' ? (
                    <Text style={styles.readOnlyField}>{budget ? `$${parseFloat(budget).toFixed(2)}` : t("modal.fields.no_budget")}</Text>
                ) : (
                  <TextInput style={styles.input} value={budget} onChangeText={setBudget} placeholder={t("modal.fields.budget_placeholder")} keyboardType="numeric" placeholderTextColor="#888" />
                )}
              </>
            )}

            {mode !== 'view' && (
              <TouchableOpacity
                style={[ styles.saveButton, (!title?.trim() || savingTask || updatingTask) && { backgroundColor: "#ccc" } ]}
                onPress={mode === "edit" ? handleUpdate : handleSave}
                disabled={!title?.trim() || savingTask || updatingTask}
              >
                {savingTask || updatingTask ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveText}>
                    {mode === "edit" ? t("modal.actions.save_changes") : t("modal.actions.save_task")}
                  </Text>
                )}
              </TouchableOpacity>
            )}
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
  container: { padding: 16, paddingBottom: 48 },
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
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    flex: 1,
  },
  taskLabel: { marginLeft: 12, fontSize: 16, flexShrink: 1 },
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
  modalScreen: { flex: 1, backgroundColor: "#F9FAFB" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: "#FFF",
  },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  modalContainer: { padding: 16, paddingBottom: 48 },
  labelText: { fontSize: 17, fontWeight: "600", color: '#374151', marginBottom: 4, marginTop: 16 },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    fontSize: 14,
  },
  readOnlyField: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#374151',
    fontSize: 14,
    minHeight: 45,
    justifyContent: 'center',
  },
  pickerWrapper: {
    backgroundColor: "#FFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  picker: { width: "100%", color: "#111827" },
  saveButton: {
    marginTop: 32,
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
    elevation: 4,
  },
});
