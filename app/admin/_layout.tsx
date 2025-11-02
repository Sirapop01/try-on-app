// app/admin/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRequireRole } from "@/hooks/useRequireRole";

export default function AdminLayout() {
    useRequireRole("admin");

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "#fff" },
                }}
            />
        </SafeAreaView>
    );
}
