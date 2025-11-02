import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getCatalogItemById, updateCatalogItemCloudinary } from "@/services/catalog";
import { Picker } from "@react-native-picker/picker";


const CATEGORIES = ["Street", "Casual", "Formal", "Sport", "Oversize"] as const;

type Category = (typeof CATEGORIES)[number];

type CatalogDoc = {
    id: string;
    title: string;
    description?: string;
    category?: string;
    imageUrl: string;
    [k: string]: any;
};

export default function AdminEditCatalog() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();

    const [initial, setInitial] = useState<CatalogDoc | null>(null);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<Category>(CATEGORIES[0]);
    const [newImageUri, setNewImageUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const doc = await getCatalogItemById(id);
                if (!doc) {
                    Alert.alert("ไม่พบรายการ", "กลับไปยังหน้าเดิม", [{ text: "ตกลง", onPress: () => router.back() }]);
                    return;
                }
                setInitial(doc as any);
                setTitle(doc.title ?? "");
                setDescription(doc.description ?? "");
                setCategory(
                    (CATEGORIES.includes((doc.category ?? "") as Category)
                        ? (doc.category as Category)
                        : CATEGORIES[0]) as Category
                );
            } catch (e) {
                console.error(e);
                Alert.alert("ผิดพลาด", "โหลดข้อมูลไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") return Alert.alert("ต้องการสิทธิ์", "กรุณาอนุญาตการเข้าถึงรูปภาพ");
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.9,
        });
        if (!res.canceled && res.assets?.[0]?.uri) setNewImageUri(res.assets[0].uri);
    };

    const onSave = async () => {
        if (!user?.uid) return Alert.alert("ยังไม่ได้ล็อกอิน", "กรุณาเข้าสู่ระบบ");
        if (!title.trim()) return Alert.alert("กรอกไม่ครบ", "กรุณาใส่ชื่อสินค้า");

        try {
            setSaving(true);
            await updateCatalogItemCloudinary(id, {
                title: title.trim(),
                description: description.trim(),
                category: category.trim(),
                newImageUri,
                updatedByUid: user.uid,
            });
            Alert.alert("บันทึกแล้ว", "ปรับปรุงรายการสำเร็จ", [
                { text: "กลับรายการ", onPress: () => router.replace("/admin/catalog") },
                { text: "อยู่หน้านี้", style: "cancel" },
            ]);
            setNewImageUri(null);
        } catch (e: any) {
            console.error(e);
            Alert.alert("ผิดพลาด", e?.message ?? "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !initial) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 8 }}>กำลังโหลด...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "700" }}>Edit Catalog</Text>

            <Text style={{ marginTop: 16, marginBottom: 6 }}>ชื่อสินค้า *</Text>
            <TextInput value={title} onChangeText={setTitle}
                       style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12 }} />

            <Text style={{ marginTop: 16, marginBottom: 6 }}>รายละเอียด</Text>
            <TextInput value={description} onChangeText={setDescription} multiline
                       style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, minHeight: 90 }} />

            <Text style={{ marginTop: 16, marginBottom: 6 }}>หมวดหมู่</Text>
            <View
                style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 10,
                    overflow: "hidden",
                }}
            >
                <Picker
                    selectedValue={category}
                    onValueChange={(v: Category) => setCategory(v)}
                >
                    {CATEGORIES.map((c) => (
                        <Picker.Item key={c} label={c} value={c} />
                    ))}
                </Picker>
            </View>

            <Text style={{ marginTop: 16, marginBottom: 6 }}>รูปสินค้า</Text>
            <Image
                source={{ uri: newImageUri ?? initial.imageUrl }}
                style={{ width: "100%", height: 220, borderRadius: 12, backgroundColor: "#eee" }}
            />
            <TouchableOpacity onPress={pickImage}
                              style={{ marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: "#e5e7eb" }}>
                <Text style={{ textAlign: "center", fontWeight: "700" }}>
                    {newImageUri ? "เปลี่ยนรูปอีกครั้ง" : "เปลี่ยนรูป"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={saving} onPress={onSave}
                              style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: "#3b82f6", opacity: saving ? 0.8 : 1 }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>บันทึก</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}
