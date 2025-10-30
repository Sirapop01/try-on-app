import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, Alert, ActivityIndicator } from "react-native";
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

export default function AdminCatalogList() {
    const router = useRouter();
    const { db } = useFirebase();

    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "catalog"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(
            q,
            (snap) => {
                const rows: CatalogItem[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
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

    const renderItem = ({ item }: { item: CatalogItem }) => {
        const isDeleting = deletingId === item.id;
        return (
            <View
                style={{
                    backgroundColor: "white",
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 12,
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                }}
            >
                <View style={{ flexDirection: "row", gap: 12 }}>
                    <Image source={{ uri: item.imageUrl }} style={{ width: 96, height: 96, borderRadius: 10, backgroundColor: "#eee" }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", fontSize: 16 }}>{item.title}</Text>
                        {!!item.category && <Text style={{ marginTop: 4, color: "#6b7280" }}>หมวด: {item.category}</Text>}
                        {item.price != null && (
                            <Text style={{ marginTop: 4, color: "#111827" }}>ราคา: {Number(item.price).toLocaleString()} บาท</Text>
                        )}
                    </View>
                </View>

                <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => router.push("/admin/catalog/add")}
                        style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#e5e7eb" }}
                    >
                        <Text style={{ fontWeight: "700" }}>เพิ่มใหม่</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() =>
                            router.push({ pathname: "/admin/catalog/[id]/edit", params: { id: item.id } })
                        }
                        style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#3b82f6" }}
                    >
                        <Text style={{ color: "white", fontWeight: "700" }}>แก้ไข</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        disabled={isDeleting}
                        onPress={() => confirmDelete(item)}
                        style={{
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            backgroundColor: isDeleting ? "#ef4444aa" : "#ef4444",
                            opacity: isDeleting ? 0.8 : 1,
                        }}
                    >
                        {isDeleting ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>ลบ</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const header = useMemo(
        () => (
            <View style={{ padding: 16, paddingBottom: 8 }}>
                <Text style={{ fontSize: 20, fontWeight: "700" }}>Catalog (Admin)</Text>

                {/* แก้: แสดงปุ่มนี้เฉพาะตอนที่มีรายการอย่างน้อย 1 ชิ้น */}
                {items.length > 0 && (
                    <TouchableOpacity
                        onPress={() => router.push("/admin/catalog/add")}
                        style={{
                            marginTop: 12,
                            alignSelf: "flex-start",
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            borderRadius: 12,
                            backgroundColor: "#f59e0b",
                        }}
                    >
                        <Text style={{ color: "white", fontWeight: "700" }}>+ เพิ่มสินค้า</Text>
                    </TouchableOpacity>
                )}
            </View>
        ),
        [router, items.length] // << ต้องใส่ items.length ด้วย
    );

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 8 }}>กำลังโหลด...</Text>
            </View>
        );
    }

    if (!items.length) {
        return (
            <View style={{ flex: 1 }}>
                {header}
                <View style={{ padding: 16, alignItems: "center" }}>
                    <Text style={{ color: "#6b7280" }}>ยังไม่มีสินค้าในแคตตาล็อก</Text>
                    <TouchableOpacity
                        onPress={() => router.push("/admin/catalog/add")}
                        style={{ marginTop: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#f59e0b" }}
                    >
                        <Text style={{ color: "white", fontWeight: "700" }}>+ เพิ่มชิ้นแรก</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            ListHeaderComponent={header}
        />
    );
}
