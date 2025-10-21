import React from "react";
import { View, Text } from "react-native";
import { Screen } from "../../components/ui";

export default function Wardrobe() {
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>My Wardrobe</Text>
        <Text style={{ color: "#6B7280", textAlign: "center" }}>
          No saved items yet. Try on some shirts and save your favorites!
        </Text>
      </View>
    </Screen>
  );
}
