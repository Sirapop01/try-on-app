// app/(tabs)/profile.tsx — Minimal B/W Profile
import React from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView } from "react-native";
import { Screen } from "../../components/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthActions } from "../../hooks/useAuth";
import { useRouter } from "expo-router";
import { useUserProfile } from "../../hooks/useUserProfile";
import { ALERT_TYPE, Dialog, Toast } from "react-native-alert-notification";
import { useAuth } from "@/context/AuthContext";

const C = {
    black: "#000",
    white: "#fff",
    gray900: "#111827",
    gray500: "#9CA3AF",
    gray200: "#E5E7EB",
    gray100: "#F3F4F6",
};

type Action = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    onPress: () => void;
    danger?: boolean;
};

export default function Profile() {
    const { user } = useAuth();
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

    const onRefresh = async () => {
        await refresh();
        Toast.show({ type: ALERT_TYPE.SUCCESS, title: "รีเฟรชแล้ว", textBody: "อัปเดตข้อมูลโปรไฟล์ล่าสุด" });
    };

    const onLogout = () => {
        Dialog.show({
            type: ALERT_TYPE.DANGER,
            title: "ออกจากระบบ?",
            textBody: "ยืนยันการออกจากระบบตอนนี้",
            button: "ออกจากระบบ",
            closeOnOverlayTap: true,
            autoClose: 0,
            onPressButton: async () => {
                try {
                    Dialog.hide();
                    await logout();
                    Toast.show({ type: ALERT_TYPE.SUCCESS, title: "ออกจากระบบแล้ว" });
                } catch (e: any) {
                    Toast.show({ type: ALERT_TYPE.DANGER, title: "ออกจากระบบไม่สำเร็จ", textBody: e?.message ?? "Unknown error" });
                }
            },
        });
    };

    const actions: Action[] = [
        { icon: "create-outline", title: "Edit Profile", onPress: () => router.push("/(profile)/edit") },
        { icon: "shirt-outline", title: "My Wardrobe", onPress: () => router.push("/(tabs)/wardrobe") },
        { icon: "refresh-outline", title: "Refresh", onPress: onRefresh },
        { icon: "log-out-outline", title: "Log Out", onPress: onLogout, danger: true },
    ];

    return (
        <Screen>
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Cover (grayscale) */}
                <View
                    style={{
                        height: 148,
                        backgroundColor: C.gray100,
                        borderBottomLeftRadius: 24,
                        borderBottomRightRadius: 24,
                    }}
                />

                {/* Header Card */}
                <View style={{ paddingHorizontal: 16, marginTop: -40 }}>
                    <View
                        style={{
                            backgroundColor: C.white,
                            borderRadius: 18,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: C.gray200,
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            {/* Avatar */}
                            {profile?.photoURL ? (
                                <Image source={{ uri: profile.photoURL }} style={{ width: 76, height: 76, borderRadius: 999, marginRight: 12 }} />
                            ) : (
                                <View
                                    style={{
                                        width: 76,
                                        height: 76,
                                        borderRadius: 999,
                                        marginRight: 12,
                                        backgroundColor: C.gray100,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Ionicons name="person" size={34} color={C.gray900} />
                                </View>
                            )}

                            {/* Name + Email */}
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 19, fontWeight: "800", color: C.black }}>{profile?.displayName ?? "User"}</Text>
                                <Text style={{ color: C.gray500, marginTop: 2 }}>{profile?.email ?? "-"}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Info Card */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <View
                        style={{
                            backgroundColor: C.white,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: C.gray200,
                            padding: 16,
                            gap: 10,
                        }}
                    >
                        <Row icon="mail-outline" label="Email" value={profile?.email ?? "-"} />
                        <Divider />
                        <Row icon="person-outline" label="Display Name" value={profile?.displayName ?? "-"} />
                    </View>
                </View>

                {/* Actions */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <Text style={{ fontWeight: "700", marginBottom: 8, color: C.black }}>Actions</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                        {actions.map((a) => (
                            <TouchableOpacity
                                key={a.title}
                                onPress={a.onPress}
                                style={{
                                    width: "48%",
                                    backgroundColor: C.white,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: C.black,
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
                                        backgroundColor: C.white,
                                        borderWidth: 1,
                                        borderColor: C.black,
                                    }}
                                >
                                    <Ionicons name={a.icon} size={20} color={C.black} />
                                </View>
                                <Text style={{ fontWeight: "700", color: C.black, textAlign: "center" }}>{a.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {user?.role === "admin" && (
                        <TouchableOpacity
                            onPress={() => router.push("/admin/catalog")}
                            style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 10,
                                backgroundColor: C.white,
                                borderWidth: 1,
                                borderColor: C.black,
                            }}
                        >
                            <Text style={{ color: C.black, fontWeight: "700", textAlign: "center" }}>Admin Console</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </Screen>
    );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
    const Cg = { gray500: "#9CA3AF", black: "#000" };
    return (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                    borderWidth: 1,
                    borderColor: "#000",
                }}
            >
                <Ionicons name={icon} size={18} color={Cg.black} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: Cg.gray500, fontSize: 12 }}>{label}</Text>
                <Text style={{ fontWeight: "700", color: Cg.black }}>{value}</Text>
            </View>
        </View>
    );
}

function Divider() {
    return <View style={{ height: 1, backgroundColor: "#E5E7EB" }} />;
}
