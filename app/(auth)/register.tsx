// app/(auth)/register.tsx
import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, useRouter } from "expo-router";
import { useAuthActions } from "../../hooks/useAuth";
import { createUserProfile } from "../../services/user";
import { useFirebase } from "../../hooks/useFirebase";
import { ALERT_TYPE, Dialog, Toast } from "react-native-alert-notification";

export default function RegisterScreen() {
  useFirebase(); // ensure Firebase initialized
  const router = useRouter();
  const { signup } = useAuthActions();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValid = useMemo(() => /^\S+@\S+\.\S+$/.test(email), [email]);
  const pwEnough = password.length >= 6;
  const pwMatch = confirm.length > 0 && password === confirm;

  const validate = () => {
    if (!emailValid) return "อีเมลไม่ถูกต้อง";
    if (!pwEnough) return "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร";
    if (!pwMatch) return "รหัสผ่านไม่ตรงกัน";
    return null;
  };

  const onRegister = async () => {
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
      const cred = await signup(email.trim(), password);
      const u = cred.user;

      await createUserProfile(u, {
        displayName: displayName.trim() || null,
      });

      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: "สมัครสมาชิกสำเร็จ",
        textBody: "ยินดีต้อนรับ!",
      });
      router.replace("/(tabs)");
    } catch (e: any) {
      Dialog.show({
        type: ALERT_TYPE.DANGER,
        title: "สมัครไม่สำเร็จ",
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
            contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
        >
          {/* Header with Logo */}
          <View style={{ alignItems: "center", marginTop: 16, marginBottom: 18 }}>
            <Image
                source={require("../../assets/images/logo.png")}
                style={{ width: 256, height: 256, borderRadius: 12 }}
                resizeMode="contain"
            />
            <Text style={{ fontSize: 26, fontWeight: "800" }}>สร้างบัญชี</Text>
            <Text style={{ color: "#6B7280", marginTop: 2 }}>
              สมัครง่าย ๆ ไม่กี่ขั้นตอน
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
            {/* Display name */}
            <Text style={{ marginBottom: 6 }}>ชื่อที่แสดง (ไม่บังคับ)</Text>
            <Field
                icon="person-outline"
                children={
                  <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="เช่น Sirapop"
                      style={styles.inputInner}
                  />
                }
            />

            {/* Email */}
            <Text style={{ marginBottom: 6, marginTop: 10 }}>อีเมล</Text>
            <Field
                icon="mail-outline"
                status={email.length ? (emailValid ? "ok" : "warn") : undefined}
                children={
                  <TextInput
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="you@example.com"
                      style={styles.inputInner}
                  />
                }
            />
            {!!email.length && !emailValid && (
                <Helper text="รูปแบบอีเมลไม่ถูกต้อง" />
            )}

            {/* Password */}
            <Text style={{ marginBottom: 6, marginTop: 10 }}>รหัสผ่าน</Text>
            <Field
                icon="lock-closed-outline"
                status={password.length ? (pwEnough ? "ok" : "warn") : undefined}
                right={
                  <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                    <Text style={{ fontWeight: "700", color: "#111827" }}>
                      {showPw ? "ซ่อน" : "แสดง"}
                    </Text>
                  </TouchableOpacity>
                }
                children={
                  <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPw}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      style={styles.inputInner}
                  />
                }
            />
            {!!password.length && !pwEnough && (
                <Helper text="รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" />
            )}

            {/* Confirm */}
            <Text style={{ marginBottom: 6, marginTop: 10 }}>ยืนยันรหัสผ่าน</Text>
            <Field
                icon="checkmark-done-outline"
                status={confirm.length ? (pwMatch ? "ok" : "warn") : undefined}
                right={
                  <TouchableOpacity onPress={() => setShowCf((v) => !v)} hitSlop={8}>
                    <Text style={{ fontWeight: "700", color: "#111827" }}>
                      {showCf ? "ซ่อน" : "แสดง"}
                    </Text>
                  </TouchableOpacity>
                }
                children={
                  <TextInput
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!showCf}
                      placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                      style={styles.inputInner}
                  />
                }
            />
            {!!confirm.length && !pwMatch && (
                <Helper text="รหัสผ่านไม่ตรงกัน" />
            )}

            {/* CTA */}
            <TouchableOpacity
                onPress={onRegister}
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
                {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </Text>
            </TouchableOpacity>

            {/* Fine print */}
            <Text
                style={{
                  color: "#6B7280",
                  fontSize: 12,
                  marginTop: 10,
                  textAlign: "center",
                }}
            >
              การสมัครถือว่ายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว
            </Text>
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
            <Text style={{ color: "#6B7280", fontSize: 12 }}>มีบัญชีแล้ว?</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
          </View>

          {/* Link to Login */}
          <View style={{ alignItems: "center" }}>
            <Link href="/(auth)/login">
              <Text style={{ fontWeight: "800", color: "#111827" }}>
                เข้าสู่ระบบ
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

/* ---------- Small UI helpers ---------- */
function Field({
                 icon,
                 children,
                 right,
                 status,
               }: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  right?: React.ReactNode;
  status?: "ok" | "warn";
}) {
  const border =
      status === "ok" ? "#10B981" : status === "warn" ? "#F59E0B" : "#D1D5DB";
  return (
      <View
          style={{
            borderWidth: 1,
            borderColor: border,
            borderRadius: 12,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
      >
        <Ionicons name={icon} size={18} color="#111827" />
        <View style={{ flex: 1, marginLeft: 8 }}>{children}</View>
        {!!right && <View style={{ marginLeft: 8 }}>{right}</View>}
      </View>
  );
}

function Helper({ text }: { text: string }) {
  return (
      <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 6 }}>{text}</Text>
  );
}

const styles = {
  inputInner: { paddingVertical: 12 },
} as const;
