// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,                  // 👈 ซ่อน header ที่เกะกะ
                tabBarActiveTintColor: "#2563EB",
                tabBarInactiveTintColor: "#6B7280",
                tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6 },
                tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="try-on"
                options={{
                    title: "Try-On",
                    tabBarIcon: ({ color, size }) => <Ionicons name="camera-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="wardrobe"
                options={{
                    title: "Wardrobe",
                    tabBarIcon: ({ color, size }) => <Ionicons name="shirt-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
