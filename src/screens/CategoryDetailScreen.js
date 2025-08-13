// src/screens/CategoryDetailScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function CategoryDetailScreen({ route, navigation }) {
  const { category, eventId } = route.params;
  const [items, setItems] = useState([]);

  
  useEffect(() => {
   
    setItems([
      { id: 'a1', name: 'Arreglo de flores', budget: 1200, spent: 1000 },
      { id: 'a2', name: 'Iluminación',        budget: 600,  spent: 800 },
      { id: 'a3', name: 'Centros de mesa',     budget: 800,  spent: 600 },
      { id: 'a4', name: 'Telas',               budget: 400,  spent:   0 },
    ]);
  }, []);

  const totalBudget = items.reduce((s, i) => s + i.budget, 0);
  const totalSpent  = items.reduce((s, i) => s + i.spent,  0);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header con back */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>{category.name}</Text>
      </View>

      {/* Totales */}
      <View style={styles.totals}>
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>Presupuesto</Text>
          <Text style={styles.totalValue}>${totalBudget.toLocaleString()}</Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={[styles.totalLabel, { textAlign: 'right' }]}>
            Gasto real
          </Text>
          <Text style={[styles.totalValue, { color: '#6B21A8', textAlign: 'right' }]}>
            ${totalSpent.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Lista de ítems */}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemBudget}>${item.budget.toLocaleString()}</Text>
            </View>
            <Text style={[styles.itemSpent, { color: '#6B21A8' }]}>
              ${item.spent.toLocaleString()}
            </Text>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="pencil-outline" size={20} color="#6B21A8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="list-outline" size={20} color="#6B21A8" />
            </TouchableOpacity>
          </View>
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
  screen: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  title: { fontSize: 24, fontWeight: '600', marginLeft: 12 },
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
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemBudget: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  itemSpent: { width: 60, textAlign: 'right', fontSize: 14, fontWeight: '500' },
  iconBtn: { padding: 8, marginLeft: 8 },
  addButton: {
    margin: 16,
    backgroundColor: '#6B21A8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
