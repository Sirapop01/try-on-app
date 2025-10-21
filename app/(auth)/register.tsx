// app/(auth)/register.tsx
import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useAuthActions } from "../../hooks/useAuth";
import { createUserProfile } from "../../services/userService";
import { useFirebase } from "../../hooks/useFirebase";
import { Link, useRouter } from "expo-router";

export default function RegisterScreen() {
  useFirebase(); // ensure firebase initialized
  const router = useRouter();
  const { signup } = useAuthActions();

  // form states
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [gender, setGender]       = useState<"male"|"female"|"other"|"">("");
  const [height, setHeight]       = useState<string>("");
  const [weight, setWeight]       = useState<string>("");
  const [chest, setChest]         = useState<string>("");
  const [waist, setWaist]         = useState<string>("");
  const [hips, setHips]           = useState<string>("");

  const [loading, setLoading]     = useState(false);

  const validate = () => {
    if (!displayName.trim()) return "กรุณากรอกชื่อที่แสดง";
    if (!email.match(/^\S+@\S+\.\S+$/)) return "อีเมลไม่ถูกต้อง";
    if (password.length < 6) return "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร";
    if (password !== confirm) return "รหัสผ่านไม่ตรงกัน";
    const n = (v:string)=> v ? !isNaN(Number(v)) : true;
    if (!n(height) || !n(weight) || !n(chest) || !n(waist) || !n(hips)) return "ค่าตัวเลขบางช่องไม่ถูกต้อง";
    return null;
  };

  const onRegister = async () => {
    const err = validate();
    if (err) { Alert.alert("ข้อมูลไม่ครบ", err); return; }

    try {
      setLoading(true);
      const cred = await signup(email, password);
      const u = cred.user;

      await createUserProfile(u, {
        displayName: displayName.trim(),
        gender: gender || null,
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        measurements: {
          chest: chest ? Number(chest) : null,
          waist: waist ? Number(waist) : null,
          hips:  hips  ? Number(hips)  : null,
        },
        settings: { keepUploads: true, shareTelemetry: false },
      });

      Alert.alert("สมัครสมาชิกสำเร็จ", "กำลังพาไปหน้าแรก");
      router.replace("/(tabs)/"); // ไปแท็บหลัก
    } catch (e:any) {
      Alert.alert("สมัครไม่สำเร็จ", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 8 }}>สร้างบัญชี</Text>

        <Text>ชื่อที่แสดง</Text>
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

        <Text>เพศ (ไม่บังคับ)</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["male","female","other"] as const).map(g => (
            <TouchableOpacity
              key={g}
              onPress={()=>setGender(g)}
              style={[chip, gender===g && chipActive]}
            >
              <Text style={{ fontWeight: "600" }}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text>ส่วนสูง (ซม.)</Text>
            <TextInput value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="170" style={input}/>
          </View>
          <View style={{ flex: 1 }}>
            <Text>น้ำหนัก (กก.)</Text>
            <TextInput value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="60" style={input}/>
          </View>
        </View>

        <Text style={{ marginTop: 6 }}>สัดส่วน (ซม.) – ไม่บังคับ</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text>อก/หน้าอก</Text>
            <TextInput value={chest} onChangeText={setChest} keyboardType="numeric" placeholder="90" style={input}/>
          </View>
          <View style={{ flex: 1 }}>
            <Text>เอว</Text>
            <TextInput value={waist} onChangeText={setWaist} keyboardType="numeric" placeholder="75" style={input}/>
          </View>
          <View style={{ flex: 1 }}>
            <Text>สะโพก</Text>
            <TextInput value={hips} onChangeText={setHips} keyboardType="numeric" placeholder="95" style={input}/>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRegister}
          disabled={loading}
          style={{
            backgroundColor: "#111827", padding: 16, borderRadius: 12, alignItems: "center",
            marginTop: 12, opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>{loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
          <Text>มีบัญชีแล้ว?</Text>
          <Link href="/(auth)/login"><Text style={{ fontWeight: "700" }}>เข้าสู่ระบบ</Text></Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const input = {
  borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 8,
};

const chip = {
  borderWidth: 1, borderColor: "#d1d5db", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12,
  backgroundColor: "#fff",
};
const chipActive = {
  borderColor: "#111827", backgroundColor: "#e5e7eb",
};
