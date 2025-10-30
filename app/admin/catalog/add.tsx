// app/admin/catalog/add.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "@/context/AuthContext";
import { addCatalogItemCloudinary } from "@/services/catalog";

// หมวดหมู่ (แก้ไขได้ตามต้องการ)
const CATEGORIES = ["Street", "Casual", "Formal", "Sport", "Oversize"] as const;
type Category = (typeof CATEGORIES)[number];

export default function AdminAddCatalog() {
    const router = useRouter();
    const { user } = useAuth();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<Category>(CATEGORIES[0]);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("ต้องการสิทธิ์", "กรุณาอนุญาตการเข้าถึงรูปภาพ");
            return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // ใช้ตัวที่รองรับทุกเวอร์ชัน
            allowsEditing: true,
            quality: 0.9,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
            // แปลงเป็น JPEG เพื่อกัน HEIC/WebP พัง
            const out = await ImageManipulator.manipulateAsync(
                res.assets[0].uri,
                [],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );
            setImageUri(out.uri);
        }
    };

    const onSubmit = async () => {
        if (!user?.uid) return Alert.alert("ยังไม่ได้ล็อกอิน", "กรุณาเข้าสู่ระบบ");
        if (!title.trim()) return Alert.alert("กรอกไม่ครบ", "กรุณาใส่ชื่อสินค้า");
        if (!imageUri) return Alert.alert("กรอกไม่ครบ", "กรุณาเลือกรูปสินค้า");

        try {
            setSubmitting(true);
            await addCatalogItemCloudinary({
                title: title.trim(),
                description: description.trim(),
                category: category,
                imageUri: imageUri,     // เป็น JPEG แล้ว
                createdByUid: user.uid,
            });
            Alert.alert("สำเร็จ", "เพิ่มสินค้าเรียบร้อย", [
                { text: "ไปหน้ารายการ", onPress: () => router.replace("/admin/catalog") },
                {
                    text: "เพิ่มต่อ",
                    style: "cancel",
                    onPress: () => {
                        setTitle(""); setDescription(""); setCategory(CATEGORIES[0]); setImageUri(null);
                    },
                },
            ]);
        } catch (e: any) {
            console.error(e);
            Alert.alert("ผิดพลาด", e?.message ?? "ไม่สามารถบันทึกได้");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "700" }}>Add Catalog</Text>

            <Text style={{ marginTop: 16, marginBottom: 6 }}>ชื่อสินค้า *</Text>
            <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="เช่น Patterned Shirt"
                style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12 }}
            />

            <Text style={{ marginTop: 16, marginBottom: 6 }}>รายละเอียด</Text>
            <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="รายละเอียดเพิ่มเติม"
                multiline
                style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, minHeight: 90 }}
            />

            <Text style={{ marginTop: 16, marginBottom: 6 }}>หมวดหมู่</Text>
            <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <Picker selectedValue={category} onValueChange={(v: Category) => setCategory(v)}>
                    {CATEGORIES.map((c) => <Picker.Item key={c} label={c} value={c} />)}
                </Picker>
            </View>

            <Text style={{ marginTop: 16, marginBottom: 6 }}>รูปสินค้า *</Text>
            {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: "100%", height: 220, borderRadius: 12 }} />
            ) : (
                <View style={{ height: 180, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }}>
                    <Text>ยังไม่เลือกรูป</Text>
                </View>
            )}

            <TouchableOpacity onPress={pickImage} style={{ marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: "#e5e7eb" }}>
                <Text style={{ textAlign: "center", fontWeight: "700" }}>
                    {imageUri ? "เปลี่ยนรูป" : "เลือกรูปจากคลัง"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                disabled={submitting}
                onPress={onSubmit}
                style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: "#f59e0b", opacity: submitting ? 0.8 : 1 }}>
                {submitting ? <ActivityIndicator /> : <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>บันทึก</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}
