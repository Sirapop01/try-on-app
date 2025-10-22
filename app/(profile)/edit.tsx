// app/(profile)/edit.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuthState } from "../../hooks/useAuth";
import { getUserProfile, saveUserProfile, uploadAvatarAndGetUrl, type UserProfileDoc } from "../../services/user";

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

    const pickAvatar = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") return Alert.alert("Please allow photo access.");
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
        if (r.canceled || !r.assets?.[0]?.uri || !user) return;
        try {
            setUploading(true);
            const url = await uploadAvatarAndGetUrl(r.assets[0].uri, user.uid);
            setPhotoURL(url);
        } catch (e: any) {
            Alert.alert("Upload failed", e?.message ?? "Unknown error");
        } finally {
            setUploading(false);
        }
    };

    const onSave = async () => {
        if (!user) return;
        if (!displayName.trim()) return Alert.alert("Please enter display name");
        try {
            setSaving(true);
            await saveUserProfile(user.uid, {
                displayName: displayName.trim(),
                photoURL: photoURL ?? null,
                phone: phone.trim() || null,
                bio: bio.trim() || null,
                gender: (gender || null) as UserProfileDoc["gender"],
            });
            Alert.alert("Saved", "Profile updated");
            router.back();
        } catch (e: any) {
            Alert.alert("Save failed", e?.message ?? "Unknown error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <View style={{ flex:1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator/></View>;

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>Edit Profile</Text>

            <View style={{ alignItems: "center", marginTop: 8 }}>
                <TouchableOpacity onPress={pickAvatar}
                                  style={{ width: 96, height: 96, borderRadius: 999, overflow: "hidden", backgroundColor: "#E5E7EB", alignItems:"center", justifyContent:"center" }}>
                    {photoURL ? (
                        <Image source={{ uri: photoURL }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                        <Text style={{ color:"#6B7280" }}>Pick Photo</Text>
                    )}
                </TouchableOpacity>
                {uploading && <Text style={{ marginTop: 6, color:"#6B7280" }}>Uploading...</Text>}
            </View>

            <Text style={{ fontWeight: "600" }}>Display name</Text>
            <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", padding: 12, borderRadius: 10 }}
            />

            <Text style={{ fontWeight: "600", marginTop: 10 }}>Email</Text>
            <TextInput
                value={email}
                editable={false}
                style={{ backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB", padding: 12, borderRadius: 10, color:"#6B7280" }}
            />

            <Text style={{ fontWeight: "600", marginTop: 10 }}>Phone</Text>
            <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="08xxxxxxxx"
                style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", padding: 12, borderRadius: 10 }}
            />

            <Text style={{ fontWeight: "600", marginTop: 10 }}>Bio</Text>
            <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={4}
                style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", padding: 12, borderRadius: 10, minHeight: 96, textAlignVertical: "top" }}
            />

            {/* Gender */}
            <Text style={{ fontWeight: "600", marginTop: 10 }}>Gender (optional)</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
                {(["male","female","other"] as const).map(g => (
                    <TouchableOpacity
                        key={g}
                        onPress={()=>setGender(g)}
                        style={{
                            borderWidth: 1, borderColor: gender===g ? "#111827" : "#d1d5db",
                            paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
                            backgroundColor: gender===g ? "#e5e7eb" : "#fff"
                        }}
                    >
                        <Text style={{ fontWeight: "600" }}>{g}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                onPress={onSave}
                disabled={saving || uploading}
                style={{
                    marginTop: 12,
                    backgroundColor: "#111827",
                    padding: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    opacity: saving || uploading ? 0.6 : 1,
                }}
            >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "white", fontWeight: "700" }}>Save Changes</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}
