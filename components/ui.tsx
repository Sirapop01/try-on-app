import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet,ViewProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenProps = ViewProps & {
    edgesTop?: boolean;
    edgesBottom?: boolean;
    backgroundColor?: string;
};

export function Screen({
                           children,
                           style,
                           edgesTop = true,
                           edgesBottom = false,
                           backgroundColor = "#fff",
                           ...rest
                       }: ScreenProps) {
    return (
        <SafeAreaView
            edges={[
                ...(edgesTop ? (["top"] as const) : []),
                "left",
                "right",
                ...(edgesBottom ? (["bottom"] as const) : []),
            ]}
            style={{ flex: 1, backgroundColor }}
        >
            <View style={[{ flex: 1 }, style]} {...rest}>
                {children}
            </View>
        </SafeAreaView>
    );
}

export const SectionTitle = ({ children }: any) => (
  <Text style={{ fontSize: 16, fontWeight: "700", marginVertical: 12, marginHorizontal: 16 }}>
    {children}
  </Text>
);

export const PrimaryBtn = ({ title, onPress, disabled, style }: any) => (
  <TouchableOpacity onPress={onPress} disabled={disabled}
    style={[styles.btn, { opacity: disabled ? 0.6 : 1 }, style]}>
    <Text style={styles.btnText}>{title}</Text>
  </TouchableOpacity>
);

export const GhostBtn = ({ title, onPress, style }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.btnGhost, style]}>
    <Text style={[styles.btnText, { color: "#111827" }]}>{title}</Text>
  </TouchableOpacity>
);

export function Segmented({ value, onChange, counts }: {
  value: "catalog" | "mine";
  onChange: (v: "catalog" | "mine") => void;
  counts?: { catalog?: number; mine?: number };
}) {
  return (
    <View style={styles.segmentWrap}>
      <TouchableOpacity
        onPress={() => onChange("catalog")}
        style={[styles.segmentItem, value === "catalog" && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, value === "catalog" && styles.segmentTextActive]}>
          Catalog{counts?.catalog != null ? ` (${counts.catalog})` : ""}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange("mine")}
        style={[styles.segmentItem, value === "mine" && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, value === "mine" && styles.segmentTextActive]}>
          My Shirts{counts?.mine != null ? ` (${counts.mine})` : ""}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function ShirtCard({ img, title, subtitle, onPress }: any) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: img }} style={styles.cardImg} />
      <View style={{ padding: 12 }}>
        {!!subtitle && <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>{subtitle}</Text>}
        <Text style={{ fontWeight: "700", marginBottom: 10 }}>{title}</Text>
        <PrimaryBtn title="Try This On" onPress={onPress} />
      </View>
    </View>
  );
}

export const PlusSmall = ({ title, onPress, style }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#F59E0B",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignSelf: "flex-end",
      },
      style,
    ]}
  >
    <Ionicons name="add" size={16} color="#fff" />
    <Text style={{ color: "#fff", fontWeight: "700" }}>{title}</Text>
  </TouchableOpacity>
);

export const PlusPrimary = ({ title, onPress, style }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#F59E0B",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
      },
      style,
    ]}
  >
    <Ionicons name="add" size={18} color="#fff" />
    <Text style={{ color: "#fff", fontWeight: "700" }}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#F59E0B",
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 10, alignItems: "center",
  },
  btnGhost: {
    borderWidth: 1, borderColor: "#D1D5DB",
    paddingVertical: 12, borderRadius: 10, alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "700" },

  segmentWrap: {
    flexDirection: "row", margin: 16, backgroundColor: "#E5E7EB",
    borderRadius: 12, padding: 4,
  },
  segmentItem: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
  },
  segmentActive: { backgroundColor: "white", elevation: 1 },
  segmentText: { fontWeight: "600", color: "#6B7280" },
  segmentTextActive: { color: "#1F2937" },

  card: {
    backgroundColor: "white", borderRadius: 16, overflow: "hidden",
    marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB",
  },
  cardImg: { width: "100%", height: 220 },
});
