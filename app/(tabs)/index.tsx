// app/(tabs)/index.tsx — Minimal B/W Catalog & My Shirts
// - เอา Search bar ออก
// - คง Category chips + Clear
// - Grid columns (1/2/3) ทั้ง Catalog/Mine
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
    ScrollView,
} from "react-native";
import { Screen, Segmented, SectionTitle } from "../../components/ui";
import { useRouter } from "expo-router";
import { useSelectionStore } from "../../store/selectionStore";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuthState } from "../../hooks/useAuth";
import { ALERT_TYPE, Dialog, Toast } from "react-native-alert-notification";
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

/** ====== Minimal palette ====== */
const C = {
    black: "#000000",
    white: "#FFFFFF",
    gray900: "#111827",
    gray600: "#4B5563",
    gray500: "#9CA3AF",
    gray300: "#D1D5DB",
    gray200: "#E5E7EB",
    gray100: "#F3F4F6",
};

const WIDTH = Dimensions.get("window").width;
const H_PAD = 12;
const GAP = 10;

/** utils */
const cardWidth = (cols: number) => (WIDTH - H_PAD * 2 - GAP * (cols - 1)) / cols;
const imageHeight = (cols: number) => (cols === 1 ? 220 : cols === 2 ? 180 : 150);

/** Minimal buttons */
function Btn({
                 title,
                 onPress,
                 style,
                 disabled,
             }: {
    title: string;
    onPress?: () => void;
    style?: any;
    disabled?: boolean;
}) {
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
                    }: {
    title: string;
    onPress?: () => void;
    style?: any;
    disabled?: boolean;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[
                {
                    backgroundColor: C.white,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.black,
                    opacity: disabled ? 0.6 : 1,
                },
                style,
            ]}
        >
            <Text style={{ color: C.black, fontWeight: "700", textAlign: "center" }}>{title}</Text>
        </TouchableOpacity>
    );
}

export default function HomeScreen() {
    const [tab, setTab] = useState<"catalog" | "mine">("catalog");
    const { setGarment } = useSelectionStore();
    const router = useRouter();
    const { user } = useAuthState();

    const tabBarH = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();
    const bottomPad = tabBarH + insets.bottom + 24;

    const [colsCatalog, setColsCatalog] = useState<1 | 2 | 3>(2);
    const [colsMine, setColsMine] = useState<1 | 2 | 3>(2);

    const [mine, setMine] = useState<UserShirt[]>([]);
    const [loadingAdd, setLoadingAdd] = useState(false);

    const [catalog, setCatalog] = useState<CatalogListItem[]>([]);
    const [catLoading, setCatLoading] = useState(true);
    const [catError, setCatError] = useState<string | null>(null);

    // ====== Filter: Category only ======
    const [category, setCategory] = useState<string>("all");

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = subscribeUserShirts(user.uid, (rows) => setMine(rows), 100);
        return () => unsub && unsub();
    }, [user?.uid]);

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

    const CatalogCard = ({ item, w, h }: { item: CatalogListItem; w: number; h: number }) => (
        <View
            style={{
                width: w,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: C.white,
                borderWidth: 1,
                borderColor: C.gray200,
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
                            backgroundColor: "rgba(0,0,0,0.7)",
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                        }}
                    >
                        <Text style={{ color: C.white, fontWeight: "700", fontSize: 12 }}>{item.category}</Text>
                    </View>
                )}
            </View>

            <View style={{ padding: 10, gap: 8 }}>
                <Text style={{ fontWeight: "800", fontSize: 15, color: C.black }} numberOfLines={1}>
                    {item.title}
                </Text>
                {!!item.description && (
                    <Text style={{ color: C.gray500 }} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}
                <Btn title="Try This On" onPress={() => onTry(item)} />
            </View>
        </View>
    );

    const GridControl = ({
                             value,
                             onChange,
                         }: {
        value: 1 | 2 | 3;
        onChange: (v: 1 | 2 | 3) => void;
    }) => (
        <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 2, 3].map((n) => {
                const selected = value === (n as 1 | 2 | 3);
                return (
                    <TouchableOpacity
                        key={n}
                        onPress={() => onChange(n as 1 | 2 | 3)}
                        style={{
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: selected ? C.black : C.gray200,
                            backgroundColor: selected ? C.black : C.white,
                        }}
                    >
                        <Text style={{ color: selected ? C.white : C.black, fontWeight: "700" }}>{n}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    // ====== Categories & filtered list (Category only) ======
    const categories: string[] = useMemo(() => {
        const set = new Set<string>();
        catalog.forEach((c) => c.category && set.add(String(c.category)));
        return ["all", ...Array.from(set)];
    }, [catalog]);

    const filteredCatalog = useMemo(() => {
        let arr = [...catalog];
        if (category !== "all") {
            arr = arr.filter((it) => String(it.category ?? "") === category);
        }
        return arr;
    }, [catalog, category]);

    const CategoryBar = () => (
        <View
            style={{
                borderWidth: 1,
                borderColor: C.gray200,
                backgroundColor: C.white,
                borderRadius: 16,
                padding: 12,
                gap: 10,
            }}
        >
            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {categories.map((cat) => {
                    const selected = category === cat;
                    return (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setCategory(cat)}
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: selected ? C.black : C.gray200,
                                backgroundColor: selected ? C.black : C.white,
                            }}
                        >
                            <Text style={{ color: selected ? C.white : C.black, fontWeight: "700" }}>
                                {cat === "all" ? "All" : cat}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Clear */}
            <View style={{ flexDirection: "row", gap: 8 }}>
                <BtnOutline
                    title="Clear"
                    onPress={() => setCategory("all")}
                    style={{ flex: 1 }}
                />
            </View>
        </View>
    );

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
                    <Btn title="ลองใหม่" onPress={reloadCatalog} style={{ width: 140 }} />
                </View>
            );
        }

        return (
            <View style={{ flex: 1, paddingHorizontal: H_PAD, paddingTop: 8 }}>
                <View
                    style={{
                        marginBottom: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <SectionTitle>Explore Collection</SectionTitle>
                    <GridControl value={colsCatalog} onChange={setColsCatalog} />
                </View>

                {/* Category-only filter */}
                <CategoryBar />

                {filteredCatalog.length === 0 ? (
                    <View
                        style={{
                            marginTop: 12,
                            borderWidth: 1,
                            borderColor: C.gray200,
                            borderRadius: 16,
                            padding: 16,
                            alignItems: "center",
                            backgroundColor: C.white,
                        }}
                    >
                        <Text style={{ color: C.gray600 }}>No items match your filters.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredCatalog}
                        key={`cat-${colsCatalog}`}
                        keyExtractor={(it) => it.id}
                        numColumns={colsCatalog}
                        overScrollMode="always"
                        keyboardShouldPersistTaps="handled"
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
                        marginBottom: 10,
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: C.black }}>Your Collection</Text>

                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                        <GridControl value={colsMine} onChange={setColsMine} />
                        <BtnOutline
                            title={loadingAdd ? "Adding..." : "Add Shirt"}
                            onPress={addShirt}
                            style={{ paddingHorizontal: 12 }}
                        />
                    </View>
                </View>

                {mine.length === 0 ? (
                    <View style={{ alignItems: "center", marginTop: 20, gap: 12 }}>
                        <Text style={{ color: C.gray500 }}>You haven't added any shirts yet.</Text>
                        <Btn title={loadingAdd ? "Adding..." : "Add Your First Shirt"} onPress={addShirt} />
                    </View>
                ) : (
                    <FlatList
                        data={mine}
                        key={`mine-${colsMine}`}
                        keyExtractor={(it) => it.id}
                        numColumns={colsMine}
                        overScrollMode="always"
                        keyboardShouldPersistTaps="handled"
                        columnWrapperStyle={colsMine > 1 ? { gap: GAP } : undefined}
                        contentContainerStyle={{ gap: GAP, paddingBottom: bottomPad }}
                        ListFooterComponent={<View style={{ height: bottomPad + 24 }} />}
                        renderItem={({ item: it }) => (
                            <View
                                style={{
                                    width: w,
                                    backgroundColor: C.white,
                                    borderRadius: 14,
                                    overflow: "hidden",
                                    borderWidth: 1,
                                    borderColor: C.gray200,
                                }}
                            >
                                <TouchableOpacity
                                    onPress={() => confirmDelete(it.id)}
                                    style={{
                                        position: "absolute",
                                        top: 8,
                                        right: 8,
                                        zIndex: 10,
                                        backgroundColor: "rgba(0,0,0,0.6)",
                                        paddingVertical: 6,
                                        paddingHorizontal: 10,
                                        borderRadius: 999,
                                    }}
                                >
                                    <Text style={{ color: C.white, fontWeight: "700" }}>🗑</Text>
                                </TouchableOpacity>

                                <Image source={{ uri: it.imageUrl }} style={{ width: "100%", height: h }} />

                                <View style={{ padding: 10 }}>
                                    <Btn title="Try On" onPress={() => goTryOnWith(it)} />
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>
        );
    };

    return (
        <Screen style={{ flex: 1, backgroundColor: C.white, paddingTop: 6 }}>
            <Segmented value={tab} onChange={setTab} counts={{ catalog: catalog.length, mine: mine.length }} />
            <View style={{ flex: 1 }}>{tab === "catalog" ? renderCatalog() : renderMine()}</View>
        </Screen>
    );
}
