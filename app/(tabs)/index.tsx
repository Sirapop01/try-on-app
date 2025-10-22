// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, Dimensions, TouchableOpacity } from "react-native";
import { Screen, Segmented, SectionTitle, ShirtCard, PlusPrimary, PlusSmall } from "../../components/ui";
import { useRouter } from "expo-router";
import { useSelectionStore } from "../../store/selectionStore";
import * as ImagePicker from "expo-image-picker";
import { toBase64Compressed } from "../../services/image";
import { addUserShirt, listUserShirts, type UserShirt } from "../../services/garments";
import { useAuthState } from "../../hooks/useAuth";
import { ALERT_TYPE, Dialog, Toast } from "react-native-alert-notification";
import { useUserProfile } from "../../hooks/useUserProfile";

const WIDTH = Dimensions.get("window").width;
const H_PAD = 12;
const GAP   = 10;
const CARD_W = WIDTH - H_PAD * 2;
const SNAP   = CARD_W + GAP;

export const mockCatalog = [
  { id: "3", title: "Patterned Shirt", subtitle: "Street",
    img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=80" },
  { id: "5", title: "Black Oxford Shirt", subtitle: "Smart",
    img: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80" },
  { id: "6", title: "Checked Flannel", subtitle: "Outdoor",
    img: "https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=1200&q=80" },
];

export default function HomeScreen() {
  const [tab, setTab] = useState<"catalog" | "mine">("catalog");
  const { setGarment } = useSelectionStore();
  const router = useRouter();
  const { user } = useAuthState();
  const [mine, setMine] = useState<UserShirt[]>([]);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const { profile } = useUserProfile(); // ⬅️ อ่านโปรไฟล์จาก Firestore

  const displayName =
      profile?.displayName ??
      user?.displayName ??
      (user?.email ? user.email.split("@")[0] : null) ??
      "User";
  // ========== Catalog actions ==========
  const onTry = (item: any) => {
    setGarment({ id: item.id, name: item.title, imageUrl: item.img });
    router.push("/(tabs)/try-on");
  };

  // ========== My Shirts actions ==========
  const loadMine = async () => {
    if (!user) return;
    const items = await listUserShirts(user.uid, 50);
    setMine(items);
  };

  useEffect(() => {
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const addShirt = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Dialog.show({
        type: ALERT_TYPE.WARNING,
        title: "ต้องการสิทธิ์รูปภาพ",
        textBody: "โปรดอนุญาตการเข้าถึงรูปภาพเพื่อเพิ่มเสื้อของคุณ",
        button: "ตกลง",
      });
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    if (!user) {
      Dialog.show({ type: ALERT_TYPE.WARNING, title: "กรุณาเข้าสู่ระบบก่อน", button: "ตกลง" });
      return;
    }

    try {
      setLoadingAdd(true);
      const b64 = await toBase64Compressed(r.assets[0].uri, 1080);
      await addUserShirt(user.uid, b64);
      await loadMine();
      Toast.show({ type: ALERT_TYPE.SUCCESS, title: "เพิ่มแล้ว", textBody: "เสื้อของคุณถูกเพิ่มใน My Shirts" });
      setTab("mine");
    } catch (e: any) {
      Dialog.show({
        type: ALERT_TYPE.DANGER,
        title: "เพิ่มไม่สำเร็จ",
        textBody: e?.message ?? "Unknown error",
        button: "ปิด",
      });
    } finally {
      setLoadingAdd(false);
    }
  };

  const goTryOnWith = (it: UserShirt) => {
    setGarment({ imageUrl: it.imageUrl });
    router.push("/(tabs)/try-on");
  };

  // ========== UI ==========
  const Greeting = ({ name }: { name: string }) => (
      <View style={{ paddingHorizontal: 16, paddingTop: 10, marginTop:20 }}>
        <View
            style={{
              backgroundColor: "#F3F4F6",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
        >
          <Text style={{ color: "#6B7280" }}>Welcome back,</Text>
          <Text style={{ fontWeight: "800", fontSize: 18, marginTop: 2 }}>{name}!</Text>
        </View>
      </View>
  );


  const renderCatalog = () => (
      <>
        <SectionTitle>Explore Collection</SectionTitle>
        <FlatList
            data={mockCatalog}
            keyExtractor={(it) => it.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SNAP}               // ✅ สแนปทีละใบ
            snapToAlignment="start"
            disableIntervalMomentum
            contentContainerStyle={{ paddingHorizontal: H_PAD }}
            ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
            renderItem={({ item }) => (
                <View style={{ width: CARD_W }}>
                  <ShirtCard
                      img={item.img}
                      title={item.title}
                      subtitle={item.subtitle}
                      onPress={() => onTry(item)}
                  />
                </View>
            )}
        />
      </>
  );


  const renderMine = () => (
      <View style={{ paddingHorizontal: H_PAD, marginTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Your Collection</Text>
          <PlusSmall title={loadingAdd ? "Adding..." : "Add Shirt"} onPress={addShirt} style={{ opacity: loadingAdd ? 0.6 : 1 }} />
        </View>

        {mine.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 24 }}>
              <Text style={{ color: "#6B7280", marginBottom: 12 }}>You haven't added any shirts yet.</Text>
              <PlusPrimary title={loadingAdd ? "Adding..." : "Add Your First Shirt"} onPress={addShirt} style={{ opacity: loadingAdd ? 0.6 : 1 }} />
            </View>
        ) : (
            <View style={{ gap: GAP, paddingBottom: 16 }}>
              {mine.map((it) => (
                  <TouchableOpacity
                      key={it.id}
                      onPress={() => goTryOnWith(it)}
                      style={{
                        width: "100%",                 // ✅ เต็มแถว
                        backgroundColor: "#fff",
                        borderRadius: 14,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                  >
                    <Image source={{ uri: it.imageUrl }} style={{ width: "100%", height: 220 }} />
                  </TouchableOpacity>
              ))}
            </View>
        )}
      </View>
  );


  return (
      <Screen>
        < Greeting name={displayName} />
        <Segmented value={tab} onChange={setTab} counts={{ catalog: mockCatalog.length, mine: mine.length }} />
        {tab === "catalog" ? renderCatalog() : renderMine()}
      </Screen>
  );
}
