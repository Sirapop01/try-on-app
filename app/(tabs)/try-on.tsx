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
import { Screen, PrimaryBtn, GhostBtn, SectionTitle } from "../../components/ui";
import { useSelectionStore } from "../../store/selectionStore";
import { toBase64Compressed, toDataUri } from "../../services/image";
import { listUserShirts, type UserShirt } from "../../services/garments";
import { useAuthState } from "../../hooks/useAuth";
import { mockTryOn } from "../../services/mockMl";

// 🔹 เพิ่ม import service จริง
import { tryOn } from "../../services/ml";
import { APP_CONFIG } from "../../config/appConfig";

// ======= ตัวอย่าง Catalog (แทนด้วยของจริงได้ภายหลัง) =======
export const catalogThumbs = [
  { id: "t3", imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80" },
  { id: "t5", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80" },
  { id: "t6", imageUrl: "https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=800&q=80" },
];

// เสิร์ฟให้ thumbnail ใช้งานง่าย + ปลอดภัยเรื่อง type
type Option =
    | { key: string; source: "catalog"; imageUrl: string }
    | { key: string; source: "mine"; imageUrl: string }
    | { key: string; source: "uploaded"; base64: string };

export default function TryOnScreen() {
  const { user } = useAuthState();
  const { garment, setGarment, setPerson } = useSelectionStore();

  const [personB64, setPersonB64] = useState<string | undefined>();
  const [mine, setMine] = useState<UserShirt[]>([]);
  const [busy, setBusy] = useState(false);
  const [resultB64, setResultB64] = useState<string | null>(null);

  // โหลดเสื้อของผู้ใช้จาก Firestore (My Shirts)
  useEffect(() => {
    (async () => {
      if (!user) return;
      const items = await listUserShirts(user.uid, 50);
      setMine(items);
    })();
  }, [user?.uid]);

  // รวม: uploaded (base64 สดจาก store) + mine + catalog และ "ย้ายตัวที่เลือกขึ้นก่อนสุด"
  const options: Option[] = useMemo(() => {
    const out: Option[] = [];
    if (garment?.base64) {
      out.push({ key: `up_${garment.base64.slice(0, 24)}`, source: "uploaded", base64: garment.base64 });
    }
    out.push(
        ...mine.map<Option>((x) => ({ key: `m_${x.id}`, source: "mine" as const, imageUrl: x.imageUrl })),
        ...catalogThumbs.map<Option>((x) => ({ key: `c_${x.id}`, source: "catalog" as const, imageUrl: x.imageUrl })),
    );

    const selectedKey =
        garment?.base64 ? `up_${garment.base64.slice(0, 24)}` :
            garment?.imageUrl ? `url_${garment.imageUrl}` : undefined;

    const withCmp = out.map((it) => ({
      ...it,
      _cmp: it.source === "uploaded" ? `up_${(it as any).base64?.slice(0, 24)}` : `url_${(it as any).imageUrl}`,
    }));

    if (selectedKey) {
      withCmp.sort((a, b) => (a._cmp === selectedKey ? -1 : b._cmp === selectedKey ? 1 : 0));
    }
    return withCmp.map(({ _cmp, ...rest }) => rest) as Option[];
  }, [garment?.base64, garment?.imageUrl, mine]);

  // เลือกรูปคน
  const pickPerson = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") return Alert.alert("Please allow photo access.");
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    const b64 = await toBase64Compressed(r.assets[0].uri, 1080);
    setPersonB64(b64);
    setPerson({ base64: b64, localUri: r.assets[0].uri });
  };

  // แตะ thumbnail เพื่อเปลี่ยนเสื้อที่เลือก
  const selectOption = (op: Option) => {
    if (op.source === "uploaded") setGarment({ base64: (op as any).base64 });
    else setGarment({ imageUrl: (op as any).imageUrl });
    setResultB64(null); // เปลี่ยนตัวเลือกให้ล้างผลเก่า
  };

  // 🔹 ปุ่ม View Result — คงโครงเดิม แต่สวิตช์ไปยิง BE เมื่อ USE_MOCK_ML=false
  const run = async () => {
    if (!personB64) return Alert.alert("Please upload your photo first.");
    if (!garment?.base64 && !garment?.imageUrl) return Alert.alert("Please select a shirt.");

    try {
      setBusy(true);

      if (APP_CONFIG.USE_MOCK_ML) {
        const { result_b64 } = await mockTryOn({
          person_b64: personB64,
          garment_b64: garment.base64 ?? undefined,
          garment_url: garment.imageUrl ?? undefined,
        });
        setResultB64(result_b64);
      } else {
        // ✅ ยิง service จริง (multipart/form-data → file/garm_img/relax_validation)
        const { result_b64 } = await tryOn({
          person_b64: personB64,
          garment_b64: garment.base64 ?? undefined,
          garment_url: garment.imageUrl ?? undefined,
          relax_validation: true, // ให้ behavior เหมือน Postman
        });
        setResultB64(result_b64);
      }
    } catch (e: any) {
      Alert.alert("Failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const isSelected = (op: Option) => {
    if (op.source === "uploaded" && garment?.base64) return (op as any).base64 === garment.base64;
    if (op.source !== "uploaded" && garment?.imageUrl) return (op as any).imageUrl === garment.imageUrl;
    return false;
  };

  const pingTest = async () => {
    try {
      const res = await fetch(`${APP_CONFIG.ML_BACKEND_URL}/ping`);
      Alert.alert("Ping", `status ${res.status}`);
    } catch (e: any) {
      Alert.alert("Ping failed", e.message);
    }
  };


  return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Text style={{ marginTop: 20, fontSize: 18, fontWeight: "700" }}>Virtual Try-On</Text>
          {!personB64 ? (
              <View style={{ height: 260, backgroundColor: "#E5E7EB", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#6B7280", marginBottom: 12, paddingHorizontal: 16, textAlign: "center" }}>
                  Upload your photo to see how shirts look on you
                </Text>
                <PrimaryBtn title="Upload Your Photo" onPress={pickPerson} />
              </View>
          ) : (
              <View style={{ backgroundColor: "white", borderRadius: 16, padding: 12, elevation: 1 }}>
                <Image source={{ uri: toDataUri(personB64) }} style={{ width: "100%", height: 300, borderRadius: 12 }} />
              </View>
          )}

          <SectionTitle>Select a Shirt</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {options.map((op) => {
              const thumbUri = op.source === "uploaded" ? toDataUri((op as any).base64) : (op as any).imageUrl;
              const selected = isSelected(op);
              return (
                  <TouchableOpacity
                      key={op.key}
                      onPress={() => selectOption(op)}
                      style={{ width: 90, height: 90, borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: selected ? "#3B82F6" : "transparent" }}
                  >
                    <Image source={{ uri: thumbUri }} style={{ width: "100%", height: "100%" }} />
                  </TouchableOpacity>
              );
            })}
          </ScrollView>

          <GhostBtn title="Ping Backend" onPress={pingTest} style={{ flex: 1 }} />


          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 8 }}>
            <GhostBtn title="Change Photo" onPress={pickPerson} style={{ flex: 1 }} />
            <PrimaryBtn
                title={APP_CONFIG.USE_MOCK_ML ? "View Result (Mock)" : "View Result"}
                onPress={run}
                disabled={busy || !personB64 || (!garment?.base64 && !garment?.imageUrl)}
                style={{ flex: 1, opacity: busy || !personB64 || (!garment?.base64 && !garment?.imageUrl) ? 0.6 : 1 }}
            />
          </View>

          {busy && <ActivityIndicator style={{ marginTop: 8 }} />}

          {resultB64 && (
              <>
                <Text style={{ fontWeight: "700", paddingHorizontal: 16 }}>Result</Text>
                <Image source={{ uri: toDataUri(resultB64) }} style={{ width: "100%", height: 360, borderRadius: 12 }} />
              </>
          )}
        </ScrollView>
      </Screen>
  );
}
