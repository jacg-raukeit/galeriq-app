import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

const API_URL = "http://143.198.138.35:8000";

const ICON_MAP = {
  proveedores: "people-outline",
  banquete: "restaurant-outline",
  decoracion: "color-palette-outline",
};

const normalize = (str) =>
  (str || "")
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function normalizeGroupedPayload(grouped) {
  const toArray = (g) => {
    if (Array.isArray(g)) return g;
    if (g && typeof g === "object") {
      return Object.entries(g).map(([key, value], idx) => ({
        id: idx,
        category_id: null,
        name: key,
        tasks: Array.isArray(value) ? value : [],
      }));
    }
    return [];
  };

  const arr = toArray(grouped);

  return arr.map((g, idx) => {
    const rawName =
      g.name ??
      g.category_name ??
      (typeof g.category === "string" ? g.category : null);

    const rawId =
      g.category_id ??
      g.id ??
      (typeof g.category === "number" ? g.category : null);

    const tasks = g.tasks ?? g.items ?? g.checklists ?? g.value ?? [];

    return {
      id: rawId ?? idx,
      category_id: rawId ?? null,
      name: rawName ?? null,
      tasks: Array.isArray(tasks) ? tasks : [],
    };
  });
}

const isChecked = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "t" || s === "yes" || s === "y";
  }
  return false;
};

const isExpense = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "t" || s === "yes" || s === "y";
  }
  return false;
};

function iconForCategory(cat) {
  const key = normalize(cat?.name);
  return ICON_MAP[key] || "folder-outline";
}

export default function PlanningHomeScreen({ navigation, route }) {
  const { t } = useTranslation("planning_home");
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryBudget, setEditCategoryBudget] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  const { eventId, eventDate = null } = route.params || {};
  const { user } = useContext(AuthContext);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [activeTab, setActiveTab] = useState(
    route?.params?.initialTab ?? "checklist"
  );

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");

  const [catIdToName, setCatIdToName] = useState({});

  const loadCategories = useCallback(async () => {
    if (!eventId || !(user?.token || user?.accessToken)) return;
    setLoading(true);
    const token = user.token || user.accessToken;

    try {
      const catsRes = await fetch(
        `${API_URL}/category-checklists/event/${eventId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!catsRes.ok) throw new Error(`HTTP ${catsRes.status} categorías`);
      const rawCats = await catsRes.json();

      const idToName = {};
      (Array.isArray(rawCats) ? rawCats : []).forEach((c) => {
        idToName[c.id] = c.name;
      });
      const idToNameNorm = new Map(
        (Array.isArray(rawCats) ? rawCats : []).map((c) => [
          c.id,
          normalize(c.name),
        ])
      );
      setCatIdToName(idToName);

      const grpRes = await fetch(
        `${API_URL}/checklists/by-category/${eventId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!grpRes.ok) throw new Error(`HTTP ${grpRes.status} agrupado`);
      const rawGrouped = await grpRes.json();

      const grouped = normalizeGroupedPayload(rawGrouped);

      const tasksByName = new Map();
      grouped.forEach((g) => {
        const nameRaw =
          g.name ??
          g.category_name ??
          (typeof g.category === "string" ? g.category : null);

        const idRaw =
          g.category_id ?? (typeof g.category === "number" ? g.category : null);

        const nameNorm =
          nameRaw != null
            ? normalize(nameRaw)
            : idRaw != null
            ? idToNameNorm.get(idRaw)
            : null;

        if (!nameNorm) return;
        tasksByName.set(nameNorm, Array.isArray(g.tasks) ? g.tasks : []);
      });

      const merged = (Array.isArray(rawCats) ? rawCats : []).map((c, idx) => {
        const cname = (c.name || "").trim();
        const nameKey = normalize(cname);
        const catTasksRaw = tasksByName.get(nameKey) ?? [];

        const catTasks = catTasksRaw.map((t) => {
          const catIdFromTask =
            typeof t.category === "number"
              ? t.category
              : typeof t.category_id === "number"
              ? t.category_id
              : null;

          const resolvedName =
            typeof t.category === "string"
              ? t.category
              : catIdFromTask != null
              ? idToName[catIdFromTask]
              : t.category_name || null;

          return {
            ...t,
            category_name: resolvedName || cname || "Sin categoría",
          };
        });

        return {
          id: c.id ?? idx,
          category_id: c.id ?? null,
          name: cname,
          budget_category: c.budget_category ?? null,
          tasks: catTasks,
        };
      });

      setCategories(merged);
    } catch (err) {
       console.error("Error al fusionar categorías:", err);
      Alert.alert(t("alerts.error_title"), t("alerts.load_categories_failed"));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, user?.token, user?.accessToken, t]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.initialTab) {
        setActiveTab(route.params.initialTab);
      } else {
        setActiveTab("checklist");
      }
      loadCategories();
    }, [loadCategories])
  );

  const handleCreateCategory = useCallback(async () => {
    const token = user?.token || user?.accessToken;
    if (!newCategoryName?.trim()) {
      Alert.alert(t("alerts.error_title"), t("alerts.name_required"));
      return;
    }
     if (newCategoryBudget && isNaN(parseFloat(newCategoryBudget))) {
      Alert.alert(t("alerts.error_title"), t("alerts.budget_number"));
      return;
    }

    if (creatingCategory) return;

    const payload = {
      name: newCategoryName.trim(),
      event_id: eventId,
      budget_category: newCategoryBudget ? parseFloat(newCategoryBudget) : null,
    };

    try {
      setCreatingCategory(true);
      const res = await fetch(`${API_URL}/category-checklists/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      setShowAddCategoryModal(false);
      setNewCategoryName("");
      setNewCategoryBudget("");
      await loadCategories();
    } catch (err) {
      console.error("Error al crear la categoría:", err);
      Alert.alert(t("alerts.error_title"), t("alerts.create_failed"));
    } finally {
      setCreatingCategory(false);
    }
  }, [
    eventId,
    newCategoryName,
    newCategoryBudget,
    user?.token,
    user?.accessToken,
    loadCategories,
    creatingCategory,
  ]);

  const openEditCategory = useCallback((cat) => {
    setEditCategoryId(cat?.category_id ?? cat?.id ?? null);
    setEditCategoryName(cat?.name ?? "");
    setEditCategoryBudget(
      typeof cat?.budget_category === "number"
        ? String(cat.budget_category)
        : typeof cat?.budget === "number"
        ? String(cat.budget)
        : ""
    );
    setShowEditCategoryModal(true);
  }, []);

  const handleUpdateCategory = useCallback(async () => {
    const token = user?.token || user?.accessToken;

   if (!editCategoryId) {
      Alert.alert(t("alerts.error_title"), t("alerts.invalid_category"));
      return;
    }
    if (!editCategoryName?.trim()) {
      Alert.alert(t("alerts.error_title"), t("alerts.name_required"));
      return;
    }
    if (editCategoryBudget && isNaN(parseFloat(editCategoryBudget))) {
      Alert.alert(t("alerts.error_title"), t("alerts.budget_number"));
      return;
    }

    const payload = {
      name: editCategoryName.trim(),
      budget_category:
        editCategoryBudget !== "" ? parseFloat(editCategoryBudget) : null,
    };

    try {
      setUpdatingCategory(true);
      const res = await fetch(
        `${API_URL}/category-checklists/${editCategoryId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      setShowEditCategoryModal(false);
      setEditCategoryId(null);
      setEditCategoryName("");
      setEditCategoryBudget("");
      await loadCategories();
    } catch (err) {
      console.error("Error al actualizar la categoría:", err);
      Alert.alert(t("alerts.error_title"), t("alerts.update_failed"));
    } finally {
      setUpdatingCategory(false);
    }
  }, [
    API_URL,
    user?.token,
    user?.accessToken,
    editCategoryId,
    editCategoryName,
    editCategoryBudget,
    loadCategories,
  ]);

  const confirmDeleteCategory = useCallback((categoryId) => {
    Alert.alert(
      t("alerts.delete_confirm_title"),
      t("alerts.delete_confirm_message"),
      [
        { text: t("alerts.delete_confirm_cancel"), style: "cancel" },
        {
          text: t("alerts.delete_confirm_ok"),
          style: "destructive",
          onPress: () => handleDeleteCategory(categoryId),
        },
      ]
    );
  }, [t]);

  const handleDeleteCategory = useCallback(
    async (categoryId) => {
      const token = user?.token || user?.accessToken;
      if (!categoryId) return;

      try {
        setDeletingCategoryId(categoryId);
        const res = await fetch(
          `${API_URL}/category-checklists/${categoryId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }

        if (showEditCategoryModal && editCategoryId === categoryId) {
          setShowEditCategoryModal(false);
          setEditCategoryId(null);
          setEditCategoryName("");
          setEditCategoryBudget("");
        }

        await loadCategories();
      } catch (err) {
        console.error("Error al eliminar la categoría:", err);
        Alert.alert(t("alerts.error_title"), t("alerts.delete_failed"));
      } finally {
        setDeletingCategoryId(null);
      }
    },
    [
      API_URL,
      user?.token,
      user?.accessToken,
      loadCategories,
      showEditCategoryModal,
      editCategoryId,
    ]
  );

  const { total, doneCount, percent } = useMemo(() => {
    const t = categories.reduce(
      (sum, cat) => sum + (cat.tasks?.length || 0),
      0
    );
    const d = categories.reduce(
      (sum, cat) =>
        sum +
        (cat.tasks?.filter((task) => isChecked(task.is_completed))?.length ||
          0),
      0
    );
    return {
      total: t,
      doneCount: d,
      percent: t > 0 ? Math.round((d / t) * 100) : 0,
    };
  }, [categories]);

  const expenseTasks = useMemo(() => {
    const all = categories.flatMap((c) => c.tasks || []);
    return all.filter((t) => isExpense(t.is_expense ?? t.is_expensive));
  }, [categories]);

  const getCategoryDisplay = useCallback(
    (task) => {
      if (task?.category_name && typeof task.category_name === "string") {
        return task.category_name;
      }

      const numIdFromTask =
        typeof task?.category === "number"
          ? task.category
          : typeof task?.category_id === "number"
          ? task.category_id
          : null;

      if (numIdFromTask != null) {
        return catIdToName[numIdFromTask] || `Categoría ${numIdFromTask}`;
      }

      // Fallbacks
      if (typeof task?.category === "string") return task.category;
      return "Sin categoría";
    },
    [catIdToName]
  );

  const toggleExpenseCompleted = useCallback(
    async (task) => {
      const token = user?.token || user?.accessToken;
      const newVal = !isChecked(task.is_completed);

      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          tasks: (cat.tasks || []).map((t) =>
            t.id === task.id ? { ...t, is_completed: newVal } : t
          ),
        }))
      );

      try {
        const res = await fetch(`${API_URL}/checklists/${task.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_completed: newVal }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
      } catch (err) {
        console.error("Error al actualizar gasto:", err);
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            tasks: (cat.tasks || []).map((t) =>
              t.id === task.id ? { ...t, is_completed: !newVal } : t
            ),
          }))
        );
        Alert.alert(t("alerts.error_title"), t("alerts.expense_update_failed"));
      }
    },
    [user?.token, user?.accessToken, t]
  );

  const displayName = (cat) =>
    cat?.name
      ? `${cat.name.charAt(0).toUpperCase()}${cat.name.slice(1)}`
      : cat?.category_id != null
      ? t("labels.category_with_id", { id: cat.category_id })
      : t("labels.category");

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#254236" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Barra de progreso (global) */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.percentText}>{percent}% {t("progress.completed")}</Text>

      {/* Contenido según pestaña */}
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={{ paddingVertical: 24 }}>
            <ActivityIndicator size="small" />
          </View>
        ) : activeTab === "checklist" ? (
          <>
            {/* Lista de Categorías */}
            {categories.map((cat) => {
              const icon = iconForCategory(cat);
              const completed =
                cat.tasks?.filter((t) => isChecked(t.is_completed))?.length ||
                0;
              const count = cat.tasks?.length || 0;

              return (
                <View
                  key={cat.id ?? `${cat.name ?? ""}-${cat.category_id ?? ""}`}
                  style={styles.itemButton}
                >
                  {/* Zona principal: navegar al detalle */}
                  <TouchableOpacity
                    style={styles.itemMain}
                    onPress={() =>
                      navigation.navigate("Planning", {
                        eventId,
                        category: cat,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={iconForCategory(cat)}
                      size={20}
                      color="#254236"
                    />
                    <Text style={styles.itemText}>{displayName(cat)}</Text>
                    <Text style={{ color: "#254236", marginRight: 8 }}>
                      {cat.tasks?.filter((t) => isChecked(t.is_completed))
                        ?.length || 0}
                      /{cat.tasks?.length || 0}
                    </Text>
                    {/* <Ionicons name="chevron-forward" size={10} color="#254236" /> */}
                  </TouchableOpacity>

                  {/* Acciones: editar / eliminar */}
                  <View style={styles.itemActions}>
                    {/* EDITAR */}
                    <TouchableOpacity
                      onPress={() => openEditCategory(cat)}
                      style={styles.actionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={22}
                        color="#254236"
                      />
                    </TouchableOpacity>

                    {/* ELIMINAR */}
                    <TouchableOpacity
                      onPress={() =>
                        confirmDeleteCategory(cat.category_id ?? cat.id)
                      }
                      style={styles.actionBtn}
                      disabled={
                        deletingCategoryId === (cat.category_id ?? cat.id)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      {deletingCategoryId === (cat.category_id ?? cat.id) ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={22}
                          color="#B00020"
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Botón Añadir categoría */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddCategoryModal(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#254236" />
              <Text style={styles.addText}>{t("buttons.add_category")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Lista de Gastos (solo is_expense) */}
            {expenseTasks.length === 0 ? (
              <Text style={{ color: "#254236", opacity: 0.8 }}>
                {t("lists.no_expenses")}
              </Text>
            ) : (
              expenseTasks.map((task) => {
                const checked = isChecked(task.is_completed);
                return (
                  <View key={task.id} style={styles.expenseRow}>
                    <TouchableOpacity
                      onPress={() => toggleExpenseCompleted(task)}
                    >
                      <Ionicons
                        name={checked ? "checkbox-outline" : "square-outline"}
                        size={24}
                        color={checked ? "#254236" : "#999"}
                      />
                    </TouchableOpacity>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.expenseTitle}>
                        {task.title || task.checklist_name || t("expense.fallback_title")}
                      </Text>
                      <Text style={styles.expenseMeta}>
                        {getCategoryDisplay(task) || t("labels.uncategorized")}
                        {typeof task.budget === "number"
                          ? ` · $${task.budget}`
                          : ""}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Tab bar inferior  */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "checklist" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("checklist")}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={activeTab === "checklist" ? "#FFF" : "#254236"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "checklist" && styles.tabTextActive,
            ]}
          >
            {t("tabs.checklist")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "gastos" && styles.tabActive]}
          onPress={() => navigation.replace("BudgetControl", { eventId })}
        >
          <Ionicons
            name="cash-outline"
            size={20}
            color={activeTab === "gastos" ? "#FFF" : "#254236"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "gastos" && styles.tabTextActive,
            ]}
          >
            {t("tabs.expenses")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "agenda" && styles.tabActive]}
          onPress={() => navigation.replace("Agenda", { eventId, eventDate })}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={activeTab === "agenda" ? "#FFF" : "#254236"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "agenda" && styles.tabTextActive,
            ]}
          >
            {t("tabs.agenda")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal crear categoría */}
      <Modal
        visible={showAddCategoryModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("modals.create_title")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("modals.placeholders.category_name")}
              placeholderTextColor="#888"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <TextInput
              style={styles.input}
              placeholder={t("modals.placeholders.category_budget")}
              placeholderTextColor="#888"
              value={newCategoryBudget}
              onChangeText={setNewCategoryBudget}
              keyboardType="numeric"
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName("");
                  setNewCategoryBudget("");
                }}
              >
                 <Text style={styles.buttonText}>{t("buttons.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (creatingCategory || !newCategoryName?.trim()) && {
                    opacity: 0.6,
                  },
                ]}
                onPress={handleCreateCategory}
                disabled={creatingCategory || !newCategoryName?.trim()}
              >
                {creatingCategory ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>{t("buttons.create")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal editar categoría */}
      <Modal
        visible={showEditCategoryModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
           <Text style={styles.modalTitle}>{t("modals.edit_title")}</Text>

            <TextInput
              style={styles.input}
              placeholder={t("modals.placeholders.category_name")}
              placeholderTextColor="#888"
              value={editCategoryName}
              onChangeText={setEditCategoryName}
            />

            <TextInput
              style={styles.input}
              placeholder={t("modals.placeholders.category_budget")}
              placeholderTextColor="#888"
              value={editCategoryBudget}
              onChangeText={setEditCategoryBudget}
              keyboardType="numeric"
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditCategoryModal(false);
                  setEditCategoryId(null);
                  setEditCategoryName("");
                  setEditCategoryBudget("");
                }}
              >
                <Text style={styles.buttonText}>{t("buttons.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  updatingCategory && { opacity: 0.6 },
                ]}
                onPress={handleUpdateCategory}
                disabled={updatingCategory}
              >
                {updatingCategory ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>{t("buttons.save")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F0E7",
    paddingBottom: 64,
    marginTop: 28,
  },
  container: { padding: 16, paddingBottom: 80 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  title: { fontSize: 28, fontWeight: "500", color: "#254236" },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E5E5",
    overflow: "hidden",
    marginBottom: 8,
    marginHorizontal: 16,
  },
  progressBarFill: { height: "100%", backgroundColor: "#254236" },
  percentText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#254236",
    marginBottom: 8,
    marginHorizontal: 16,
  },

  itemButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    elevation: 1,
    borderColor: "#EAEBDB",
    borderWidth: 1,
    height: 60,
  },
  itemText: { flex: 1, marginLeft: 12, fontSize: 16, color: "#254236" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    elevation: 1,
  },
  addText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1A2E2A",
    fontWeight: "500",
  },

  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EAEBDB",
  },
  expenseTitle: { fontSize: 16, color: "#254236", fontWeight: "600" },
  expenseMeta: { fontSize: 13, color: "#254236", opacity: 0.8, marginTop: 2 },

  tabBar: {
    position: "absolute",
    bottom: 29,
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

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#FFF",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
    gap: 10,
  },
  createButton: {
    backgroundColor: "#254236",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#A861B7",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "bold" },

  itemMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  actionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
