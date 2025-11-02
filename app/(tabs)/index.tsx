// app/(tabs)/index.tsx
import React, { useEffect, useMemo, useState } from "react";
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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

/** ความกว้างการ์ดตามจำนวนคอลัมน์ */
const cardWidth = (cols: number) => (WIDTH - H_PAD * 2 - GAP * (cols - 1)) / cols;
/** ความสูงรูปตามจำนวนคอลัมน์ (ให้กริดดูบาลานซ์) */
const imageHeight = (cols: number) => (cols === 1 ? 220 : cols === 2 ? 180 : 150);

export default function HomeScreen() {
    const [tab, setTab] = useState<"catalog" | "mine">("catalog");
    const { setGarment } = useSelectionStore();
    const router = useRouter();
    const { user } = useAuthState();
    const { profile } = useUserProfile();

    const tabBarH = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();
    /** padding ล่างจริง ๆ ให้เลื่อนสุด: แท็บบาร์ + safe area + เผื่อระยะ */
    const bottomPad = tabBarH + insets.bottom + 24;

    /** จำนวนคอลัมน์ */
    const [colsCatalog, setColsCatalog] = useState<1 | 2 | 3>(2);
    const [colsMine, setColsMine] = useState<1 | 2 | 3>(2);

    const [mine, setMine] = useState<UserShirt[]>([]);
    const [loadingAdd, setLoadingAdd] = useState(false);

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
            const items = await listCatalog(60);
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
            const out = await ImageManipulator.manipulateAsync(r.assets[0].uri, [], {
                compress: 0.9,
                format: "jpeg" as any,
            });
            const up = await uploadUriToCloudinary(out.uri);
            await addUserShirtUrl(user.uid, up.secure_url);

            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: "เพิ่มแล้ว",
                textBody: "เสื้อของคุณถูกเพิ่มใน My Shirts",
            });
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

    const confirmDelete = (id: string) => {
        RNAlert.alert("ลบรูปนี้?", "คุณต้องการลบรูปเสื้อนี้ออกจาก My Shirts หรือไม่", [
            { text: "ยกเลิก", style: "cancel" },
            {
                text: "ลบ",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteUserShirt(id);
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

    const CatalogCard = ({ item, w, h }: { item: CatalogListItem; w: number; h: number }) => (
        <View
            style={{
                width: w,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#E5E7EB",
            }}
        >
            <View style={{ position: "relative" }}>
                <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: h }} resizeMode="cover" />
                {!!item.category && (
                    <View
                        style={{
                            position: "absolute",
                            top: 10,
                            left: 10,
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

            <View style={{ padding: 10, gap: 6 }}>
                <Text style={{ fontWeight: "800", fontSize: 15 }} numberOfLines={1}>
                    {item.title}
                </Text>
                {!!item.description && (
                    <Text style={{ color: "#6B7280" }} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <TouchableOpacity
                    onPress={() => onTry(item)}
                    style={{ marginTop: 2, backgroundColor: "#f59e0b", paddingVertical: 10, borderRadius: 12 }}
                >
                    <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Try This On</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    /** ปุ่มเลือกจำนวนคอลัมน์ (1/2/3) */
    const GridControl = ({
                             value,
                             onChange,
                         }: {
        value: 1 | 2 | 3;
        onChange: (v: 1 | 2 | 3) => void;
    }) => (
        <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 2, 3].map((n) => (
                <TouchableOpacity
                    key={n}
                    onPress={() => onChange(n as 1 | 2 | 3)}
                    style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: value === n ? "#111827" : "#E5E7EB",
                        backgroundColor: value === n ? "#111827" : "#fff",
                    }}
                >
                    <Text style={{ color: value === n ? "#fff" : "#111827", fontWeight: "700" }}>{n}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    // ---------- Sections ----------
    const renderCatalog = () => {
        const w = useMemo(() => cardWidth(colsCatalog), [colsCatalog]);
        const h = useMemo(() => imageHeight(colsCatalog), [colsCatalog]);

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

        return (
            <View style={{ flex: 1, paddingHorizontal: H_PAD, paddingTop: 12 }}>
                <View
                    style={{
                        marginBottom: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <SectionTitle>Explore Collection</SectionTitle>
                    <GridControl value={colsCatalog} onChange={setColsCatalog} />
                </View>

                {catalog.length === 0 ? (
                    <View
                        style={{
                            marginTop: 4,
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
                ) : (
                    <FlatList
                        data={catalog}
                        key={`cat-${colsCatalog}`}
                        keyExtractor={(it) => it.id}
                        numColumns={colsCatalog}
                        overScrollMode="always"
                        columnWrapperStyle={colsCatalog > 1 ? { gap: GAP } : undefined}
                        contentContainerStyle={{ gap: GAP, paddingBottom: bottomPad }}
                        ListFooterComponent={<View style={{ height: bottomPad + 24 }} />}
                        renderItem={({ item }) => <CatalogCard item={item} w={w} h={h} />}
                    />
                )}
            </View>
        );
    };

    const renderMine = () => {
        const w = useMemo(() => cardWidth(colsMine), [colsMine]);
        const h = useMemo(() => imageHeight(colsMine), [colsMine]);

        return (
            <View style={{ flex: 1, paddingHorizontal: H_PAD, paddingTop: 8 }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: "700" }}>Your Collection</Text>

                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                        <GridControl value={colsMine} onChange={setColsMine} />
                        <PlusSmall
                            title={loadingAdd ? "Adding..." : "Add Shirt"}
                            onPress={addShirt}
                            style={{ opacity: loadingAdd ? 0.6 : 1 }}
                        />
                    </View>
                </View>

                {mine.length === 0 ? (
                    <View style={{ alignItems: "center", marginTop: 24 }}>
                        <Text style={{ color: "#6B7280", marginBottom: 12 }}>You haven't added any shirts yet.</Text>
                        <PlusPrimary
                            title={loadingAdd ? "Adding..." : "Add Your First Shirt"}
                            onPress={addShirt}
                            style={{ opacity: loadingAdd ? 0.6 : 1 }}
                        />
                    </View>
                ) : (
                    <FlatList
                        data={mine}
                        key={`mine-${colsMine}`}
                        keyExtractor={(it) => it.id}
                        numColumns={colsMine}
                        overScrollMode="always"
                        columnWrapperStyle={colsMine > 1 ? { gap: GAP } : undefined}
                        contentContainerStyle={{ gap: GAP, paddingBottom: bottomPad }}
                        ListFooterComponent={<View style={{ height: bottomPad + 24 }} />}
                        renderItem={({ item: it }) => (
                            <View
                                style={{
                                    width: w,
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

                                {/* รูป */}
                                <Image source={{ uri: it.imageUrl }} style={{ width: "100%", height: h }} />

                                {/* ปุ่ม Try On ใต้รูป */}
                                <View style={{ padding: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => goTryOnWith(it)}
                                        style={{
                                            backgroundColor: "#111827",
                                            paddingVertical: 10,
                                            borderRadius: 12,
                                        }}
                                    >
                                        <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
                                            Try On
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>
        );
    };

    return (
        <Screen style={{ flex: 1 }}>
            <Greeting name={displayName} />
            <Segmented value={tab} onChange={setTab} counts={{ catalog: catalog.length, mine: mine.length }} />
            <View style={{ flex: 1 }}>
                {tab === "catalog" ? renderCatalog() : renderMine()}
            </View>
        </Screen>
    );
}
