// app/(tabs)/wardrobe.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    Image,
    FlatList,
    Dimensions,
    TouchableOpacity,
    StatusBar,
    ViewToken,
} from "react-native";
import { Screen } from "../../components/ui";
import { useAuthState } from "../../hooks/useAuth";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    onSnapshot,
    deleteDoc,
    doc,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { Ionicons } from "@expo/vector-icons";
import { ALERT_TYPE, Dialog } from "react-native-alert-notification";
import { useRouter } from "expo-router";

type HistoryDoc = {
    imageUrl: string;
    localUri?: string | null;
    createdAt?: number;
    garmentUrl?: string | null;
    hasGarmentB64?: boolean;
};

type Item = {
    id: string;
    imageUrl: string;
    createdAt: number;
    localUri?: string | null;
};

// ---------- UI sizing ----------
const HORIZONTAL_PADDING = 16;
const { width, height } = Dimensions.get("window");
const PAGE_W = width;

// โหมดเลย์เอาต์
type LayoutMode = 1 | 2 | 4;

export default function Wardrobe() {
    const router = useRouter();
    const { user } = useAuthState();
    const [items, setItems] = useState<Item[]>([]);
    const [layout, setLayout] = useState<LayoutMode>(1); // 1 / 2 / 4
    const [pageIndex, setPageIndex] = useState(0); // สำหรับจุดๆ ใต้การ์ด

    const listRef = useRef<FlatList>(null);

    // subscribe Firestore
    useEffect(() => {
        if (!user?.uid) return;
        const app = getApp();
        const db = getFirestore(app);
        const col = collection(doc(db, "users", user.uid), "wardrobe");
        const q = query(col, orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const rows: Item[] = [];
            snap.forEach((d) => {
                const data = d.data() as HistoryDoc;
                rows.push({
                    id: d.id,
                    imageUrl:
                        data.imageUrl && data.imageUrl.trim() !== ""
                            ? data.imageUrl
                            : (data.localUri ?? ""),
                    localUri: data.localUri ?? null,
                    createdAt: data.createdAt ?? 0,
                });
            });
            setItems(rows);
            setPageIndex(0);
            // เลื่อนกลับไปหน้าแรกเมื่อข้อมูลเปลี่ยน (กัน index ค้าง)
            requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: 0, animated: false }));
        });
        return () => unsub();
    }, [user?.uid]);

    // แบ่งข้อมูลเป็นหน้า ตาม layout (chunk size = 1/2/4)
    const pages: Item[][] = useMemo(() => {
        const size = layout;
        const out: Item[][] = [];
        for (let i = 0; i < items.length; i += size) {
            out.push(items.slice(i, i + size));
        }
        return out;
    }, [items, layout]);

    const confirmDelete = (id: string) => {
        Dialog.show({
            type: ALERT_TYPE.WARNING,
            title: "ลบรูปนี้?",
            textBody: "รูปจะถูกลบออกจาก Wardrobe ของคุณ",
            button: "ลบเลย",
            onPressButton: async () => {
                try {
                    if (!user?.uid) return;
                    const db = getFirestore(getApp());
                    await deleteDoc(doc(doc(db, "users", user.uid), "wardrobe", id));
                    Dialog.show({
                        type: ALERT_TYPE.SUCCESS,
                        title: "ลบแล้ว",
                        textBody: "รายการถูกลบออกเรียบร้อย",
                        autoClose: true,
                    });
                } catch (e: any) {
                    Dialog.show({
                        type: ALERT_TYPE.DANGER,
                        title: "ลบไม่สำเร็จ",
                        textBody: e?.message ?? "เกิดข้อผิดพลาด",
                    });
                }
            },
            autoClose: false,
            closeOnOverlayTap: true,
        });
    };

    // ===== Layout Toggle (ชัดเจนว่าเป็น "Grid") =====
    const LayoutToggle = () => {
        const Btn = ({ n }: { n: LayoutMode }) => {
            const active = layout === n;
            return (
                <TouchableOpacity
                    onPress={() => setLayout(n)}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active ? "#111827" : "#fff",
                        borderWidth: 1,
                        borderColor: active ? "#111827" : "#E5E7EB",
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Grid ${n}`}
                >
                    <Text style={{ color: active ? "#fff" : "#111827", fontWeight: "800", fontSize: 12 }}>
                        {n}
                    </Text>
                </TouchableOpacity>
            );
        };

        return (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                    style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        backgroundColor: "#111827",
                        borderRadius: 999,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <Ionicons name="grid-outline" size={14} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Grid</Text>
                </View>
                <Btn n={1} />
                <Btn n={2} />
                <Btn n={4} />
            </View>
        );
    };

    // คอมโพเนนต์ Card (ชัดเจนขึ้น: ปุ่มทึบ + contrast สูง)
    const Card = ({ item, mode }: { item: Item; mode: LayoutMode }) => {
        const isCloud = /^https?:\/\//i.test(item.imageUrl);
        const displayUri = item.imageUrl || item.localUri || "";
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";

        const cardWidth =
            mode === 4
                ? Math.floor((PAGE_W - HORIZONTAL_PADDING * 2 - 10) / 2)
                : PAGE_W - HORIZONTAL_PADDING * 2;
        const cardHeight =
            mode === 1 ? Math.min(520, Math.floor(height * 0.68))
                : mode === 2 ? Math.min(260, Math.floor(height * 0.34))
                    : Math.min(220, Math.floor(height * 0.28));

        return (
            <View style={{ width: cardWidth, height: cardHeight, borderRadius: 22, backgroundColor: "#fff",
                overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 }, elevation: 4 }}>
                <Image source={{ uri: displayUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />

                {/* top-left badge (ซ่อนใน 4-grid ถ้าอยากโล่ง) */}
                {mode !== 4 }

                {/* ✅ ปุ่มลบ: แสดง "แค่จุดเดียว" */}
                {/* โหมด 1/2: ปุ่มลบมุมขวาบนเหมือนเดิม */}
                {mode !== 4 && (
                    <TouchableOpacity
                        onPress={() => confirmDelete(item.id)}
                        style={{ position: "absolute", top: 12, right: 12,
                            width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(239,68,68,0.9)",
                            alignItems: "center", justifyContent: "center" }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Delete"
                    >
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                )}

                {/* bottom actions */}
                <View style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
                    {/* โหมด 1/2: แสดงวันที่ + ปุ่มมีตัวอักษร */}
                    {mode !== 4 ? (
                        <>
                            <View style={{ backgroundColor: "rgba(17,24,39,0.55)", borderRadius: 12,
                                paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 }}>
                                <Text numberOfLines={1} style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                                    {dateStr}
                                </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                <TouchableOpacity
                                    onPress={() => router.push({ pathname: "/preview", params: { uri: encodeURIComponent(displayUri), date: dateStr } })}
                                    style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
                                        paddingHorizontal: 14, height: 40, borderRadius: 999 }}>
                                    <Ionicons name="image-outline" size={16} color="#111827" />
                                    <Text style={{ color: "#111827", marginLeft: 8, fontSize: 13, fontWeight: "800" }}>Preview</Text>
                                </TouchableOpacity>

                                {/* ไม่ใส่ลบซ้ำด้านล่างแล้ว */}
                            </View>
                        </>
                    ) : (
                        // ✅ โหมด 4: ไอคอนอย่างเดียว (preview + delete) ที่มุมขวาล่าง
                        <View style={{ position: "absolute", right: 0, bottom: 0, flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                                onPress={() => router.push({ pathname: "/preview", params: { uri: encodeURIComponent(displayUri), date: dateStr } })}
                                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(17,24,39,0.75)",
                                    alignItems: "center", justifyContent: "center" }}
                                accessibilityLabel="Preview"
                            >
                                <Ionicons name="image-outline" size={16} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => confirmDelete(item.id)}
                                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(239,68,68,0.9)",
                                    alignItems: "center", justifyContent: "center" }}
                                accessibilityLabel="Delete"
                            >
                                <Ionicons name="trash-outline" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };


    // เรนเดอร์หนึ่ง “หน้า” (paging)
    const renderPage = ({ item: pageItems }: { item: Item[] }) => {
        return (
            <View
                style={{
                    width: PAGE_W,
                    height: "100%",
                    paddingHorizontal: HORIZONTAL_PADDING,
                    backgroundColor: "#fff",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                {layout === 1 && pageItems[0] && <Card item={pageItems[0]} mode={1} />}

                {layout === 2 && (
                    <View style={{ gap: 16, alignItems: "center" }}>
                        {pageItems[0] && <Card item={pageItems[0]} mode={2} />}
                        {pageItems[1] && <Card item={pageItems[1]} mode={2} />}
                    </View>
                )}

                {layout === 4 && (
                    <View
                        style={{
                            width: "100%",
                            flexDirection: "row",
                            flexWrap: "wrap",
                            columnGap: 10,
                            rowGap: 10,
                            justifyContent: "center",
                        }}
                    >
                        {pageItems.map((it) => (
                            <Card key={it.id} item={it} mode={4} />
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // ติดตาม index ของหน้าที่เห็นอยู่ เพื่อแสดงจุดๆ ใต้การ์ด
    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
            if (viewableItems?.length > 0) {
                const v = viewableItems[0];
                if (typeof v.index === "number") setPageIndex(v.index);
            }
        }
    ).current;

    return (
        <Screen>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View
                style={{
                    backgroundColor: "#fff",
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F2F3F5",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="shirt-outline" size={22} color="#111827" />
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>My Wardrobe</Text>
                </View>
                {/* ปุ่มเลือก Grid */}
                <LayoutToggle />
            </View>

            {pages.length === 0 ? (
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "#fff",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: 48,
                            backgroundColor: "#F3F4F6",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 14,
                        }}
                    >
                        <Ionicons name="cloud-upload-outline" size={34} color="#6B7280" />
                    </View>
                    <Text style={{ color: "#111827", fontWeight: "800", fontSize: 16, marginBottom: 6 }}>
                        ยังไม่มีรายการ
                    </Text>
                    <Text style={{ color: "#6B7280", textAlign: "center", lineHeight: 20 }}>
                        บันทึกผลลัพธ์จากหน้า Try-On แล้วกลับมาดูที่นี่ได้ทุกเมื่อ
                    </Text>
                </View>
            ) : (
                <>
                    <View style={{ flex: 1, backgroundColor: "#fff" }}>
                        <FlatList
                            ref={listRef}
                            data={pages}
                            keyExtractor={(_, idx) => `page-${idx}-${layout}`}
                            renderItem={renderPage}
                            horizontal
                            pagingEnabled
                            decelerationRate="fast"
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={PAGE_W}
                            snapToAlignment="center"
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
                        />
                    </View>

                    {/* ตัวบอกตำแหน่งใต้การ์ด: จุด ๆ + m/n */}
                    <View
                        style={{
                            paddingVertical: 10,
                            backgroundColor: "#fff",
                            alignItems: "center",
                            borderTopWidth: 1,
                            borderTopColor: "#F2F3F5",
                        }}
                    >
                        {/* จุด ๆ */}
                        <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                            {pages.map((_, i) => {
                                const active = i === pageIndex;
                                return (
                                    <View
                                        key={`dot-${i}`}
                                        style={{
                                            width: active ? 10 : 6,
                                            height: active ? 10 : 6,
                                            borderRadius: 999,
                                            backgroundColor: active ? "#111827" : "#D1D5DB",
                                            opacity: active ? 1 : 0.8,
                                        }}
                                    />
                                );
                            })}
                        </View>
                        {/* m / n */}
                        <Text style={{ color: "#6B7280", fontSize: 12 }}>
                            {pages.length > 0 ? `${pageIndex + 1} / ${pages.length}` : `0 / 0`}
                        </Text>
                    </View>
                </>
            )}
        </Screen>
    );
}
