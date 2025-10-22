// app/(tabs)/profile.tsx
import React from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView } from "react-native";
import { Screen } from "../../components/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthActions } from "../../hooks/useAuth";
import { useRouter } from "expo-router";
import { useUserProfile } from "../../hooks/useUserProfile";

type Action = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  danger?: boolean;
};

export default function Profile() {
  const router = useRouter();
  const { logout } = useAuthActions();
  const { loading, profile, refresh } = useUserProfile();

  if (loading) {
    return (
        <Screen>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        </Screen>
    );
  }

  const actions: Action[] = [
    { icon: "create-outline",  title: "Edit Profile", onPress: () => router.push("/(profile)/edit") },
    { icon: "shirt-outline",   title: "My Wardrobe",  onPress: () => router.push("/(tabs)/wardrobe") },
    { icon: "refresh-outline", title: "Refresh",      onPress: refresh },
    { icon: "log-out-outline", title: "Log Out",      onPress: logout, danger: true },
  ];

  return (
      <Screen>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* ============ Cover ============ */}
          <View
              style={{
                height: 140,
                backgroundColor: "#E5E7EB", // โทนอ่อนๆ ให้เต็มจอด้านบน
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
              }}
          />

          {/* ============ Header Card (ซ้อนทับ) ============ */}
          <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
            <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  // เงาอ่อนๆ
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Avatar */}
                {profile?.photoURL ? (
                    <Image
                        source={{ uri: profile.photoURL }}
                        style={{ width: 72, height: 72, borderRadius: 999, marginRight: 12 }}
                    />
                ) : (
                    <View
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 999,
                          marginRight: 12,
                          backgroundColor: "#93C5FD",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                    >
                      <Ionicons name="person" size={32} color="white" />
                    </View>
                )}

                {/* Name + Email + Gender badge */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800" }}>
                    {profile?.displayName ?? "User"}
                  </Text>
                  <Text style={{ color: "#6B7280", marginTop: 2 }}>
                    {profile?.email ?? "-"}
                  </Text>

                  {!!profile?.gender && (
                      <View
                          style={{
                            alignSelf: "flex-start",
                            marginTop: 8,
                            backgroundColor: "#EEF2FF",
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                          }}
                      >
                        <Text style={{ color: "#3730A3", fontWeight: "700", fontSize: 12 }}>
                          {profile.gender}
                        </Text>
                      </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* ============ Info rows (เติมพื้นที่ให้เต็มด้วยการ์ด) ============ */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  padding: 16,
                  gap: 10,
                }}
            >
              <Row icon="mail-outline" label="Email" value={profile?.email ?? "-"} />
              <Divider />
              <Row icon="person-outline" label="Display Name" value={profile?.displayName ?? "-"} />
              {!!profile?.gender && (
                  <>
                    <Divider />
                    <Row icon="male-female-outline" label="Gender" value={profile.gender} />
                  </>
              )}
            </View>
          </View>

          {/* ============ Action Grid (2 คอลัมน์) ============ */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={{ fontWeight: "700", marginBottom: 8 }}>Actions</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {actions.map((a) => (
                  <TouchableOpacity
                      key={a.title}
                      onPress={a.onPress}
                      style={{
                        width: "48%",
                        backgroundColor: "white",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: a.danger ? "#FECACA" : "#E5E7EB",
                        padding: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                  >
                    <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: a.danger ? "#FEE2E2" : "#F3F4F6",
                        }}
                    >
                      <Ionicons
                          name={a.icon}
                          size={20}
                          color={a.danger ? "#DC2626" : "#111827"}
                      />
                    </View>
                    <Text
                        style={{
                          fontWeight: "700",
                          color: a.danger ? "#DC2626" : "#111827",
                          textAlign: "center",
                        }}
                    >
                      {a.title}
                    </Text>
                  </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </Screen>
  );
}

/* ====== Sub components (ภายในไฟล์เดียว) ====== */

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
        >
          <Ionicons name={icon} size={18} color="#111827" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#6B7280", fontSize: 12 }}>{label}</Text>
          <Text style={{ fontWeight: "700" }}>{value}</Text>
        </View>
      </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#E5E7EB" }} />;
}
