import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Screen } from "../../components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useAuthActions, useAuthState } from "../../hooks/useAuth";

const Row = ({ icon, title, danger, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={{
    backgroundColor: "white", borderRadius: 12, flexDirection: "row",
    alignItems: "center", padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB"
  }}>
    <Ionicons name={icon} size={20} color={danger ? "#DC2626" : "#111827"} />
    <Text style={{ marginLeft: 12, fontWeight: "600", color: danger ? "#DC2626" : "#111827" }}>{title}</Text>
  </TouchableOpacity>
);

export default function Profile() {
  const { user } = useAuthState();
  const { logout } = useAuthActions();

  return (
    <Screen>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>Profile</Text>

        <View style={{
          backgroundColor: "white", borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 16
        }}>
          <View style={{
            width: 56, height: 56, borderRadius: 999, backgroundColor: "#93C5FD",
            alignItems: "center", justifyContent: "center", marginBottom: 10
          }}>
            <Ionicons name="person" size={28} color="white" />
          </View>
          <Text style={{ fontWeight: "700" }}>{user?.displayName ?? "Alex Johnson"}</Text>
          <Text style={{ color: "#6B7280" }}>{user?.email ?? "a@gmail.com"}</Text>
        </View>

        <Row icon="create-outline" title="Edit Profile" onPress={() => {}} />
        <Row icon="shirt-outline" title="My Wardrobe" onPress={() => {}} />
        <Row icon="settings-outline" title="Settings" onPress={() => {}} />
        <Row icon="log-out-outline" title="Log Out" danger onPress={logout} />
      </View>
    </Screen>
  );
}
