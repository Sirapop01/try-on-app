import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuthActions } from "../../hooks/useAuth";
import { createUserProfile } from "../../services/user";
import { useFirebase } from "../../hooks/useFirebase";

export default function RegisterScreen() {
  useFirebase(); // ensure Firebase initialized
  const router = useRouter();
  const { signup } = useAuthActions();

  // ✅ เก็บเฉพาะที่จำเป็นต่อการสมัคร
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return "อีเมลไม่ถูกต้อง";
    if (password.length < 6) return "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร";
    if (password !== confirm) return "รหัสผ่านไม่ตรงกัน";
    return null;
  };

  const onRegister = async () => {
    const err = validate();
    if (err) return Alert.alert("ข้อมูลไม่ครบ", err);
    try {
      setLoading(true);
      const cred = await signup(email.trim(), password);
      const u = cred.user;

      // สร้างโปรไฟล์เบื้องต้น (ส่วนอื่นไปแก้ทีหลัง)
      await createUserProfile(u, {
        displayName: displayName.trim() || null,
      });

      Alert.alert("สมัครสมาชิกสำเร็จ", "ยินดีต้อนรับ!");
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("สมัครไม่สำเร็จ", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
      <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 8 }}>
            สร้างบัญชี
          </Text>

          <Text>ชื่อที่แสดง (ไม่บังคับ)</Text>
          <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="เช่น Sirapop"
              style={input}
          />

          <Text>อีเมล</Text>
          <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              style={input}
          />

          <Text>รหัสผ่าน</Text>
          <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              style={input}
          />

          <Text>ยืนยันรหัสผ่าน</Text>
          <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="••••••••"
              style={input}
          />

          <TouchableOpacity
              onPress={onRegister}
              disabled={loading}
              style={{
                backgroundColor: "#111827",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 12,
                opacity: loading ? 0.7 : 1,
              }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
            <Text>มีบัญชีแล้ว?</Text>
            <Link href="/(auth)/login">
              <Text style={{ fontWeight: "700" }}>เข้าสู่ระบบ</Text>
            </Link>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={{ color: "#6B7280" }}>
              สมัครเสร็จแล้วไปที่ Profile → Edit เพื่อเพิ่มรูปโปรไฟล์/ข้อมูลอื่น ๆ ได้
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const input = {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
} as const;
