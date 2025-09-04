// src/screens/BudgetControlScreen.js
import React, { useEffect, useMemo, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { AuthContext } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_URL = 'http://143.198.138.35:8000';

const EVENT_URL = (eventId) => `${API_URL}/events/${eventId}`;
const TOTALS_URL = (eventId) => `${API_URL}/checklists/event/${eventId}/totals`;
const TOTALS_BY_CATEGORY_URL = (eventId) => `${API_URL}/checklists/event/${eventId}/totals-by-category`;
const CATS_URL = (eventId) => `${API_URL}/category-checklists/event/${eventId}`;

// Colores
const C_BUDGET = '#D6C7FF';  
const C_REAL   = '#5F3EE6';  
const C_TEXT   = '#0B1220';
const C_MUTED  = '#6B7280';
const CARD_BG  = '#FFFFFF';
const SCREEN_BG = '#F6F2FB';

const { width } = Dimensions.get('window');
const CARD_W = Math.min(420, width - 32);

const money = (n = 0) => {
  const v = Math.round(Number(n) || 0);
  return '$' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const normalize = (s) =>
  String(s || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

function parseBudget(val) {
  if (val == null) return 0;
  const s = String(val).trim();
  if (!s) return 0;
  const normalized = s.replace(/\./g, '').replace(/,/g, '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export default function BudgetControlScreen({ route, navigation }) {
  const eventId = route?.params?.eventId ?? 3;
  const eventDate = route?.params?.eventDate ?? null;
  const { user } = useContext(AuthContext);
  const token = user?.token || user?.accessToken || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [eventBudget, setEventBudget] = useState(0);
  const [totals, setTotals] = useState({ total_budget: 0, total_real_price: 0 });

  // filas por categoría
  const [rows, setRows] = useState([]);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, totalsRes, byCatRes, catsRes] = await Promise.all([
        fetch(EVENT_URL(eventId), { headers }),
        fetch(TOTALS_URL(eventId), { headers }),
        fetch(TOTALS_BY_CATEGORY_URL(eventId), { headers }),
        fetch(CATS_URL(eventId), { headers }),
      ]);

      if (evRes.ok) {
        const ev = await evRes.json();
        setEventBudget(parseBudget(ev?.budget));
      } else {
        setEventBudget(0);
      }

      // Totales globales
      if (!totalsRes.ok) throw new Error('No se pudo obtener el total');
      if (!byCatRes.ok) throw new Error('No se pudieron obtener las categorías');

      const totalsJson = await totalsRes.json();
      const byCatJson = await byCatRes.json();

      setTotals({
        total_budget: Number(totalsJson?.total_budget || 0),
        total_real_price: Number(totalsJson?.total_real_price || 0),
      });

      let catBudgetMap = new Map();
      if (catsRes.ok) {
        const cats = await catsRes.json();
        (Array.isArray(cats) ? cats : []).forEach((c) => {
          catBudgetMap.set(normalize(c.name), Number(c.budget_category || 0));
        });
      }

      const list = Array.isArray(byCatJson) ? byCatJson : [];
      const merged = list.map((it) => {
        const name = String(it.category_name ?? '—');
        const realSpent = Number(it.total_real_price || 0) > 0
          ? Number(it.total_real_price)
          : Number(it.total_budget || 0);
        const catBudget = catBudgetMap.get(normalize(name)) ?? 0;
        return { name, realSpent, catBudget };
      });

      setRows(merged);
    } catch (e) {
      console.log('BudgetControlScreen error:', e?.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  // --- Dona ---
  const size = 220;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const CIRC = 2 * Math.PI * r;

  const budgetBase = eventBudget > 0 ? eventBudget : totals.total_budget;
  const spentTotal = totals.total_real_price > 0 ? totals.total_real_price : totals.total_budget;
  const pct = useMemo(() => {
    const real = Math.max(0, Math.min(spentTotal, budgetBase));
    return budgetBase === 0 ? 0 : real / budgetBase;
  }, [budgetBase, spentTotal]);

  const dashSpent = `${CIRC * pct} ${CIRC * (1 - pct)}`;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: SCREEN_BG }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          <Text style={styles.brand}>Galeriq</Text>
          <Text style={styles.title}>Control de gastos</Text>

          {/* Dona */}
          <View style={styles.donutWrap}>
            <Svg width={size} height={size}>
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={C_BUDGET}
                strokeWidth={stroke}
                fill="none"
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="round"
              />
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={C_REAL}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={dashSpent}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.center}>
              <Text style={styles.centerAmount}>{money(eventBudget || totals.total_budget)}</Text>
              <Text style={styles.centerLabel}>Presupuesto total</Text>
            </View>
          </View>

          {/* Leyenda */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: C_BUDGET }]} />
              <Text style={styles.legendText}>Presupuesto</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: C_REAL }]} />
              <Text style={styles.legendText}>Gasto real</Text>
            </View>
          </View>

          <View style={{ height: 8 }} />

          {loading ? (
            <ActivityIndicator />
          ) : (
            rows.map((row) => {
              const bCat = Number(row.catBudget || 0);
              const gSpent = Number(row.realSpent || 0);
              const p = bCat > 0 ? Math.min(1, gSpent / bCat) : 0;

              return (
  <View key={row.name} style={styles.categoryBlock}>
    <View style={styles.categoryHeader}>
      <Text style={styles.categoryName}>{row.name}</Text>

      {/* Derecha: etiqueta + monto de gasto real */}
      <View style={styles.rightBox}>
        <Text style={styles.rightCaption}>Gasto real</Text>
        <Text style={styles.categoryRight}>{money(gSpent)}</Text>
      </View>
    </View>

    {/* Barra Gasto real (arriba) */}
    <View style={styles.barTrack}>
      <View style={[styles.barFillReal, { width: `${p * 100}%` }]} />
    </View>

    {/* Barra Presupuesto (abajo) */}
    <View style={[styles.barTrack, { marginTop: 8 }]}>
      <View style={[styles.barFillBudget]} />
    </View>

    {/* Abajo derecha: etiqueta + monto de presupuesto */}
    <View style={styles.bottomRightWrap}>
      <Text style={styles.rightCaption}>Presupuesto</Text>
      <Text style={styles.bottomRight}>{money(bCat)}</Text>
    </View>
  </View>
);
            })
          )}
        </View>
      </ScrollView>

          {/* Tab bar inferior */}
<View style={styles.tabBar}>
  <TouchableOpacity
    style={styles.tabButton}
    onPress={() =>
      navigation.replace('PlanningHome', { initialTab: 'checklist', eventId, eventDate })
    }
  >
    <Ionicons name="list-outline" size={20} color={"#254236"} />
    <Text style={styles.tabText}>Checklist</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.tabButton, styles.tabActive]}
    onPress={() => {}}
    disabled
  >
    <Ionicons name="cash-outline" size={20} color={"#FFF"} />
    <Text style={[styles.tabText, styles.tabTextActive]}>Gastos</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.tabButton}
    onPress={() => navigation.replace('Agenda', { eventId, eventDate })}
  >
    <Ionicons name="calendar-outline" size={20} color={"#254236"} />
    <Text style={styles.tabText}>Agenda</Text>
  </TouchableOpacity>
</View>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { alignItems: 'center', padding: 16, paddingTop: 33, paddingBottom: 130 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  brand: { textAlign: 'center', fontSize: 20, color: C_TEXT, opacity: 0.9, fontWeight: '600', marginBottom: 4 },
  title: { textAlign: 'center', fontSize: 24, color: C_TEXT, fontWeight: '800', marginBottom: 6 },

  donutWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 6 },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerAmount: { fontSize: 22, fontWeight: '800', color: C_TEXT },
  centerLabel: { marginTop: 4, fontSize: 14, color: C_MUTED, fontWeight: '600' },

  legendRow: { marginTop: 8, marginBottom: 2, flexDirection: 'row', justifyContent: 'center', gap: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 10 },
  legendText: { color: C_TEXT, fontWeight: '600' },

  categoryBlock: { marginTop: 18, marginBottom: 2, position: 'relative' },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  categoryName: { color: C_TEXT, fontSize: 18, fontWeight: '700' },
  categoryRight: { color: C_TEXT, fontWeight: '700' },

  barTrack: { height: 14, borderRadius: 10, backgroundColor: '#EFE8FF', overflow: 'hidden' },
  barFillBudget: { position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, backgroundColor: C_BUDGET, borderRadius: 10 },
  barFillReal: { height: '100%', backgroundColor: C_REAL, borderRadius: 10 },

  bottomRight: { alignSelf: 'flex-end', marginTop: 6, color: C_TEXT, fontWeight: '700' },



  rightBox: { alignItems: 'flex-end' },
rightCaption: { color: C_MUTED, fontSize: 12, fontWeight: '600' },
bottomRightWrap: { alignSelf: 'flex-end', marginTop: 6, alignItems: 'flex-end' },


tabBar: {
  position: 'absolute',
  bottom: 12,
  left: 16,
  right: 16,
  flexDirection: 'row',
  backgroundColor: '#FFF',
  borderRadius: 12,
  padding: 8,
  borderColor: '#EAEBDB',
  borderWidth: 1,
  elevation: 2,
  marginBottom: 24,
},
tabButton: {
  flex: 1,
  height: 44,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: 8,
},
tabActive: { backgroundColor: '#254236' },
tabText: { marginLeft: 6, color: '#254236', fontWeight: '600' },
tabTextActive: { color: '#FFF' },
});
