// app/not-authorized.tsx
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function NotAuthorized() {
    const router = useRouter();
    return (
        <View style={{ flex: 1, padding: 20, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700" }}>ไม่มีสิทธิ์เข้าถึง</Text>
            <Text style={{ marginTop: 8, textAlign: "center" }}>
                หน้านี้สำหรับผู้ใช้ที่เป็น admin เท่านั้น
            </Text>

            <TouchableOpacity
                onPress={() => router.replace("/")}
                style={{ marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: "#eee" }}
            >
                <Text>กลับหน้าแรก</Text>
            </TouchableOpacity>
        </View>
    );
}
