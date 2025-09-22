import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");
const CARD_W = (width - 16 * 2 - 12) / 2;
const CARD_H = CARD_W * 1.45;

const CAT_KEYS = ["modern", "minimal", "natural", "traditional"];
const ES_LABELS = {
  modern: "Moderno",
  minimal: "Minimalista",
  natural: "Natural",
  traditional: "Tradicional"
};

const TEMPLATES = [
  {
    id: "m1",
    cat: "Moderno",
    src: require("../../assets/images/modern1.jpeg"),
  },
  {
    id: "m2",
    cat: "Moderno",
    src: require("../../assets/images/modern2.jpeg"),
  },
  {
    id: "m3",
    cat: "Moderno",
    src: require("../../assets/images/modern6.jpeg"),
  },
  {
    id: "m4",
    cat: "Moderno",
    src: require("../../assets/images/modern7.jpeg"),
  },
  {
    id: "m5",
    cat: "Moderno",
    src: require("../../assets/images/modern8.jpeg"),
  },
  {
    id: "m6",
    cat: "Moderno",
    src: require("../../assets/images/modern9.jpeg"),
  },
  {
    id: "m7",
    cat: "Moderno",
    src: require("../../assets/images/modern10.jpeg"),
  },
  {
    id: "m8",
    cat: "Moderno",
    src: require("../../assets/images/modern11.jpeg"),
  },
  {
    id: "m9",
    cat: "Moderno",
    src: require("../../assets/images/modern12.jpeg"),
  },
  {
    id: "m10",
    cat: "Moderno",
    src: require("../../assets/images/modern13.jpeg"),
  },
 
  {
    id: "mn1",
    cat: "Minimalista",
    src: require("../../assets/images/minimal1.jpeg"),
  },
  {
    id: "mn2",
    cat: "Minimalista",
    src: require("../../assets/images/minimal2.jpeg"),
  },
  {
    id: "mn3",
    cat: "Minimalista",
    src: require("../../assets/images/minimal3.jpeg"),
  },

  {
    id: "mn4",
    cat: "Minimalista",
    src: require("../../assets/images/minimal4.jpeg"),
  },
  {
    id: "mn5",
    cat: "Minimalista",
    src: require("../../assets/images/minimal5.jpeg"),
  },
  {
    id: "mn6",
    cat: "Minimalista",
    src: require("../../assets/images/minimal6.jpeg"),
  },
  {
    id: "mn7",
    cat: "Minimalista",
    src: require("../../assets/images/minimal7.jpeg"),
  },
  {
    id: "mn8",
    cat: "Minimalista",
    src: require("../../assets/images/minimal8.jpeg"),
  },
  {
    id: "mn9",
    cat: "Minimalista",
    src: require("../../assets/images/minimal9.jpeg"),
  },
  {    id: "mn10",
    cat: "Minimalista",
    src: require("../../assets/images/minimal10.jpeg"),
  },
  {id: "mn11",
    cat: "Minimalista",
    src: require("../../assets/images/minimal11.jpeg"),
  },
  {id: "mn12",
    cat: "Minimalista",
    src: require("../../assets/images/minimal12.jpeg"),
  },
  {
    id: "mn13",
    cat: "Minimalista",
    src: require("../../assets/images/minimal13.jpeg"),
  },

  {
    id: "b1",
    cat: "Natural",
    src: require("../../assets/images/natural1.jpeg"),
  },
  {
    id: "b2",
    cat: "Natural",
    src: require("../../assets/images/natural2.jpeg"),
  },
  {
    id: "b3",
    cat: "Natural",
    src: require("../../assets/images/natural3.jpeg"),
  },
  {
    id: "b4",
    cat: "Natural",
    src: require("../../assets/images/natural4.jpeg"),
  },

  {
    id: "b5",
    cat: "Natural",
    src: require("../../assets/images/natural5.jpeg"),
  },
  {
    id: "b6",
    cat: "Natural",
    src: require("../../assets/images/natural6.jpeg"),
  },
  {
    id: "b7",
    cat: "Natural",
    src: require("../../assets/images/natural7.jpeg"),
  },
  {
    id: "b8",
    cat: "Natural",
    src: require("../../assets/images/natural8.jpeg"),
  },
  {
    id: "b9",
    cat: "Natural",
    src: require("../../assets/images/natural9.jpeg"),
  },
  {
    id: "b10",
    cat: "Natural",
    src: require("../../assets/images/natural10.jpeg"),
  },







  {
    id: "t1",
    cat: "Tradicional",
    src: require("../../assets/images/trad1.jpeg"),
  },
  {
    id: "t2",
    cat: "Tradicional",
    src: require("../../assets/images/trad2.jpeg"),
  },
  {
    id: "t3",
    cat: "Tradicional",
    src: require("../../assets/images/trad3.jpeg"),
  },
  {
    id: "t4",
    cat: "Tradicional",
    src: require("../../assets/images/trad4.jpeg"),
  },

  {
    id: "t5",
    cat: "Tradicional",
    src: require("../../assets/images/trad5.jpeg"),
  },
  {
    id: "t6",
    cat: "Tradicional",
    src: require("../../assets/images/trad6.jpeg"),
  },
  {
    id: "t7",
    cat: "Tradicional",
    src: require("../../assets/images/trad7.jpeg"),
  },
  {
    id: "t8",
    cat: "Tradicional",
    src: require("../../assets/images/trad8.jpeg"),
  },
  {
    id: "t9",
    cat: "Tradicional",
    src: require("../../assets/images/trad9.jpeg"),
  },
];

export default function ExploreDesignsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { event, eventId } = route.params || {};
  const { t } = useTranslation("explore_designs");
  const [active, setActive] = useState("modern");

  const data = useMemo(
    () => TEMPLATES.filter((tpl) => tpl.cat === ES_LABELS[active]),
    [active]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F6F2FA" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.brand}>{t("title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
      >
        {CAT_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActive(key)}
            style={[styles.chip, active === key && styles.chipActive]}
          >
            <Text
             style={[styles.chipText, active === key && styles.chipTextActive]}
            >
             {t(`categories.${key}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={data}
        keyExtractor={(it) => it.id}
        numColumns={2}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate("InviteEditor", {
                template: item,
                event,
                eventId: eventId ?? event?.event_id,
              })
            }
            style={styles.card}
          >
            <Image
              source={item.src}
              style={{ width: "100%", height: "100%", borderRadius: 12 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 20, fontWeight: "800", color: "#111827" },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#EDE9FE",
    borderRadius: 999,
  },
  chipActive: { backgroundColor: "#6B21A8" },
  chipText: { color: "#6B21A8", fontWeight: "700" },
  chipTextActive: { color: "#fff" },

  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1E7FF",
  },
});
