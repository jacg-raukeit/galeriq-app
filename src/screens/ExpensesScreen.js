import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { TouchableOpacity } from 'react-native';

export default function ExpensesScreen({ route }) {
  const { eventId } = route.params;
  const [categories, setCategories] = useState([]);
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetch(`http://143.198.138.35:8000/expenses/event/${eventId}/group-by-category`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        console.log('DATOS RECIBIDOS DEL API:', JSON.stringify(data, null, 2));
        setCategories(
          data.map((c, index) => ({
            id: index,
            name: c.category,
            spent: c.total,
            budget: 0,
          }))
        );
      })
      .catch((err) => console.error('Error al cargar gastos:', err));
  }, [eventId, user.token]);

  const totalSpent = categories.reduce((s, c) => {
    const spentAsNumber = Number(String(c.spent || 0).replace(/\./g, ''));
    return s + spentAsNumber;
  }, 0);
  
  const RADIUS = 60;
  const CIRCUM = 2 * Math.PI * RADIUS;
  const fillPercent = 0; 

  const formatCurrency = (value) => {
    if (value === null || value === undefined) {
      return '$0';
    }
    const stringValue = String(value).replace(/\./g, '');
    const number = Number(stringValue);
    if (isNaN(number)) {
      return '$0';
    }
    const formatted = new Intl.NumberFormat('es-MX').format(number);
    return `$${formatted}`;
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Informacion de gestos</Text>

      {/* — Donut Chart — */}
      <View style={styles.chartWrapper}>
        <Svg width={RADIUS * 2 + 20} height={RADIUS * 2 + 20}>
          <Circle
            cx={RADIUS + 10}
            cy={RADIUS + 10}
            r={RADIUS}
            stroke="#E5D4F0"
            strokeWidth={20}
            fill="none"
          />
          <Circle
            cx={RADIUS + 10}
            cy={RADIUS + 10}
            r={RADIUS}
            stroke="#6B21A8"
            strokeWidth={20}
            fill="none"
            strokeDasharray={`${CIRCUM * fillPercent} ${CIRCUM}`}
            strokeDashoffset={CIRCUM * 0.25}
            rotation="-90"
            origin={`${RADIUS + 10}, ${RADIUS + 10}`}
          />
        </Svg>
        <View style={styles.centerLabel}>
         <Text style={styles.amountText}>{formatCurrency(totalSpent)}</Text>
          <Text style={styles.subText}>Gasto real</Text>
        </View>
      </View>

      {/* — Leyenda — */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#E5D4F0' }]} />
          <Text style={styles.legendText}>Gastos</Text>
        </View>
      </View>

      {/* — Lista de categorías — */}
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={styles.row}
          onPress={() =>
            navigation.navigate('CategoryDetail', {
              category: cat,
              eventId,
            })
          }
        >
          <View style={styles.rowHeader}>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={styles.catSpent}>{formatCurrency(cat.spent)}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#6B21A8"
            style={{ position: 'absolute', right: 0, top: 16 }}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');
const CARD_PADDING = 16;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    marginTop: 19,
  },
  container: {
    padding: CARD_PADDING,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 24,
  },
  chartWrapper: {
    width: width - CARD_PADDING * 2,
    height: (width - CARD_PADDING * 2) * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  centerLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#4B5563',
  },
  row: {
    width: '100%',
    marginBottom: 20,
    paddingVertical: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  catSpent: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
});