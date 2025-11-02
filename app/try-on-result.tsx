// app/try-on-result.tsx — Minimal B/W + SafeArea
// Auto-save to Wardrobe (documentDirectory + AsyncStorage) on success
// Export without build via SAF (Android) / Share Sheet (iOS)

import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    Image,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    useWindowDimensions,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSelectionStore } from "../store/selectionStore";
import { tryOn } from "../services/ml";
import { toDataUri } from "../services/image";

const C = {
    black: "#000",
    white: "#fff",
    gray600: "#4B5563",
    gray500: "#9CA3AF",
    gray200: "#E5E7EB",
    gray100: "#F3F4F6",
};

type HistoryItem = { uri: string; ts: number };
const HISTORY_KEY = "tryon_history_v1";
const HISTORY_DIR = (FileSystem as any).documentDirectory + "tryon-history/";

function Btn({
                 title,
                 onPress,
                 outline = false,
                 disabled = false,
                 style,
             }: {
    title: string;
    onPress?: () => void;
    outline?: boolean;
    disabled?: boolean;
    style?: any;
}) {
    return (
        <TouchableOpacity
            onPress={disabled ? undefined : onPress}
            activeOpacity={disabled ? 1 : 0.7}
            style={[
                {
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.black,
                    backgroundColor: outline ? C.white : C.black,
                    opacity: disabled ? 0.5 : 1,
                },
                style,
            ]}
        >
            <Text style={{ color: outline ? C.black : C.white, fontWeight: "800", textAlign: "center" }}>{title}</Text>
        </TouchableOpacity>
    );
}

export default function TryOnResult() {
    const router = useRouter();
    const { person, garment } = useSelectionStore();
    const { width: winW } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [resultB64, setResultB64] = useState<string | null>(null);
    const [elapsed, setElapsed] = useState(0);

    // export actions state
    const [savingFiles, setSavingFiles] = useState(false);
    const [sharing, setSharing] = useState(false);

    // prevent duplicate auto-save
    const [autoSaved, setAutoSaved] = useState(false);
    const [lastSavedUri, setLastSavedUri] = useState<string | null>(null);

    const imageHeight = useMemo(() => {
        const maxH = 520;
        const h = Math.min(Math.round((winW - 40) * 1.25), maxH);
        return Math.max(280, h);
    }, [winW]);

    useEffect(() => {
        let t: any;
        if (loading) {
            const s = Date.now();
            t = setInterval(() => setElapsed(Math.floor((Date.now() - s) / 1000)), 1000);
        }
        return () => clearInterval(t);
    }, [loading]);

    // call ML
    useEffect(() => {
        (async () => {
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
                Alert.alert("Failed", e?.message ?? "Something went wrong");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // helpers for Wardrobe
    const ensureHistoryDir = async () => {
        const info = await (FileSystem as any).getInfoAsync(HISTORY_DIR);
        if (!info.exists) await (FileSystem as any).makeDirectoryAsync(HISTORY_DIR, { intermediates: true });
    };
    const appendHistory = async (item: HistoryItem) => {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const list: HistoryItem[] = raw ? JSON.parse(raw) : [];
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...list]));
    };

    // AUTO-SAVE once when result is ready
    useEffect(() => {
        (async () => {
            if (!resultB64 || autoSaved) return;
            try {
                await ensureHistoryDir();
                const ts = Date.now();
                const fileUri = HISTORY_DIR + `tryon_${ts}.png`;
                await (FileSystem as any).writeAsStringAsync(fileUri, resultB64, { encoding: "base64" });
                await appendHistory({ uri: fileUri, ts });
                setLastSavedUri(fileUri);
                setAutoSaved(true);
            } catch (e) {
                console.warn("Auto-save failed:", e);
            }
        })();
    }, [resultB64, autoSaved]);

    // Export: Save to Files (Android SAF / iOS Share Sheet)
    const saveToFiles = async () => {
        if (!resultB64 || savingFiles) return;
        setSavingFiles(true);
        try {
            const filename = `tryon_${Date.now()}.png`;
            if (Platform.OS === "android") {
                const res = await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (!res.granted) {
                    Alert.alert("Permission required", "Please select a folder to save the image.");
                    return;
                }
                const uri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
                    res.directoryUri,
                    filename,
                    "image/png"
                );
                await (FileSystem as any).writeAsStringAsync(uri, resultB64, { encoding: "base64" });
                Alert.alert("Saved", "Image saved to the selected folder.");
            } else {
                const tmp = `${(FileSystem as any).cacheDirectory}${filename}`;
                await (FileSystem as any).writeAsStringAsync(tmp, resultB64, { encoding: "base64" });
                const avail = await Sharing.isAvailableAsync();
                if (avail) {
                    await Sharing.shareAsync(tmp, { mimeType: "image/png", dialogTitle: "Save or Share" });
                } else {
                    Alert.alert("Not available", "Sharing is not available on this device.");
                }
            }
        } catch (e: any) {
            Alert.alert("Save failed", e?.message ?? "Unknown error");
        } finally {
            setSavingFiles(false);
        }
    };

    const shareImage = async () => {
        if (!resultB64 || sharing) return;
        setSharing(true);
        try {
            const filename = `tryon_${Date.now()}.png`;
            const tmp = `${(FileSystem as any).cacheDirectory}${filename}`;
            await (FileSystem as any).writeAsStringAsync(tmp, resultB64, { encoding: "base64" });
            const avail = await Sharing.isAvailableAsync();
            if (avail) {
                await Sharing.shareAsync(tmp, { mimeType: "image/png", dialogTitle: "Save or Share" });
            } else {
                Alert.alert("Not available", "Sharing is not available on this device.");
            }
        } catch (e: any) {
            Alert.alert("Share failed", e?.message ?? "Unknown error");
        } finally {
            setSharing(false);
        }
    };

    const goBack = () => router.replace("/(tabs)/try-on");

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
                <Text style={{ fontWeight: "800", fontSize: 18, textAlign: "center", marginBottom: 12, color: C.black }}>
                    Result
                </Text>

                {loading ? (
                    <View style={{ alignItems: "center", justifyContent: "center", marginTop: 40 }}>
                        <ActivityIndicator size="large" />
                        <Text style={{ marginTop: 16, color: C.gray500 }}>Generating result… {elapsed}s</Text>
                    </View>
                ) : resultB64 ? (
                    <>
                        <View
                            style={{
                                borderRadius: 16,
                                overflow: "hidden",
                                borderWidth: 1,
                                borderColor: C.gray200,
                                backgroundColor: C.gray100,
                            }}
                        >
                            <Image source={{ uri: toDataUri(resultB64) }} style={{ width: "100%", height: imageHeight }} />
                        </View>

                        {autoSaved && lastSavedUri ? (
                            <Text style={{ color: C.gray600, fontSize: 12, marginTop: 8 }}>
                                Auto-saved to Wardrobe: {lastSavedUri.replace((FileSystem as any).documentDirectory, "")}
                            </Text>
                        ) : null}

                        <View style={{ marginTop: 16, gap: 10 }}>
                            <Btn title={savingFiles ? "Saving…" : "Save to Files"} onPress={saveToFiles} disabled={savingFiles} />
                            <Btn title={sharing ? "Sharing…" : "Share / Save…"} onPress={shareImage} disabled={sharing} />
                            <Btn title="Cancel" onPress={goBack} outline />
                        </View>
                    </>
                ) : (
                    <View style={{ alignItems: "center", justifyContent: "center", marginTop: 40, gap: 12 }}>
                        <Text style={{ color: C.gray600 }}>No result</Text>
                        <Btn title="Back" onPress={goBack} outline />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
