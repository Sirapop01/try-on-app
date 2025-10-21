// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link } from "expo-router";
import { useAuthActions } from "../../hooks/useAuth";
import { useFirebase } from "../../hooks/useFirebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function LoginScreen() {
  // ensure firebase initialized
  const { auth } = useFirebase();
  const { login, signup } = useAuthActions();

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
    if (err) return Alert.alert("ข้อมูลไม่ครบ", err);
    try {
      setLoading(true);
      await login(email, password);
    } catch (e: any) {
      Alert.alert("เข้าสู่ระบบไม่สำเร็จ", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };


  const onForgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return Alert.alert("ลืมรหัสผ่าน", "กรุณากรอกอีเมลให้ถูกต้องก่อน");
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("ส่งอีเมลรีเซ็ตแล้ว", "ตรวจสอบกล่องอีเมลของคุณ");
    } catch (e: any) {
      Alert.alert("ส่งอีเมลไม่สำเร็จ", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, padding: 20, justifyContent: "center" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 16 }}>
        Try-On App
      </Text>

      <Text style={{ marginBottom: 6 }}>อีเมล</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      />

      <Text style={{ marginBottom: 6 }}>รหัสผ่าน</Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 12,
          paddingHorizontal: 12,
          marginBottom: 12,
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
          <Text style={{ fontWeight: "600" }}>
            {secure ? "แสดง" : "ซ่อน"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onLogin}
        disabled={loading}
        style={{
          backgroundColor: "#111827",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          marginBottom: 12,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>เข้าสู่ระบบ</Text>
      </TouchableOpacity>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 12,
          alignItems: "center",
        }}
      >
        <TouchableOpacity onPress={onForgot} disabled={loading}>
          <Text style={{ fontWeight: "600" }}>ลืมรหัสผ่าน?</Text>
        </TouchableOpacity>

        <Link href="/(auth)/register">
          <Text style={{ fontWeight: "700" }}>ไปหน้า Register</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
