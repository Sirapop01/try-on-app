// app/(tabs)/try-on.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { Screen, PrimaryBtn, GhostBtn, SectionTitle } from "../../components/ui";
import { useSelectionStore } from "../../store/selectionStore";
import { toBase64Compressed, toDataUri } from "../../services/image";
import { subscribeUserShirts, type UserShirt } from "../../services/garments";
import { useAuthState } from "../../hooks/useAuth";
import { APP_CONFIG } from "../../config/appConfig";
import { listCatalog, type CatalogListItem } from "@/services/catalog";

// ---- ตัวเลือกที่จะแสดงในแถบเสื้อ ----
type Option =
    | { key: string; source: "catalog"; imageUrl: string }
    | { key: string; source: "mine"; imageUrl: string }
    | { key: string; source: "uploaded"; base64: string };

export default function TryOnScreen() {
  const router = useRouter();
  const { user } = useAuthState();
  const { garment, setGarment, setPerson } = useSelectionStore();

  const [personB64, setPersonB64] = useState<string | undefined>();
  const [mine, setMine] = useState<UserShirt[]>([]);
  const [busy, setBusy] = useState(false);

  // ✅ Catalog จาก Firestore (โหลดเมื่อหน้าโฟกัส เพื่อความไว)
  const [catalog, setCatalog] = useState<CatalogListItem[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  const loadCatalog = async () => {
    try {
      setCatLoading(true);
      const items = await listCatalog(30);
      setCatalog(items);
    } catch {
      // เงียบไว้—แสดงลิสต์ที่มีอยู่ต่อ
    } finally {
      setCatLoading(false);
    }
  };

  // โหลด catalog ตอนเข้า/กลับมาหน้านี้
  useFocusEffect(
      React.useCallback(() => {
        loadCatalog();
      }, [])
  );

  // ✅ My Shirts: Subscribe realtime (ทน index/ serverTimestamp)
  useEffect(() => {
    if (!user?.uid) {
      setMine([]);
      return;
    }
    const unsub = subscribeUserShirts(user.uid, (rows) => setMine(rows), 100);
    return () => unsub && unsub();
  }, [user?.uid]);

  // รวม options: uploaded + mine + catalog(Firestore)
  // และ ensure ว่าเสื้อที่เลือก (garment.imageUrl/base64) ถูก "ยัด" เข้า list ถ้ายังไม่มี
  const options: Option[] = useMemo(() => {
    const out: Option[] = [];

    if (garment?.base64) {
      out.push({
        key: `up_${garment.base64.slice(0, 24)}`,
        source: "uploaded",
        base64: garment.base64,
      });
    }

    out.push(
        ...mine.map<Option>((x) => ({
          key: `m_${x.id}`,
          source: "mine",
          imageUrl: x.imageUrl,
        }))
    );

    out.push(
        ...catalog.map<Option>((x) => ({
          key: `c_${x.id}`,
          source: "catalog",
          imageUrl: x.imageUrl,
        }))
    );

    // ถ้าเลือกมาจากหน้าอื่นและยังไม่มีใน options ให้ inject เข้าไป
    if (garment?.imageUrl) {
      const exists =
          out.some((o) => o.source !== "uploaded" && (o as any).imageUrl === garment.imageUrl) ||
          false;
      if (!exists) {
        out.unshift({
          key: `sel_${Math.random().toString(36).slice(2, 8)}`,
          source: "catalog",
          imageUrl: garment.imageUrl,
        });
      }
    }

    // ย้ายตัวที่เลือกขึ้นก่อนสุดเพื่อให้เห็น selected ชัด
    const selectedKey = garment?.base64
        ? `up_${garment.base64.slice(0, 24)}`
        : garment?.imageUrl
            ? `url_${garment.imageUrl}`
            : undefined;

    const withCmp = out.map((it) => ({
      ...it,
      _cmp:
          it.source === "uploaded"
              ? `up_${(it as any).base64?.slice(0, 24)}`
              : `url_${(it as any).imageUrl}`,
    }));

    if (selectedKey) {
      withCmp.sort((a, b) => {
        if (a._cmp === selectedKey && b._cmp !== selectedKey) return -1;
        if (b._cmp === selectedKey && a._cmp !== selectedKey) return 1;
        return 0;
      });
    }

    return withCmp.map(({ _cmp, ...rest }) => rest) as Option[];
  }, [garment?.base64, garment?.imageUrl, mine, catalog]);

  // เลือกรูปคน
  const pickPerson = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted")
      return Alert.alert("Please allow photo access.");

    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any, // SDK 54
      allowsEditing: true,
      quality: 1,
    });
    if (r.canceled || !r.assets?.[0]?.uri) return;

    setBusy(true);
    try {
      const b64 = await toBase64Compressed(r.assets[0].uri, 1080);
      setPersonB64(b64);
      setPerson({ base64: b64, localUri: r.assets[0].uri });
    } catch (e: any) {
      Alert.alert("Failed to load photo", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  // แตะ thumbnail เปลี่ยนเสื้อที่เลือก
  const selectOption = (op: Option) => {
    if (op.source === "uploaded") setGarment({ base64: (op as any).base64 });
    else setGarment({ imageUrl: (op as any).imageUrl });
  };

  // ไปหน้าแสดงผล
  const run = async () => {
    if (!personB64) return Alert.alert("Please upload your photo first.");
    if (!garment?.base64 && !garment?.imageUrl)
      return Alert.alert("Please select a shirt.");
    router.push("/try-on-result");
  };

  const isSelected = (op: Option) => {
    if (op.source === "uploaded" && garment?.base64)
      return (op as any).base64 === garment.base64;
    if (op.source !== "uploaded" && garment?.imageUrl)
      return (op as any).imageUrl === garment.imageUrl;
    return false;
  };

  return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Text style={{ marginTop: 20, fontSize: 18, fontWeight: "700" }}>
            Virtual Try-On
          </Text>

          {!personB64 ? (
              <View
                  style={{
                    height: 260,
                    backgroundColor: "#E5E7EB",
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
              >
                <Text
                    style={{
                      color: "#6B7280",
                      marginBottom: 12,
                      paddingHorizontal: 16,
                      textAlign: "center",
                    }}
                >
                  Upload your photo to see how shirts look on you
                </Text>
                <PrimaryBtn title="Upload Your Photo" onPress={pickPerson} />
              </View>
          ) : (
              <View
                  style={{
                    backgroundColor: "white",
                    borderRadius: 16,
                    padding: 12,
                    elevation: 1,
                  }}
              >
                <Image
                    source={{ uri: toDataUri(personB64) }}
                    style={{ width: "100%", height: 300, borderRadius: 12 }}
                />
              </View>
          )}

          <SectionTitle>Select a Shirt</SectionTitle>

          {catLoading && catalog.length === 0 ? (
              <ActivityIndicator style={{ marginLeft: 16 }} />
          ) : null}

          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
          >
            {options.map((op) => {
              const thumbUri =
                  op.source === "uploaded"
                      ? toDataUri((op as any).base64)
                      : (op as any).imageUrl;
              const selected = isSelected(op);
              return (
                  <TouchableOpacity
                      key={op.key}
                      onPress={() => selectOption(op)}
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: 12,
                        overflow: "hidden",
                        borderWidth: 2,
                        borderColor: selected ? "#3B82F6" : "transparent",
                      }}
                  >
                    <Image
                        source={{ uri: thumbUri }}
                        style={{ width: "100%", height: "100%" }}
                    />
                  </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View
              style={{
                flexDirection: "row",
                gap: 12,
                paddingHorizontal: 16,
                marginTop: 8,
              }}
          >
            <GhostBtn title="Change Photo" onPress={pickPerson} style={{ flex: 1 }} />
            <PrimaryBtn
                title={APP_CONFIG.USE_MOCK_ML ? "View Result (Mock)" : "View Result"}
                onPress={run}
                disabled={busy || !personB64 || (!garment?.base64 && !garment?.imageUrl)}
                style={{
                  flex: 1,
                  opacity:
                      busy || !personB64 || (!garment?.base64 && !garment?.imageUrl)
                          ? 0.6
                          : 1,
                }}
            />
          </View>

          {busy && <ActivityIndicator style={{ marginTop: 8 }} />}
        </ScrollView>
      </Screen>
  );
}
