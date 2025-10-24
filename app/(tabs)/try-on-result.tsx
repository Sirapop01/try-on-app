import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Screen, PrimaryBtn, GhostBtn } from "../../components/ui";
import { useSelectionStore } from "../../store/selectionStore";
import { tryOn } from "../../services/ml";
import { toDataUri } from "../../services/image";

export default function TryOnResult() {
    const router = useRouter();
    const { person, garment } = useSelectionStore();

    const [loading, setLoading] = useState(true);
    const [resultB64, setResultB64] = useState<string | null>(null);
    const [elapsed, setElapsed] = useState(0);

    // --- ใช้ timer แสดงเวลาที่ผ่านไป ---
    useEffect(() => {
        let timer: any;
        if (loading) {
            const start = Date.now();
            timer = setInterval(() => {
                setElapsed(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [loading]);

    // --- ยิง API ไป backend ---
    useEffect(() => {
        const run = async () => {
            try {
                if (!person?.base64 || (!garment?.base64 && !garment?.imageUrl)) {
                    Alert.alert("Missing Data", "Please go back and select again.");
                    router.back();
                    return;
                }
                const res = await tryOn({
                    person_b64: person.base64,
                    garment_b64: garment.base64,
                    garment_url: garment.imageUrl,
                });
                setResultB64(res.result_b64);
            } catch (e: any) {
                console.error(e);
                Alert.alert("Failed", e?.message ?? "Something went wrong");
            } finally {
                setLoading(false);
            }
        };
        run();
    }, []);

    // --- ฟังก์ชันเซฟรูป ---
    const saveResult = async () => {
        try {
            if (!resultB64) return;

            // -------- 1) พยายามเซฟด้วย MediaLibrary ปกติ --------
            try {
                // อย่าส่งพารามิเตอร์ใด ๆ ให้ get/request บน Android (Expo Go)
                let perm = await MediaLibrary.getPermissionsAsync();
                if (!perm.granted) {
                    perm = await MediaLibrary.requestPermissionsAsync();
                }
                if (!perm.granted) throw new Error("MediaLibDenied");

                // เขียนไฟล์ลง cache
                const fname = `tryon_${Date.now()}.png`;
                const tmpPath = `${(FileSystem as any).cacheDirectory}${fname}`;
                await (FileSystem as any).writeAsStringAsync(tmpPath, resultB64, {
                    encoding: "base64",
                });

                await MediaLibrary.saveToLibraryAsync(tmpPath);
                try { await (FileSystem as any).deleteAsync(tmpPath, { idempotent: true }); } catch {}

                Alert.alert("Saved", "Image saved to your gallery.");
                return; // สำเร็จแล้ว ออกเลย
            } catch (e: any) {
                const msg = String(e?.message || e);
                // ถ้าเป็นเคส AUDIO permission หรือ MediaLibDenied → ไปทาง SAF
                if (!/AUDIO|MediaLibDenied/i.test(msg)) {
                    // error อย่างอื่น คายออกไปให้ catch ใหญ่
                    throw e;
                }
            }

            // -------- 2) Fallback: ใช้ Storage Access Framework (SAF) --------
            // ผู้ใช้เลือกโฟลเดอร์เอง แล้วเราสร้างไฟล์ในนั้น
            const perm = await (FileSystem as any).StorageAccessFramework
                .requestDirectoryPermissionsAsync();
            if (!perm.granted) {
                return Alert.alert("Permission required", "Please select a folder to save the image.");
            }

            const fileName = `tryon_${Date.now()}.png`;
            const mime = "image/png";
            const uri = await (FileSystem as any).StorageAccessFramework
                .createFileAsync(perm.directoryUri, fileName, mime);

            // เขียน base64 ลงไฟล์ที่ SAF ให้มา
            await (FileSystem as any).writeAsStringAsync(uri, resultB64, { encoding: "base64" });

            Alert.alert("Saved", "Image saved successfully (via Files).");
        } catch (e: any) {
            Alert.alert("Save failed", e?.message ?? "Unknown error");
        }
    };

    // --- ยกเลิกกลับหน้าแรก ---
    const cancel = () => router.replace("/(tabs)/try-on");

    return (
        <Screen>
            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                }}
            >
                {loading ? (
                    <>
                        <ActivityIndicator size="large" />
                        <Text style={{ marginTop: 20, fontSize: 16 }}>
                            Generating result... {elapsed}s
                        </Text>
                    </>
                ) : resultB64 ? (
                    <>
                        <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>
                            Result
                        </Text>
                        <Image
                            source={{ uri: toDataUri(resultB64) }}
                            style={{
                                width: "100%",
                                height: 400,
                                borderRadius: 16,
                                marginBottom: 20,
                            }}
                        />
                        <PrimaryBtn title="Save to Gallery" onPress={saveResult} />
                        <GhostBtn title="Cancel" onPress={cancel} style={{ marginTop: 12 }} />
                    </>
                ) : (
                    <>
                        <Text style={{ color: "red" }}>No result</Text>
                        <GhostBtn title="Back" onPress={cancel} />
                    </>
                )}
            </View>
        </Screen>
    );
}
