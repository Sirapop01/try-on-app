// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    Alert as RNAlert,
} from "react-native";
import { Screen, Segmented, SectionTitle, PlusPrimary, PlusSmall } from "../../components/ui";
import { useRouter } from "expo-router";
import { useSelectionStore } from "../../store/selectionStore";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuthState } from "../../hooks/useAuth";
import { ALERT_TYPE, Dialog, Toast } from "react-native-alert-notification";
import { useUserProfile } from "../../hooks/useUserProfile";

import { listCatalog, type CatalogListItem } from "@/services/catalog";
import { uploadUriToCloudinary } from "@/services/cloudinary";
import {
    addUserShirtUrl,
    subscribeUserShirts,
    deleteUserShirt,
    type UserShirt,
} from "@/services/garments";

const WIDTH = Dimensions.get("window").width;
const H_PAD = 12;
const GAP = 10;
const CARD_W = WIDTH - H_PAD * 2;
const SNAP = CARD_W + GAP;

export default function HomeScreen() {
    const [tab, setTab] = useState<"catalog" | "mine">("catalog");
    const { setGarment } = useSelectionStore();
    const router = useRouter();
    const { user } = useAuthState();
    const { profile } = useUserProfile();

    // My Shirts (realtime)
    const [mine, setMine] = useState<UserShirt[]>([]);
    const [loadingAdd, setLoadingAdd] = useState(false);

    // Catalog (Firestore)
    const [catalog, setCatalog] = useState<CatalogListItem[]>([]);
    const [catLoading, setCatLoading] = useState(true);
    const [catError, setCatError] = useState<string | null>(null);

    const displayName =
        profile?.displayName ??
        user?.displayName ??
        (user?.email ? user.email.split("@")[0] : null) ??
        "User";

    // ---------- Realtime My Shirts ----------
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = subscribeUserShirts(user.uid, (rows) => setMine(rows), 100);
        return () => unsub && unsub();
    }, [user?.uid]);

    // ---------- Load catalog ----------
    const reloadCatalog = async () => {
        try {
            setCatLoading(true);
            setCatError(null);
            const items = await listCatalog(30);
            setCatalog(items);
        } catch (e: any) {
            setCatError(e?.message ?? "โหลดแคตตาล็อกไม่สำเร็จ");
        } finally {
            setCatLoading(false);
        }
    };
    useEffect(() => {
        reloadCatalog();
    }, []);

    // ---------- Actions ----------
    const onTry = (item: CatalogListItem) => {
        setGarment({ id: item.id, name: item.title, imageUrl: item.imageUrl });
        router.push("/(tabs)/try-on");
    };

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
            allowsEditing: true,
            quality: 0.9,
        });
        if (r.canceled || !r.assets?.[0]?.uri) return;

        if (!user) {
            Dialog.show({ type: ALERT_TYPE.WARNING, title: "กรุณาเข้าสู่ระบบก่อน", button: "ตกลง" });
            return;
        }

        try {
            setLoadingAdd(true);
            // แปลงเป็น JPEG (กัน HEIC/WEBP)
            const out = await ImageManipulator.manipulateAsync(
                r.assets[0].uri,
                [],
                { compress: 0.9, format: "jpeg" as any }
            );
            // อัปโหลดขึ้น Cloudinary
            const up = await uploadUriToCloudinary(out.uri); // up.secure_url
            // บันทึก URL ลง Firestore
            await addUserShirtUrl(user.uid, up.secure_url);

            Toast.show({ type: ALERT_TYPE.SUCCESS, title: "เพิ่มแล้ว", textBody: "เสื้อของคุณถูกเพิ่มใน My Shirts" });
            setTab("mine"); // realtime จะเด้งเอง
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

    const confirmDelete = (id: string) => {
        RNAlert.alert("ลบรูปนี้?", "คุณต้องการลบรูปเสื้อนี้ออกจาก My Shirts หรือไม่", [
            { text: "ยกเลิก", style: "cancel" },
            {
                text: "ลบ",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteUserShirt(id);
                        // ไม่ต้อง refresh — subscribe จะอัปเดตให้เอง
                    } catch (e: any) {
                        Dialog.show({
                            type: ALERT_TYPE.DANGER,
                            title: "ลบไม่สำเร็จ",
                            textBody: e?.message ?? "Unknown error",
                            button: "ปิด",
                        });
                    }
                },
            },
        ]);
    };

    // ---------- Small UI ----------
    const Greeting = ({ name }: { name: string }) => (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, marginTop: 20 }}>
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

    const CatalogCard = ({ item }: { item: CatalogListItem }) => (
        <View
            style={{
                width: CARD_W,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#E5E7EB",
            }}
        >
            <View style={{ position: "relative" }}>
                <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: 220 }} resizeMode="cover" />
                {!!item.category && (
                    <View
                        style={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                        }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{item.category}</Text>
                    </View>
                )}
            </View>

            <View style={{ padding: 12, gap: 8 }}>
                <Text style={{ fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
                    {item.title}
                </Text>
                {!!item.description && (
                    <Text style={{ color: "#6B7280" }} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <TouchableOpacity
                    onPress={() => onTry(item)}
                    style={{ marginTop: 4, backgroundColor: "#f59e0b", paddingVertical: 12, borderRadius: 12 }}
                >
                    <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Try This On</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ---------- Sections ----------
    const renderCatalog = () => {
        if (catLoading) {
            return (
                <View style={{ paddingHorizontal: H_PAD, paddingTop: 12 }}>
                    <ActivityIndicator />
                </View>
            );
        }

        if (catError) {
            return (
                <View style={{ paddingHorizontal: H_PAD, paddingTop: 12, alignItems: "center" }}>
                    <Text style={{ color: "#ef4444", marginBottom: 8 }}>{catError}</Text>
                    <TouchableOpacity
                        onPress={reloadCatalog}
                        style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#111827", borderRadius: 10 }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!catalog.length) {
            return (
                <View style={{ paddingHorizontal: H_PAD, paddingTop: 12 }}>
                    <SectionTitle>Explore Collection</SectionTitle>
                    <View
                        style={{
                            marginTop: 16,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            borderRadius: 16,
                            padding: 16,
                            alignItems: "center",
                            backgroundColor: "#fff",
                        }}
                    >
                        <Text style={{ color: "#6B7280" }}>ยังไม่มีรายการแคตตาล็อก</Text>
                    </View>
                </View>
            );
        }

        return (
            <>
                <SectionTitle>Explore Collection</SectionTitle>
                <FlatList
                    data={catalog}
                    keyExtractor={(it) => it.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    snapToInterval={SNAP}
                    snapToAlignment="start"
                    disableIntervalMomentum
                    contentContainerStyle={{ paddingHorizontal: H_PAD }}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    renderItem={({ item }) => (
                        <View style={{ width: CARD_W }}>
                            <CatalogCard item={item} />
                        </View>
                    )}
                />
            </>
        );
    };

    const renderMine = () => (
        <View style={{ paddingHorizontal: H_PAD, marginTop: 8 }}>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                }}
            >
                <Text style={{ fontSize: 16, fontWeight: "700" }}>Your Collection</Text>
                <PlusSmall
                    title={loadingAdd ? "Adding..." : "Add Shirt"}
                    onPress={addShirt}
                    style={{ opacity: loadingAdd ? 0.6 : 1 }}
                />
            </View>

            {mine.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 24 }}>
                    <Text style={{ color: "#6B7280", marginBottom: 12 }}>
                        You haven't added any shirts yet.
                    </Text>
                    <PlusPrimary
                        title={loadingAdd ? "Adding..." : "Add Your First Shirt"}
                        onPress={addShirt}
                        style={{ opacity: loadingAdd ? 0.6 : 1 }}
                    />
                </View>
            ) : (
                <View style={{ gap: GAP, paddingBottom: 16 }}>
                    {mine.map((it) => (
                        <View
                            key={it.id}
                            style={{
                                width: "100%",
                                backgroundColor: "#fff",
                                borderRadius: 14,
                                overflow: "hidden",
                                borderWidth: 1,
                                borderColor: "#E5E7EB",
                            }}
                        >
                            {/* ปุ่มลบรูป (มุมขวาบน) */}
                            <TouchableOpacity
                                onPress={() => confirmDelete(it.id)}
                                style={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    zIndex: 10,
                                    backgroundColor: "rgba(0,0,0,0.55)",
                                    paddingVertical: 6,
                                    paddingHorizontal: 10,
                                    borderRadius: 999,
                                }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "700" }}>🗑</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => goTryOnWith(it)}>
                                <Image source={{ uri: it.imageUrl }} style={{ width: "100%", height: 220 }} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    return (
        <Screen>
            <Greeting name={displayName} />
            <Segmented value={tab} onChange={setTab} counts={{ catalog: catalog.length, mine: mine.length }} />
            {tab === "catalog" ? renderCatalog() : renderMine()}
        </Screen>
    );
}
