// app/(tabs)/try-on.tsx — Minimal Try-On (no selected preview, keep selected-first lists)
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { Screen } from "../../components/ui";
import { useSelectionStore } from "../../store/selectionStore";
import { toBase64Compressed, toDataUri } from "../../services/image";
import { subscribeUserShirts, type UserShirt } from "../../services/garments";
import { useAuthState } from "../../hooks/useAuth";
import { APP_CONFIG } from "../../config/appConfig";
import { listCatalog, type CatalogListItem } from "@/services/catalog";

const C = {
  black: "#000",
  white: "#fff",
  gray900: "#111827",
  gray600: "#4B5563",
  gray500: "#9CA3AF",
  gray200: "#E5E7EB",
  gray100: "#F3F4F6",
};

function Btn({
               title,
               onPress,
               style,
               disabled,
             }: { title: string; onPress?: () => void; style?: any; disabled?: boolean }) {
  return (
      <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          style={[
            {
              backgroundColor: C.black,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.black,
              opacity: disabled ? 0.6 : 1,
            },
            style,
          ]}
      >
        <Text style={{ color: C.white, fontWeight: "700", textAlign: "center" }}>{title}</Text>
      </TouchableOpacity>
  );
}
function BtnOutline({
                      title,
                      onPress,
                      style,
                      disabled,
                    }: { title: string; onPress?: () => void; style?: any; disabled?: boolean }) {
  return (
      <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          style={[
            {
              backgroundColor: C.white,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: C.black,
              opacity: disabled ? 0.6 : 1,
            },
            style,
          ]}
      >
        <Text style={{ color: C.black, fontWeight: "700", textAlign: "center", fontSize: 12 }}>{title}</Text>
      </TouchableOpacity>
  );
}

export default function TryOnScreen() {
  const router = useRouter();
  const { user } = useAuthState();
  const { garment, setGarment, setPerson } = useSelectionStore();

  const [personB64, setPersonB64] = useState<string | undefined>();
  const [mine, setMine] = useState<UserShirt[]>([]);
  const [busy, setBusy] = useState(false);

  const [catalog, setCatalog] = useState<CatalogListItem[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  const { height: winH } = useWindowDimensions();

  // 50/50 split (บนรูปคน / ล่างลิสต์)
  const reserved = 64; // เว้นพื้นที่หัว/ระยะขอบ
  const personPanelHeight = Math.max(240, Math.floor((winH - reserved) / 2));

  // โหลดข้อมูล
  const loadCatalog = async () => {
    try {
      setCatLoading(true);
      const items = await listCatalog(60);
      setCatalog(items);
    } finally {
      setCatLoading(false);
    }
  };
  useFocusEffect(React.useCallback(() => { loadCatalog(); }, []));
  useEffect(() => {
    if (!user?.uid) { setMine([]); return; }
    const unsub = subscribeUserShirts(user.uid, (rows) => setMine(rows), 100);
    return () => unsub && unsub();
  }, [user?.uid]);

  // รูปคน
  const pickPerson = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") return Alert.alert("Please allow photo access.");
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] as any, allowsEditing: true, quality: 1 });
    if (r.canceled || !r.assets?.[0]?.uri) return;

    setBusy(true);
    try {
      const b64 = await toBase64Compressed(r.assets[0].uri, 1280);
      setPersonB64(b64);
      setPerson({ base64: b64, localUri: r.assets[0].uri });
    } catch (e: any) {
      Alert.alert("Failed to load photo", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };
  const clearPerson = () => setPersonB64(undefined);

  // เลือกเสื้อ + scroll ไปต้นลิสต์
  const refMy = useRef<ScrollView>(null);
  const refCat = useRef<ScrollView>(null);
  const selectFromMine = (it: UserShirt) => {
    setGarment({ imageUrl: it.imageUrl });
    requestAnimationFrame(() => refMy.current?.scrollTo({ x: 0, y: 0, animated: true }));
  };
  const selectFromCatalog = (it: CatalogListItem) => {
    setGarment({ imageUrl: it.imageUrl });
    requestAnimationFrame(() => refCat.current?.scrollTo({ x: 0, y: 0, animated: true }));
  };

  // จัดลำดับให้ไอเท็มที่เลือกอยู่หน้าสุด
  const myOrdered = useMemo(() => {
    if (!garment?.imageUrl) return mine;
    const idx = mine.findIndex((x) => x.imageUrl === garment.imageUrl);
    if (idx < 0) return mine;
    const sel = mine[idx];
    return [sel, ...mine.slice(0, idx), ...mine.slice(idx + 1)];
  }, [mine, garment?.imageUrl]);

  const catOrdered = useMemo(() => {
    if (!garment?.imageUrl) return catalog;
    const idx = catalog.findIndex((x) => x.imageUrl === garment.imageUrl);
    if (idx < 0) return catalog;
    const sel = catalog[idx];
    return [sel, ...catalog.slice(0, idx), ...catalog.slice(idx + 1)];
  }, [catalog, garment?.imageUrl]);

  const isSelectedImageUrl = (url?: string) => url && garment?.imageUrl && url === garment.imageUrl;

  // ไปหน้าผลลัพธ์
  const run = async () => {
    if (!personB64) return Alert.alert("Please upload your photo first.");
    if (!garment?.base64 && !garment?.imageUrl) return Alert.alert("Please select a shirt.");
    router.push("/try-on-result");
  };

  const ListBar = ({ title, count }: { title: string; count?: number }) => (
      <View
          style={{
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
          }}
      >
        <Text style={{ fontSize: 14, fontWeight: "800", color: C.black }}>{title}</Text>
        <Text style={{ color: C.gray500 }}>{(count ?? 0).toString()}</Text>
      </View>
  );

  return (
      <Screen>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* ส่วนบน: รูปคน (50%) */}
          <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.black }}>Virtual Try-On</Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View
                style={{
                  position: "relative",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.gray200,
                  backgroundColor: personB64 ? C.white : C.gray100,
                  overflow: "hidden",
                  minHeight: personPanelHeight,
                  alignItems: personB64 ? "stretch" : "center",
                  justifyContent: personB64 ? "flex-start" : "center",
                }}
            >
              {!personB64 ? (
                  <>
                    <Text style={{ color: C.gray500, marginBottom: 12, paddingHorizontal: 16, textAlign: "center" }}>
                      Upload your photo to see how shirts look on you
                    </Text>
                    <Btn title="Upload Your Photo" onPress={pickPerson} style={{ paddingHorizontal: 16 }} />
                  </>
              ) : (
                  <Image source={{ uri: toDataUri(personB64) }} style={{ width: "100%", height: personPanelHeight }} resizeMode="cover" />
              )}

              {/* ปุ่มย่อยด้านล่างกรอบ */}
              <View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(255,255,255,0.96)",
                    borderTopWidth: 1,
                    borderTopColor: C.gray200,
                    padding: 10,
                    flexDirection: "row",
                    gap: 8,
                  }}
              >
                <BtnOutline title={personB64 ? "Change Photo" : "Upload"} onPress={pickPerson} style={{ flex: 1 }} />
                {personB64 ? <BtnOutline title="Remove" onPress={clearPerson} style={{ flex: 0, paddingHorizontal: 16 }} /> : null}
              </View>
            </View>
          </View>

          {/* ส่วนล่าง: ลิสต์เสื้อ */}
          <ListBar title="My Shirts" count={mine.length} />
          {mine.length === 0 ? (
              <View
                  style={{
                    marginHorizontal: 16,
                    marginTop: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.gray200,
                    padding: 12,
                    backgroundColor: C.white,
                  }}
              >
                <Text style={{ color: C.gray500, textAlign: "center" }}>
                  No shirts yet — add some in Home &gt; Your Collection
                </Text>
              </View>
          ) : (
              <ScrollView
                  ref={refMy}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                {myOrdered.map((it) => {
                  const selected = isSelectedImageUrl(it.imageUrl);
                  return (
                      <TouchableOpacity
                          key={it.id}
                          onPress={() => selectFromMine(it)}
                          style={{
                            width: 96,
                            height: 96,
                            borderRadius: 12,
                            overflow: "hidden",
                            borderWidth: 2,
                            borderColor: selected ? C.black : "transparent",
                            backgroundColor: C.white,
                          }}
                      >
                        <Image source={{ uri: it.imageUrl }} style={{ width: "100%", height: "100%" }} />
                      </TouchableOpacity>
                  );
                })}
              </ScrollView>
          )}

          <ListBar title="Catalog" count={catalog.length} />
          {catLoading && catalog.length === 0 ? (
              <ActivityIndicator style={{ marginLeft: 16, marginTop: 8 }} />
          ) : catalog.length === 0 ? (
              <View
                  style={{
                    marginHorizontal: 16,
                    marginTop: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.gray200,
                    padding: 12,
                    backgroundColor: C.white,
                  }}
              >
                <Text style={{ color: C.gray500, textAlign: "center" }}>No items in catalog</Text>
              </View>
          ) : (
              <ScrollView
                  ref={refCat}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                {catOrdered.map((it) => {
                  const selected = isSelectedImageUrl(it.imageUrl);
                  return (
                      <TouchableOpacity
                          key={it.id}
                          onPress={() => selectFromCatalog(it)}
                          style={{
                            width: 96,
                            height: 96,
                            borderRadius: 12,
                            overflow: "hidden",
                            borderWidth: 2,
                            borderColor: selected ? C.black : "transparent",
                            backgroundColor: C.white,
                          }}
                      >
                        <Image source={{ uri: it.imageUrl }} style={{ width: "100%", height: "100%" }} />
                      </TouchableOpacity>
                  );
                })}
              </ScrollView>
          )}

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 6 }}>
            <BtnOutline title="Change Photo" onPress={pickPerson} style={{ flex: 1 }} />
            <Btn
                title={APP_CONFIG.USE_MOCK_ML ? "View Result (Mock)" : "View Result"}
                onPress={run}
                disabled={busy || !personB64 || (!garment?.base64 && !garment?.imageUrl)}
                style={{ flex: 1 }}
            />
          </View>

          {busy && <ActivityIndicator style={{ marginTop: 8 }} />}
        </ScrollView>
      </Screen>
  );
}
