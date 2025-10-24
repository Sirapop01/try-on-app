// app/try-on-result.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Screen, PrimaryBtn, GhostBtn } from "../components/ui";
import { useSelectionStore } from "../store/selectionStore";
import { useAuthState } from "../hooks/useAuth";
import { tryOn } from "../services/ml";
import { toDataUri } from "../services/image";
import { APP_CONFIG } from "../config/appConfig";
import { uploadBase64 as uploadToCloudinary } from "../services/providers/cloudinary";
import { addTryOnHistory } from "../services/history";

// ✅ ใช้ react-native-alert-notification สำหรับ Dialog สวย ๆ
import { ALERT_TYPE, Dialog } from "react-native-alert-notification";

/**
 * หมายเหตุ:
 * - อย่าลืมครอบ root ของแอปด้วย <AlertNotificationRoot> ... </AlertNotificationRoot>
 *   ใน App.tsx หรือ _layout.tsx
 */

export default function TryOnResult() {
    const router = useRouter();
    const { user } = useAuthState();
    const { person, garment } = useSelectionStore();

    const [loading, setLoading] = useState(true);
    const [resultB64, setResultB64] = useState<string | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [busy, setBusy] = useState<null | "app" | "device" | "cloud">(null);

    const hasCloudinary =
        !!(APP_CONFIG as any).CLOUDINARY_CLOUD_NAME &&
        !!(APP_CONFIG as any).CLOUDINARY_UPLOAD_PRESET;

    // ---------- helpers: dialog ----------
    const showSuccess = (title: string, textBody?: string, onPressButton?: () => void, buttonText = "ตกลง") =>
        Dialog.show({
            type: ALERT_TYPE.SUCCESS,
            title,
            textBody,
            button: buttonText,
            onPressButton,
            autoClose: true,
            closeOnOverlayTap: true,
        });

    const showError = (title: string, textBody?: string, buttonText = "ปิด") =>
        Dialog.show({
            type: ALERT_TYPE.DANGER,
            title,
            textBody,
            button: buttonText,
            autoClose: true,
            closeOnOverlayTap: true,
        });

    const showInfo = (title: string, textBody?: string, buttonText = "ตกลง") =>
        Dialog.show({
            type: ALERT_TYPE.INFO,
            title,
            textBody,
            button: buttonText,
            autoClose: true,
            closeOnOverlayTap: true,
        });

    // timer แสดงเวลารอผล
    useEffect(() => {
        let t: any;
        if (loading) {
            const start = Date.now();
            t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
        }
        return () => clearInterval(t);
    }, [loading]);

    // ยิง BE เพื่อสร้างภาพ
    useEffect(() => {
        (async () => {
            try {
                if (!person?.base64 || (!garment?.base64 && !garment?.imageUrl)) {
                    showInfo("ข้อมูลไม่ครบ", "กรุณาย้อนกลับไปเลือกภาพคนและ/หรือเสื้ออีกครั้ง", "ย้อนกลับ");
                    router.back();
                    return;
                }
                const { result_b64 } = await tryOn({
                    person_b64: person.base64,
                    garment_b64: garment.base64 ?? undefined,
                    garment_url: garment.imageUrl ?? undefined,
                    relax_validation: true,
                });
                setResultB64(result_b64);
            } catch (e: any) {
                console.error(e);
                showError("สร้างภาพไม่สำเร็จ", e?.message ?? "เกิดข้อผิดพลาดบางอย่าง");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ---------- fs helpers ----------
    const ensureWardrobeDir = async () => {
        const dir = `${(FileSystem as any).documentDirectory}wardrobe/`;
        try {
            await (FileSystem as any).makeDirectoryAsync(dir, { intermediates: true });
        } catch {}
        return dir;
    };

    // เซฟสำเนา “ในแอป” (เสมอใช้ PNG)
    const saveAppCopy = async (b64: string) => {
        const dir = await ensureWardrobeDir();
        const localPath = `${dir}tryon_${Date.now()}.png`;
        await (FileSystem as any).writeAsStringAsync(localPath, b64, { encoding: "base64" });
        return localPath; // file:///.../document/wardrobe/xxx.png
    };

    // ลงประวัติ Firestore (ถ้า login)
    const upsertHistory = async (payload: { localUri: string; imageUrl?: string | null }) => {
        if (!user?.uid) return; // ยังไม่ได้ login ก็ข้าม
        await addTryOnHistory(user.uid, {
            imageUrl: payload.imageUrl ?? null,
            localUri: payload.localUri,
            createdAt: Date.now(),
            garmentUrl: garment?.imageUrl ?? null,
            hasGarmentB64: !!garment?.base64,
        });
    };

    // เซฟลงเครื่อง (MediaLibrary → fallback SAF)
    const saveToDeviceOnly = async (b64: string) => {
        try {
            let perm = await MediaLibrary.getPermissionsAsync();
            if (!perm.granted) perm = await MediaLibrary.requestPermissionsAsync();
            if (!perm.granted) throw new Error("MediaLibDenied");

            const fname = `tryon_${Date.now()}.png`;
            const tmp = `${(FileSystem as any).cacheDirectory}${fname}`;
            await (FileSystem as any).writeAsStringAsync(tmp, b64, { encoding: "base64" });
            await MediaLibrary.saveToLibraryAsync(tmp);
            try {
                await (FileSystem as any).deleteAsync(tmp, { idempotent: true });
            } catch {}
            return true;
        } catch (e: any) {
            const msg = String(e?.message || e);
            if (!/AUDIO|MediaLibDenied/i.test(msg)) throw e;
            // SAF
            const saf = await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (!saf.granted) return false;
            const fname = `tryon_${Date.now()}.png`;
            const uri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
                saf.directoryUri,
                fname,
                "image/png"
            );
            await (FileSystem as any).writeAsStringAsync(uri, b64, { encoding: "base64" });
            return true;
        }
    };

    // ---------- actions: แยกปุ่ม ----------
    // 1) Save in App (ประหยัดเน็ต ไม่อัปโหลด ไม่ลงเครื่อง)
    const onSaveInApp = async () => {
        try {
            if (!resultB64) return;
            setBusy("app");
            const localUri = await saveAppCopy(resultB64);
            await upsertHistory({ localUri });

            showSuccess("บันทึกสำเร็จ", "ภาพของคุณถูกบันทึกไว้ในแอปแล้ว 🎉");
        } catch (e: any) {
            showError("บันทึกไม่สำเร็จ", e?.message ?? "เกิดข้อผิดพลาดระหว่างบันทึก");
        } finally {
            setBusy(null);
        }
    };

    // 2) Save to Device (จะ “เซฟในแอป” อัตโนมัติด้วย)
    const onSaveToDevice = async () => {
        try {
            if (!resultB64) return;
            setBusy("device");
            // save in app
            const localUri = await saveAppCopy(resultB64);
            await upsertHistory({ localUri });
            // save to device
            await saveToDeviceOnly(resultB64);

            // ปุ่ม = ดูใน Wardrobe, ถ้าปิดบน overlay คืออยู่หน้าปัจจุบันต่อ
            showSuccess(
                "บันทึกสำเร็จ",
                "ภาพถูกบันทึกทั้งในแอปและในอัลบั้มเครื่องแล้ว 🎉",
                () => router.push("/(tabs)/wardrobe"),
                "ดูใน Wardrobe"
            );
        } catch (e: any) {
            showError("บันทึกไม่สำเร็จ", e?.message ?? "เกิดข้อผิดพลาดระหว่างบันทึก");
        } finally {
            setBusy(null);
        }
    };

    // 3) Upload to Cloud (แยกปุ่ม—อัป Cloudinary + อัปเดต Firestore) — แสดงเฉพาะมี config
    const onUploadCloud = async () => {
        try {
            if (!resultB64) return;
            if (!hasCloudinary) {
                return showInfo("ยังไม่ได้ตั้งค่า Cloud", "ไม่พบการตั้งค่า Cloudinary ในแอป");
            }
            setBusy("cloud");
            // ensure มี entry ในแอปด้วย
            const localUri = await saveAppCopy(resultB64);
            // upload
            const cloud = await uploadToCloudinary(resultB64, "tryon");
            const imageUrl = (cloud as any).secure_url || (cloud as any).url;
            if (!imageUrl) throw new Error("Cloudinary ไม่ได้ส่ง secure_url กลับมา");
            // update history
            await upsertHistory({ localUri, imageUrl });

            showSuccess("อัปโหลดสำเร็จ", "อัปโหลดขึ้น Cloud แล้ว และบันทึกลงประวัติเรียบร้อย");
        } catch (e: any) {
            showError("อัปโหลดไม่สำเร็จ", e?.message ?? "เกิดข้อผิดพลาดระหว่างอัปโหลด");
        } finally {
            setBusy(null);
        }
    };

    const goBack = () => router.replace("/(tabs)/try-on");

    return (
        <Screen>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
                {loading ? (
                    <>
                        <ActivityIndicator size="large" />
                        <Text style={{ marginTop: 20, fontSize: 16 }}>กำลังสร้างภาพ... {elapsed}s</Text>
                    </>
                ) : resultB64 ? (
                    <>
                        <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>ผลลัพธ์</Text>
                        <Image
                            source={{ uri: toDataUri(resultB64) }}
                            style={{
                                width: "100%",
                                height: 420,
                                borderRadius: 16,
                                marginBottom: 16,
                                backgroundColor: "#eee",
                            }}
                            resizeMode="contain"
                        />

                        {/* ปุ่มแยกตามที่ต้องการ */}
                        <PrimaryBtn
                            title={busy === "app" ? "Saving..." : "Save in App"}
                            onPress={onSaveInApp}
                            disabled={!!busy}
                            style={{ width: "100%", marginBottom: 10 }}
                        />
                        <PrimaryBtn
                            title={busy === "device" ? "Saving..." : "Save to Device (also save in App)"}
                            onPress={onSaveToDevice}
                            disabled={!!busy}
                            style={{ width: "100%", marginBottom: 10 }}
                        />
                        {hasCloudinary && (
                            <PrimaryBtn
                                title={busy === "cloud" ? "Uploading..." : "Upload to Cloud (Cloudinary)"}
                                onPress={onUploadCloud}
                                disabled={!!busy}
                                style={{ width: "100%", marginBottom: 10 }}
                            />
                        )}
                        {!hasCloudinary && (
                            <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 8 }}>
                                Cloud upload is disabled (missing Cloudinary config).
                            </Text>
                        )}

                        <GhostBtn title="Cancel" onPress={goBack} style={{ marginTop: 6, width: "100%" }} />
                    </>
                ) : (
                    <>
                        <Text style={{ color: "red" }}>No result</Text>
                        <GhostBtn title="Back" onPress={goBack} />
                    </>
                )}
            </View>
        </Screen>
    );
}
