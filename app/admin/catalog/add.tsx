// app/admin/catalog/add.tsx — Top edge-to-edge, bottom safe area, minimal B/W
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
    StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { addCatalogItemCloudinary } from "@/services/catalog";

const C = {
    black: "#000000",
    white: "#FFFFFF",
    gray600: "#4B5563",
    gray500: "#9CA3AF",
    gray300: "#D1D5DB",
    gray200: "#E5E7EB",
    gray100: "#F3F4F6",
};

const CATEGORIES = ["Street", "Casual", "Formal", "Sport", "Oversize"] as const;
type Category = (typeof CATEGORIES)[number];

function Btn({
                 title,
                 onPress,
                 style,
                 disabled,
             }: { title: string; onPress?: () => void; style?: any; disabled?: boolean }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
            style={[
                {
                    backgroundColor: C.black,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.black,
                    opacity: disabled ? 0.6 : 1,
                },
                style,
            ]}
        >
            <Text style={{ color: C.white, fontWeight: "800", textAlign: "center" }}>{title}</Text>
        </TouchableOpacity>
    );
}
function BtnOutline({
                        title,
                        onPress,
                        style,
                        disabled,
                    }: { title: string; onPress?: () => void; style?: any; disabled?: boolean }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
            style={[
                {
                    backgroundColor: C.white,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.black,
                    opacity: disabled ? 0.6 : 1,
                },
                style,
            ]}
        >
            <Text style={{ color: C.black, fontWeight: "800", textAlign: "center" }}>{title}</Text>
        </TouchableOpacity>
    );
}

export default function AdminAddCatalog() {
    const router = useRouter();
    const { user } = useAuth();
    const insets = useSafeAreaInsets(); // ✅ กันเฉพาะขอบล่าง

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
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.9,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
            const out = await ImageManipulator.manipulateAsync(res.assets[0].uri, [], {
                compress: 0.9,
                format: ImageManipulator.SaveFormat.JPEG,
            });
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
                category,
                imageUri,
                createdByUid: user.uid,
            });

            Alert.alert("สำเร็จ", "เพิ่มสินค้าเรียบร้อย", [
                { text: "ไปหน้ารายการ", onPress: () => router.replace("/admin/catalog") },
                {
                    text: "เพิ่มต่อ",
                    style: "cancel",
                    onPress: () => {
                        setTitle("");
                        setDescription("");
                        setCategory(CATEGORIES[0]);
                        setImageUri(null);
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
        <View style={{ flex: 1, backgroundColor: C.white, paddingBottom: insets.bottom }}>
            {/* ทำให้หัววิ่งใต้ status bar / ติ่งกล้อง */}
            <StatusBar barStyle="dark-content" translucent />

            {/* ===== Header (ไม่มี SafeArea บน) ===== */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                    }}
                >
                    <Text style={{ fontSize: 20, fontWeight: "900", color: C.black }}>Add Catalog</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        <BtnOutline title="Back" onPress={() => router.back()} />
                    </View>
                </View>
                <View style={{ height: 1, backgroundColor: C.gray200 }} />
            </View>

            {/* ===== Form ===== */}
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={{ marginTop: 10, marginBottom: 6, color: C.black, fontWeight: "700" }}>ชื่อสินค้า *</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="เช่น Patterned Shirt"
                    placeholderTextColor={C.gray500}
                    style={{
                        borderWidth: 1,
                        borderColor: C.black,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: C.black,
                        backgroundColor: C.white,
                    }}
                />

                <Text style={{ marginTop: 12, marginBottom: 6, color: C.black, fontWeight: "700" }}>รายละเอียด</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="รายละเอียดเพิ่มเติม"
                    placeholderTextColor={C.gray500}
                    multiline
                    style={{
                        borderWidth: 1,
                        borderColor: C.black,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        minHeight: 96,
                        color: C.black,
                        backgroundColor: C.white,
                        textAlignVertical: "top",
                    }}
                />

                <Text style={{ marginTop: 12, marginBottom: 6, color: C.black, fontWeight: "700" }}>หมวดหมู่</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                    style={{
                        borderWidth: 1,
                        borderColor: C.gray200,
                        borderRadius: 10,
                        paddingVertical: 6,
                        paddingHorizontal: 6,
                        backgroundColor: C.white,
                    }}
                >
                    {CATEGORIES.map((c) => {
                        const selected = c === category;
                        return (
                            <TouchableOpacity
                                key={c}
                                onPress={() => setCategory(c)}
                                style={{
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: selected ? C.black : C.gray300,
                                    backgroundColor: selected ? C.black : C.white,
                                }}
                            >
                                <Text style={{ color: selected ? C.white : C.black, fontWeight: "800" }}>{c}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Text style={{ marginTop: 12, marginBottom: 6, color: C.black, fontWeight: "700" }}>รูปสินค้า *</Text>
                {imageUri ? (
                    <Image
                        source={{ uri: imageUri }}
                        style={{ width: "100%", height: 210, borderRadius: 12, borderWidth: 1, borderColor: C.gray200 }}
                    />
                ) : (
                    <View
                        style={{
                            height: 170,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: C.gray200,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: C.gray100,
                        }}
                    >
                        <Text style={{ color: C.gray600 }}>ยังไม่เลือกรูป</Text>
                    </View>
                )}

                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    <BtnOutline title={imageUri ? "เปลี่ยนรูป" : "เลือกรูปจากคลัง"} onPress={pickImage} style={{ flex: 1 }} />
                </View>

                <Btn
                    title={submitting ? "กำลังบันทึก..." : "บันทึก"}
                    onPress={onSubmit}
                    disabled={submitting}
                    style={{ marginTop: 16 }}
                />
                {submitting && (
                    <View style={{ marginTop: 8, alignItems: "center" }}>
                        <ActivityIndicator />
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
