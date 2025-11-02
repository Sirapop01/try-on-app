// app/admin/_layout.tsx — Edge-to-edge on top, safe only at bottom
import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRequireRole } from "@/hooks/useRequireRole";

export default function AdminLayout() {
    useRequireRole("admin");

    return (
        <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: "#fff" }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "#fff" },
                    statusBarStyle: "dark",
                    statusBarTranslucent: true, // ✅ ให้หัววิ่งใต้ status bar / ติ่งกล้อง
                }}
            />
        </SafeAreaView>
    );
}
