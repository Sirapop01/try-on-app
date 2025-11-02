// app/_layout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AlertNotificationRoot } from "react-native-alert-notification";

import { AuthProvider } from "@/context/AuthContext";
import { useAuthState } from "../hooks/useAuth";

// กันไม่ให้ Splash ซ่อนเองอัตโนมัติ (รอบเดียวที่โหลดโมดูล)
SplashScreen.preventAutoHideAsync().catch(() => {});

const MIN_SPLASH_MS = 1800; // 1500–2000 กำลังดี

export default function RootLayout() {
  return (
      <AuthProvider>
        <AlertNotificationRoot>
          <SafeAreaProvider>
            <Gate />
          </SafeAreaProvider>
        </AlertNotificationRoot>
      </AuthProvider>
  );
}

/**
 * แยก Gate ออกมาเพราะต้องใช้ hooks ที่พึ่งพา Providers ด้านบน
 * - จัดการ Splash ให้ครบเวลาขั้นต่ำ + รอ init เสร็จ
 * - Guard เส้นทางตามสถานะล็อกอิน
 */
function Gate() {
  const { user, initializing } = useAuthState();
  const router = useRouter();
  const segments = useSegments();

  // เวลาเริ่มแสดง splash
  const [startedAt] = useState<number>(() => Date.now());
  const [splashHidden, setSplashHidden] = useState(false);

  // Guard เส้นทาง: ส่งไป /login ถ้าไม่ล็อกอินและอยู่นอกกลุ่ม (auth)
  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)"); // หรือเส้นทาง home หลักของคุณ
    }
  }, [user, initializing, segments, router]);

  // คุม Splash: ให้ครบ MIN_SPLASH_MS และรอ init เสร็จ
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (splashHidden || initializing) return;

      const elapsed = Date.now() - startedAt;
      const remain = Math.max(0, MIN_SPLASH_MS - elapsed);
      await new Promise((r) => setTimeout(r, remain));

      if (!cancelled) {
        try {
          await SplashScreen.hideAsync();
          setSplashHidden(true);
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initializing, startedAt, splashHidden]);

  // พื้นหลังโทนขาว-ดำมินิมอล
  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="dark" />
        <Slot />
      </SafeAreaView>
  );
}
