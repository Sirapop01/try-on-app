// app/(auth)/login.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Image,
    ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { useAuthActions } from "../../hooks/useAuth";
import { useFirebase } from "../../hooks/useFirebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { ALERT_TYPE, Dialog, Toast } from "react-native-alert-notification";

export default function LoginScreen() {
    const { auth } = useFirebase(); // ensure firebase inited
    const { login } = useAuthActions();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [secure, setSecure] = useState(true);
    const [loading, setLoading] = useState(false);

    const validate = () => {
        if (!email.trim()) return "กรุณากรอกอีเมล";
        if (!/^\S+@\S+\.\S+$/.test(email)) return "รูปแบบอีเมลไม่ถูกต้อง";
        if (!password) return "กรุณากรอกรหัสผ่าน";
        return null;
    };

    const onLogin = async () => {
        const err = validate();
        if (err) {
            Dialog.show({
                type: ALERT_TYPE.WARNING,
                title: "ข้อมูลไม่ครบ",
                textBody: err,
                button: "ตกลง",
            });
            return;
        }
        try {
            setLoading(true);
            await login(email.trim(), password);
            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: "สำเร็จ",
                textBody: "เข้าสู่ระบบเรียบร้อย",
            });
        } catch (e: any) {
            Dialog.show({
                type: ALERT_TYPE.DANGER,
                title: "เข้าสู่ระบบไม่สำเร็จ",
                textBody: e?.message ?? "Unknown error",
                button: "ปิด",
            });
        } finally {
            setLoading(false);
        }
    };

    const onForgot = async () => {
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            Dialog.show({
                type: ALERT_TYPE.WARNING,
                title: "ลืมรหัสผ่าน",
                textBody: "กรุณากรอกอีเมลให้ถูกต้องก่อน",
                button: "ตกลง",
            });
            return;
        }
        try {
            setLoading(true);
            await sendPasswordResetEmail(auth, email.trim());
            Dialog.show({
                type: ALERT_TYPE.SUCCESS,
                title: "ส่งอีเมลรีเซ็ตแล้ว",
                textBody: "กรุณาตรวจสอบกล่องอีเมลของคุณ",
                button: "ตกลง",
            });
        } catch (e: any) {
            Dialog.show({
                type: ALERT_TYPE.DANGER,
                title: "ส่งอีเมลไม่สำเร็จ",
                textBody: e?.message ?? "Unknown error",
                button: "ปิด",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: "#F3F4F6" }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: 20,
                    justifyContent: "center",
                }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header with Logo */}
                <View style={{ alignItems: "center", marginBottom: 18 }}>
                    <Image
                        source={require("../../assets/images/logo.png")}
                        style={{ width: 256, height: 256, marginBottom: 2, borderRadius: 12 }}
                        resizeMode="contain"
                    />
                    <Text style={{ fontSize: 26, fontWeight: "800" }}>Try-On App</Text>
                    <Text style={{ color: "#6B7280", marginTop: 2 }}>
                        สวมใส่ง่าย แค่เลือกภาพแล้วลองเลย
                    </Text>
                </View>

                {/* Card */}
                <View
                    style={{
                        backgroundColor: "white",
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        shadowColor: "#000",
                        shadowOpacity: 0.06,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                    }}
                >
                    <Text style={{ marginBottom: 6 }}>อีเมล</Text>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="you@example.com"
                        style={input}
                    />

                    <Text style={{ marginBottom: 6, marginTop: 6 }}>รหัสผ่าน</Text>
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: "#D1D5DB",
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={secure}
                            placeholder="••••••••"
                            style={{ flex: 1, paddingVertical: 12 }}
                        />
                        <TouchableOpacity onPress={() => setSecure((s) => !s)} hitSlop={8}>
                            <Text style={{ fontWeight: "700", color: "#111827" }}>
                                {secure ? "แสดง" : "ซ่อน"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={onForgot}
                        disabled={loading}
                        style={{ alignSelf: "flex-end", marginTop: 10 }}
                    >
                        <Text style={{ fontWeight: "600", color: "#111827" }}>
                            ลืมรหัสผ่าน?
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onLogin}
                        disabled={loading}
                        style={{
                            backgroundColor: "#111827",
                            padding: 14,
                            borderRadius: 12,
                            alignItems: "center",
                            marginTop: 14,
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        <Text style={{ color: "white", fontWeight: "700" }}>
                            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginVertical: 16,
                        paddingHorizontal: 6,
                    }}
                >
                    <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
                    <Text style={{ color: "#6B7280", fontSize: 12 }}>ยังไม่มีบัญชี?</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
                </View>

                {/* Sign up row */}
                <View style={{ alignItems: "center" }}>
                    <Link href="/(auth)/register">
                        <Text style={{ fontWeight: "800", color: "#111827" }}>
                            สมัครสมาชิก
                        </Text>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const input = {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
} as const;
