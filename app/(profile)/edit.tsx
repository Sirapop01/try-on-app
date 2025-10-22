// app/(profile)/edit.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuthState } from "../../hooks/useAuth";
import {
    getUserProfile,
    saveUserProfile,
    uploadAvatarAndGetUrl,
    type UserProfileDoc,
} from "../../services/user";
import { ALERT_TYPE, Dialog, Toast } from "react-native-alert-notification";

type Gender = "male" | "female" | "other" | "";

export default function EditProfile() {
    const router = useRouter();
    const { user } = useAuthState();

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [bio, setBio] = useState<string>("");
    const [photoURL, setPhotoURL] = useState<string | null>(null);
    const [gender, setGender] = useState<Gender>("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        (async () => {
            if (!user) return;
            setEmail(user.email ?? "");
            setDisplayName(user.displayName ?? "");
            setPhotoURL(user.photoURL ?? null);

            const prof = await getUserProfile(user.uid);
            if (prof) {
                setDisplayName(prof.displayName ?? user.displayName ?? "");
                setPhotoURL(prof.photoURL ?? user.photoURL ?? null);
                setPhone(prof.phone ?? "");
                setBio(prof.bio ?? "");
                setGender((prof.gender as Gender) ?? "");
            }
            setLoading(false);
        })();
    }, [user?.uid]);

    const canSave = useMemo(
        () => !!displayName.trim() && !saving && !uploading,
        [displayName, saving, uploading]
    );

    const pickAvatar = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
            Dialog.show({
                type: ALERT_TYPE.WARNING,
                title: "ต้องการสิทธิ์รูปภาพ",
                textBody: "โปรดอนุญาตการเข้าถึงรูปภาพเพื่อเปลี่ยนรูปโปรไฟล์",
                button: "เข้าใจแล้ว",
            });
            return;
        }
        const r = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });
        if (r.canceled || !r.assets?.[0]?.uri || !user) return;
        try {
            setUploading(true);
            const url = await uploadAvatarAndGetUrl(r.assets[0].uri, user.uid);
            setPhotoURL(url);
            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: "อัปโหลดแล้ว",
                textBody: "เปลี่ยนรูปโปรไฟล์สำเร็จ",
            });
        } catch (e: any) {
            Dialog.show({
                type: ALERT_TYPE.DANGER,
                title: "อัปโหลดไม่สำเร็จ",
                textBody: e?.message ?? "Unknown error",
                button: "ปิด",
            });
        } finally {
            setUploading(false);
        }
    };

    const onSave = async () => {
        if (!user) return;
        if (!displayName.trim()) {
            Dialog.show({
                type: ALERT_TYPE.WARNING,
                title: "กรอกชื่อที่แสดง",
                textBody: "โปรดกรอก Display name ก่อนบันทึก",
                button: "ตกลง",
            });
            return;
        }
        try {
            setSaving(true);
            await saveUserProfile(user.uid, {
                displayName: displayName.trim(),
                photoURL: photoURL ?? null,
                phone: phone.trim() || null,
                bio: bio.trim() || null,
                gender: (gender || null) as UserProfileDoc["gender"],
            });
            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: "บันทึกแล้ว",
                textBody: "อัปเดตโปรไฟล์สำเร็จ",
            });
            router.back();
        } catch (e: any) {
            Dialog.show({
                type: ALERT_TYPE.DANGER,
                title: "บันทึกไม่สำเร็จ",
                textBody: e?.message ?? "Unknown error",
                button: "ปิด",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 28, backgroundColor: "#F3F4F6" }}>
            {/* Cover */}
            <View
                style={{
                    height: 120,
                    backgroundColor: "#E8EEF9",
                    borderBottomLeftRadius: 24,
                    borderBottomRightRadius: 24,
                }}
            />

            {/* Header Card */}
            <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
                <View
                    style={{
                        backgroundColor: "white",
                        borderRadius: 18,
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
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
                            {photoURL ? (
                                <Image
                                    source={{ uri: photoURL }}
                                    style={{ width: 80, height: 80, borderRadius: 999 }}
                                />
                            ) : (
                                <View
                                    style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 999,
                                        backgroundColor: "#93C5FD",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Ionicons name="camera-outline" size={28} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: "800" }}>
                                {displayName || "Your name"}
                            </Text>
                            <Text style={{ color: "#6B7280", marginTop: 2 }}>
                                {email || "-"}
                            </Text>

                            {/* Gender badge */}
                            {!!gender && (
                                <View
                                    style={{
                                        alignSelf: "flex-start",
                                        marginTop: 8,
                                        backgroundColor: "#EEF2FF",
                                        borderRadius: 999,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                    }}
                                >
                                    <Text
                                        style={{ color: "#3730A3", fontWeight: "700", fontSize: 12 }}
                                    >
                                        {gender}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {uploading && (
                        <Text style={{ color: "#6B7280", marginTop: 10 }}>Uploading...</Text>
                    )}
                </View>
            </View>

            {/* Form Card */}
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <View
                    style={{
                        backgroundColor: "white",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        padding: 16,
                        gap: 12,
                    }}
                >
                    <Label>Display name</Label>
                    <Field icon="person-outline">
                        <TextInput
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Your name"
                            style={styles.inputInner}
                        />
                    </Field>

                    <Label>Email</Label>
                    <Field icon="mail-outline" readonly>
                        <TextInput
                            value={email}
                            editable={false}
                            style={[styles.inputInner, { color: "#6B7280" }]}
                        />
                    </Field>

                    <Label>Phone</Label>
                    <Field icon="call-outline">
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            placeholder="08xxxxxxxx"
                            style={styles.inputInner}
                        />
                    </Field>

                    <Label>Bio</Label>
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                        }}
                    >
                        <TextInput
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell us about yourself..."
                            multiline
                            numberOfLines={4}
                            style={{ minHeight: 96, textAlignVertical: "top" }}
                        />
                    </View>

                    <Label>Gender (optional)</Label>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        {(["male", "female", "other"] as const).map((g) => (
                            <Chip key={g} active={gender === g} onPress={() => setGender(g)}>
                                {g}
                            </Chip>
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={onSave}
                        disabled={!canSave}
                        style={{
                            marginTop: 6,
                            backgroundColor: "#111827",
                            padding: 14,
                            borderRadius: 12,
                            alignItems: "center",
                            opacity: canSave ? 1 : 0.6,
                        }}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{ color: "white", fontWeight: "700" }}>
                                Save Changes
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

/* ---------- Small UI pieces ---------- */
function Label({ children }: { children: React.ReactNode }) {
    return <Text style={{ fontWeight: "700" }}>{children}</Text>;
}

function Field({
                   icon,
                   children,
                   readonly,
               }: {
    icon: keyof typeof Ionicons.glyphMap;
    children: React.ReactNode;
    readonly?: boolean;
}) {
    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: readonly ? "#F3F4F6" : "white",
            }}
        >
            <Ionicons name={icon} size={18} color="#111827" />
            <View style={{ flex: 1, marginLeft: 8 }}>{children}</View>
        </View>
    );
}

function Chip({
                  active,
                  onPress,
                  children,
              }: {
    active?: boolean;
    onPress: () => void;
    children: React.ReactNode;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                borderWidth: 1,
                borderColor: active ? "#111827" : "#D1D5DB",
                backgroundColor: active ? "#E5E7EB" : "white",
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
            }}
        >
            <Text style={{ fontWeight: "700", color: "#111827" }}>{children}</Text>
        </TouchableOpacity>
    );
}

const styles = {
    inputInner: { paddingVertical: 12 },
} as const;
