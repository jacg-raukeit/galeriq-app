
import React, { useEffect, useState, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';

export default function CategoryDetailScreen({ route }) {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { category, eventId } = route.params;
  const [items, setItems] = useState([]);

  // Cargar gastos del evento y filtrar por categoría
  useEffect(() => {
    fetch(`http://192.168.1.106:8000/expenses/event/${eventId}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(all => {
        setItems(all.filter(e => e.category_id === category.id));
      })
      .catch(console.error);
  }, [eventId, category.id, user.token]);

  // Eliminar un gasto
  const handleDelete = expenseId => {
    fetch(`http://192.168.1.106:8000/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setItems(prev => prev.filter(i => i.id !== expenseId));
      })
      .catch(console.error);
  };

  // Cálculo de totales
  const totalBudget = items.reduce((sum, i) => sum + i.budget, 0);
  const totalSpent  = items.reduce((sum, i) => sum + i.spent,  0);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{category.name}</Text>
      </View>

      {/* Totales */}
      <View style={styles.totals}>
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>Presupuesto</Text>
          <Text style={styles.totalValue}>
            ${totalBudget.toLocaleString()}
          </Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={[styles.totalLabel, { textAlign: 'right' }]}>
            Gasto real
          </Text>
          <Text
            style={[
              styles.totalValue,
              { color: '#6B21A8', textAlign: 'right' },
            ]}
          >
            ${totalSpent.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Lista de ítems */}
      <FlatList
        data={items}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() =>
              navigation.navigate('EditExpense', { eventId, category, item })
            }
          >
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemBudget}>
                ${item.budget.toLocaleString()}
              </Text>
            </View>
            <Text style={[styles.itemSpent, { color: '#6B21A8' }]}>
              ${item.spent.toLocaleString()}
            </Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() =>
                navigation.navigate('EditExpense', { eventId, category, item })
              }
            >
              <Ionicons name="pencil-outline" size={20} color="#6B21A8" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="crimson" />
            </TouchableOpacity>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#6B21A8"
              style={styles.chevron}
            />
          </TouchableOpacity>
        )}
      />

      {/* Botón Agregar gasto */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          navigation.navigate('AddExpense', { eventId, category })
        }
      >
        <Text style={styles.addText}>Agregar gasto</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingBottom: 25,
    marginTop: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 12,
    color: '#111827',
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  totalCol: { flex: 1 },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
  list: { paddingHorizontal: 16 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    position: 'relative',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemBudget: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  itemSpent: {
    width: 60,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '500',
  },
  iconBtn: { padding: 8, marginLeft: 8 },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  addButton: {
    margin: 16,
    backgroundColor: '#6B21A8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
