// app/preview.tsx
import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function PreviewScreen() {
    const router = useRouter();
    const { top } = useSafeAreaInsets(); // ✅ ใช้ค่า safe area
    const params = useLocalSearchParams<{ uri?: string; date?: string }>();
    const uri = params?.uri ? decodeURIComponent(String(params.uri)) : "";
    const date = params?.date ? String(params.date) : "";

    const onShare = async () => {
        try {
            await Sharing.shareAsync(uri);
        } catch (e) {}
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            {/* ✅ Top bar ปรับ paddingTop ให้ไม่ชนขอบ */}
            <View
                style={{
                    position: "absolute",
                    top: top + 6, // เพิ่มระยะห่างจาก safe area ด้านบน
                    left: 0,
                    right: 0,
                    height: 56,
                    backgroundColor: "rgba(0,0,0,0.4)",
                    zIndex: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 12,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.push("/(tabs)/wardrobe")}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "rgba(255,255,255,0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>

                <Text
                    numberOfLines={1}
                    style={{
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: 14,
                        maxWidth: "60%",
                    }}
                >
                    {date || "Preview"}
                </Text>

                <TouchableOpacity
                    onPress={onShare}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "rgba(255,255,255,0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Ionicons name="share-social-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* ✅ ภาพเต็มจอ */}
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                {!!uri ? (
                    <Image
                        source={{ uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="contain"
                    />
                ) : (
                    <Text style={{ color: "#fff" }}>No image</Text>
                )}
            </View>
        </SafeAreaView>
    );
}
