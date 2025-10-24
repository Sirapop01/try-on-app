// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAuthState } from "../hooks/useAuth";
import { AlertNotificationRoot } from "react-native-alert-notification";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

// กันไม่ให้ซ่อนเองอัตโนมัติ (เรียกครั้งเดียวระดับโมดูล)
SplashScreen.preventAutoHideAsync().catch(() => { /* ignore */ });

const MIN_SPLASH_MS = 1800; // ปรับช่วง 1500–2000ms ตามต้องการ

export default function RootLayout() {
  const { user, initializing } = useAuthState();
  const router = useRouter();
  const segments = useSegments();

  // เวลาเริ่มแสดง splash (ครั้งแรกที่ component ถูก mount)
  const [startedAt] = useState<number>(() => Date.now());
  const [hid, setHid] = useState(false);

  // Guard เส้นทางตามเดิม
  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, initializing, segments, router]);

  // ควบคุมการซ่อน Splash: รอ init เสร็จ + ให้ครบ MIN_SPLASH_MS
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initializing || hid) return;

      const elapsed = Date.now() - startedAt;
      const remain = Math.max(0, MIN_SPLASH_MS - elapsed);

      await new Promise((r) => setTimeout(r, remain));

      if (!cancelled) {
        try {
          await SplashScreen.hideAsync();
          setHid(true);
        } catch {
          // ignore
        }
      }
    })();

    return () => { cancelled = true; };
  }, [initializing, startedAt, hid]);

  // ครอบทั้งแอปด้วย AlertNotificationRoot
  return (
      <SafeAreaProvider>
        {/* ถ้าหน้าคุณเป็นพื้นหลังขาว ใช้ light; ถ้าดำใช้ dark ได้ */}
        <AlertNotificationRoot>
          <Slot />
        </AlertNotificationRoot>
        <StatusBar style="dark" />
      </SafeAreaProvider>

  );
}
