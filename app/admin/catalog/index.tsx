// app/(admin)/index.tsx — Minimal B/W, List/Grid toggle, scrolls to bottom
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useFirebase } from "@/hooks/useFirebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { deleteCatalogItemCloudinary } from "@/services/catalog";

type CatalogItem = {
    id: string;
    title: string;
    description?: string;
    price?: number | null;
    category?: string;
    imageUrl: string;
    cloudinaryDeleteToken?: string | null;
    createdAt?: any;
};

const C = {
    black: "#000000",
    white: "#ffffff",
    gray900: "#111827",
    gray700: "#374151",
    gray600: "#4B5563",
    gray500: "#9CA3AF",
    gray300: "#D1D5DB",
    gray200: "#E5E7EB",
    gray100: "#F3F4F6",
};

function Btn({
                 title,
                 onPress,
                 variant = "solid", // 'solid' | 'outline'
                 disabled = false,
                 style,
             }: {
    title: string;
    onPress?: () => void;
    variant?: "solid" | "outline";
    disabled?: boolean;
    style?: any;
}) {
    const isSolid = variant === "solid";
    return (
        <TouchableOpacity
            disabled={disabled}
            onPress={onPress}
            activeOpacity={disabled ? 1 : 0.7}
            style={[
                {
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.black,
                    backgroundColor: isSolid ? C.black : C.white,
                    opacity: disabled ? 0.5 : 1,
                },
                style,
            ]}
        >
            <Text style={{ color: isSolid ? C.white : C.black, fontWeight: "800" }}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}

export default function AdminCatalogList() {
    const router = useRouter();
    const { db } = useFirebase();

    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // --- View mode state: list | grid
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    const NUM_COLS = viewMode === "grid" ? 2 : 1;
    const SCREEN_W = Dimensions.get("window").width;
    const GUTTER = 12;
    const CARD_W =
        viewMode === "grid"
            ? Math.floor((SCREEN_W - 16 * 2 - GUTTER * (NUM_COLS - 1)) / NUM_COLS)
            : SCREEN_W - 16 * 2;

    useEffect(() => {
        const q = query(collection(db, "catalog"), orderBy("createdAt,desc".split(",")[0], "desc"));
        const unsub = onSnapshot(
            q,
            (snap) => {
                const rows: CatalogItem[] = snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as any),
                }));
                setItems(rows);
                setLoading(false);
            },
            (err) => {
                console.error(err);
                setLoading(false);
                Alert.alert("ผิดพลาด", "โหลดรายการไม่สำเร็จ");
            }
        );
        return () => unsub();
    }, [db]);

    const confirmDelete = (item: CatalogItem) => {
        Alert.alert("ลบรายการ", `แน่ใจหรือไม่ที่จะลบ “${item.title}”`, [
            { text: "ยกเลิก", style: "cancel" },
            { text: "ลบ", style: "destructive", onPress: () => handleDelete(item) },
        ]);
    };

    const handleDelete = async (item: CatalogItem) => {
        try {
            setDeletingId(item.id);
            await deleteCatalogItemCloudinary(item.id);
        } catch (e: any) {
            console.error(e);
            Alert.alert("ลบไม่สำเร็จ", e?.message ?? "เกิดข้อผิดพลาด");
        } finally {
            setDeletingId(null);
        }
    };

    const Header = useMemo(
        () => (
            <View style={{ paddingTop: 8, paddingBottom: 12 }}>
                {/* Title row */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: C.black }}>
                            Catalog (Admin)
                        </Text>
                        <View
                            style={{
                                borderWidth: 1,
                                borderColor: C.black,
                                borderRadius: 999,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                backgroundColor: C.white,
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: "800", color: C.black }}>
                                {items.length}
                            </Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 8 }}>
                        {/* Toggle: List / Grid (ขาวดำมินิมอล) */}
                        <Btn
                            title={viewMode === "grid" ? "List" : "Grid"}
                            variant="outline"
                            onPress={() => setViewMode((m) => (m === "grid" ? "list" : "grid"))}
                        />
                        <Btn
                            title="+ เพิ่มสินค้า"
                            variant="solid"
                            onPress={() => router.push("/admin/catalog/add")}
                        />
                    </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: C.gray200, marginTop: 12 }} />
            </View>
        ),
        [router, items.length, viewMode]
    );

    // --- Item renderers for both modes ---
    const renderListCard = ({ item }: { item: CatalogItem }) => {
        const isDeleting = deletingId === item.id;
        return (
            <View
                style={{
                    width: CARD_W,
                    backgroundColor: C.white,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: C.gray200,
                }}
            >
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <Image
                        source={{ uri: item.imageUrl }}
                        style={{
                            width: 92,
                            height: 92,
                            borderRadius: 12,
                            backgroundColor: C.gray100,
                            borderWidth: 1,
                            borderColor: C.gray200,
                        }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "800", fontSize: 16, color: C.black }}>{item.title}</Text>
                        {!!item.category && (
                            <Text style={{ marginTop: 4, color: C.gray600 }}>หมวด: {item.category}</Text>
                        )}
                        {item.price != null && (
                            <Text style={{ marginTop: 4, color: C.gray900 }}>
                                ราคา: {Number(item.price).toLocaleString()} บาท
                            </Text>
                        )}
                        <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                            <Btn
                                title="แก้ไข"
                                variant="outline"
                                onPress={() =>
                                    router.push({ pathname: "/admin/catalog/[id]/edit", params: { id: item.id } })
                                }
                            />
                            <TouchableOpacity
                                disabled={isDeleting}
                                onPress={() => confirmDelete(item)}
                                activeOpacity={isDeleting ? 1 : 0.7}
                                style={{
                                    paddingVertical: 10,
                                    paddingHorizontal: 14,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: C.black,
                                    backgroundColor: C.white,
                                    opacity: isDeleting ? 0.5 : 1,
                                }}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator color={C.black} />
                                ) : (
                                    <Text style={{ color: C.black, fontWeight: "800" }}>ลบ</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderGridCard = ({ item }: { item: CatalogItem }) => {
        const isDeleting = deletingId === item.id;
        return (
            <View
                style={{
                    width: CARD_W,
                    backgroundColor: C.white,
                    borderRadius: 14,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: C.gray200,
                    marginBottom: GUTTER,
                }}
            >
                <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: "100%", height: CARD_W }} // square
                />
                <View style={{ padding: 10 }}>
                    <Text style={{ fontWeight: "800", color: C.black }} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {!!item.category && (
                        <Text style={{ marginTop: 2, color: C.gray600 }} numberOfLines={1}>
                            {item.category}
                        </Text>
                    )}
                    {item.price != null && (
                        <Text style={{ marginTop: 2, color: C.gray900 }}>
                            ฿{Number(item.price).toLocaleString()}
                        </Text>
                    )}

                    {/* actions: แคบ ๆ ใช้ปุ่มเล็ก 2 อัน */}
                    <View style={{ marginTop: 8, flexDirection: "row", gap: 6 }}>
                        <Btn
                            title="แก้ไข"
                            variant="outline"
                            onPress={() =>
                                router.push({ pathname: "/admin/catalog/[id]/edit", params: { id: item.id } })
                            }
                            style={{ flex: 1, paddingVertical: 8 }}
                        />
                        <TouchableOpacity
                            disabled={isDeleting}
                            onPress={() => confirmDelete(item)}
                            activeOpacity={isDeleting ? 1 : 0.7}
                            style={{
                                flex: 1,
                                paddingVertical: 8,
                                alignItems: "center",
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: C.black,
                                backgroundColor: C.white,
                                opacity: isDeleting ? 0.5 : 1,
                            }}
                        >
                            {isDeleting ? (
                                <ActivityIndicator color={C.black} />
                            ) : (
                                <Text style={{ color: C.black, fontWeight: "800" }}>ลบ</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color={C.black} />
                    <Text style={{ marginTop: 10, color: C.gray600 }}>กำลังโหลด…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
            <FlatList
                data={items}
                keyExtractor={(it) => it.id}
                // สำคัญ: เปลี่ยน key เมื่อเปลี่ยนจำนวนคอลัมน์ให้ FlatList รีเลย์เอาต์
                key={NUM_COLS}
                numColumns={NUM_COLS}
                columnWrapperStyle={NUM_COLS > 1 ? { gap: GUTTER } : undefined}
                renderItem={viewMode === "grid" ? renderGridCard : renderListCard}
                ListHeaderComponent={Header}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 24,
                }}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}
