// app/(tabs)/wardrobe.tsx — Minimal Header + Fullscreen Preview + Router Fix
import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    Alert,
    FlatList,
    Dimensions,
    Modal,
    SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const C = {
    black: "#000",
    white: "#fff",
    gray900: "#111827",
    gray700: "#374151",
    gray600: "#4B5563",
    gray500: "#9CA3AF",
    gray300: "#D1D5DB",
    gray200: "#E5E7EB",
    gray100: "#F3F4F6",
};

type HistoryItem = { uri: string; ts: number };
const HISTORY_KEY = "tryon_history_v1";
const HISTORY_DIR = (FileSystem as any).documentDirectory + "tryon-history/";

const GUTTER = 10;
const COLS = 3;
const WIDTH = Dimensions.get("window").width;
const CARD_W = Math.floor((WIDTH - 16 * 2 - GUTTER * (COLS - 1)) / COLS);
const CARD_H = CARD_W; // square

export default function Wardrobe() {
    const router = useRouter();
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // fullscreen viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const raw = await AsyncStorage.getItem(HISTORY_KEY);
            const list: HistoryItem[] = raw ? JSON.parse(raw) : [];
            setItems(list);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openViewer = (index: number) => {
        setViewerIndex(index);
        setViewerOpen(true);
    };
    const closeViewer = () => setViewerOpen(false);

    const prev = () => setViewerIndex((i) => (i - 1 + items.length) % items.length);
    const next = () => setViewerIndex((i) => (i + 1) % items.length);

    const confirmDeleteOne = (it: HistoryItem) => {
        Alert.alert("Delete this item?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        try {
                            await (FileSystem as any).deleteAsync(it.uri, { idempotent: true });
                        } catch {}
                        const remained = items.filter((x) => x.uri !== it.uri);
                        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(remained));
                        setItems(remained);

                        if (viewerOpen) {
                            if (remained.length === 0) setViewerOpen(false);
                            else setViewerIndex((i) => Math.min(i, remained.length - 1));
                        }
                    } catch (e) {
                        Alert.alert("Failed", "Could not delete this item.");
                    }
                },
            },
        ]);
    };

    const confirmClearAll = () => {
        if (items.length === 0) return;
        Alert.alert("Clear all history?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Clear All",
                style: "destructive",
                onPress: async () => {
                    try {
                        try {
                            const dirInfo = await (FileSystem as any).getInfoAsync(HISTORY_DIR);
                            if (dirInfo.exists) {
                                const files = await (FileSystem as any).readDirectoryAsync(HISTORY_DIR);
                                for (const name of files) {
                                    try {
                                        await (FileSystem as any).deleteAsync(HISTORY_DIR + name, { idempotent: true });
                                    } catch {}
                                }
                            }
                        } catch {}
                        await AsyncStorage.removeItem(HISTORY_KEY);
                        setItems([]);
                        setViewerOpen(false);
                    } catch (e) {
                        Alert.alert("Failed", "Could not clear history.");
                    }
                },
            },
        ]);
    };

    const Header = () => (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                {/* Title + count */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: C.black }}>Wardrobe</Text>
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: C.black,
                            borderRadius: 999,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            backgroundColor: C.white,
                        }}
                    >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: C.black }}>
                            {items.length}
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                        onPress={load}
                        style={{
                            borderWidth: 1,
                            borderColor: C.black,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: C.white,
                        }}
                    >
                        <Text style={{ color: C.black, fontWeight: "700" }}>↻ Refresh</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={confirmClearAll}
                        disabled={items.length === 0}
                        style={{
                            borderWidth: 1,
                            borderColor: C.black,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: items.length === 0 ? C.gray100 : C.black,
                        }}
                    >
                        <Text style={{ color: items.length === 0 ? C.gray600 : C.white, fontWeight: "700" }}>
                            🗑 Clear All
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* thin divider */}
            <View style={{ height: 1, backgroundColor: C.gray200, marginTop: 10 }} />
        </View>
    );

    const renderItem = ({ item, index }: { item: HistoryItem; index: number }) => (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openViewer(index)}
            style={{
                width: CARD_W,
                height: CARD_H,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: C.gray200,
                backgroundColor: C.white,
            }}
        >
            <Image source={{ uri: item.uri }} style={{ width: "100%", height: "100%" }} />

            {/* ปุ่มลบเล็ก ๆ มุมบนขวา */}
            <TouchableOpacity
                onPress={() => confirmDeleteOne(item)}
                style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    backgroundColor: "rgba(0,0,0,0.65)",
                    borderRadius: 999,
                }}
            >
                <Text style={{ color: C.white, fontWeight: "700" }}>🗑</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
            {/* Header */}
            <Header />

            {/* Content */}
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
                {loading ? (
                    <Text style={{ color: C.gray500 }}>Loading…</Text>
                ) : items.length === 0 ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
                        <Text style={{ color: C.gray600, textAlign: "center" }}>
                            No saved items yet. Try saving from the Try-On Result screen.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/try-on")}
                            style={{
                                marginTop: 8,
                                paddingVertical: 12,
                                paddingHorizontal: 18,
                                borderRadius: 12,
                                backgroundColor: C.black,
                                borderWidth: 1,
                                borderColor: C.black,
                            }}
                        >
                            <Text style={{ color: C.white, fontWeight: "800" }}>Go to Try-On</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(it) => `${it.ts}`}
                        numColumns={COLS}
                        columnWrapperStyle={{ gap: GUTTER }}
                        contentContainerStyle={{ gap: GUTTER, paddingBottom: 24 }}
                        renderItem={renderItem}
                    />
                )}
            </View>

            {/* Fullscreen Preview */}
            <Modal visible={viewerOpen} animationType="fade" onRequestClose={closeViewer}>
                <SafeAreaView style={{ flex: 1, backgroundColor: C.black }}>
                    {/* Top bar */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                        }}
                    >
                        <Text style={{ color: C.white, fontWeight: "800" }}>
                            {items.length ? `Preview ${viewerIndex + 1}/${items.length}` : "Preview"}
                        </Text>

                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {items[viewerIndex] ? (
                                <TouchableOpacity
                                    onPress={() => confirmDeleteOne(items[viewerIndex])}
                                    style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 10,
                                        backgroundColor: "rgba(255,255,255,0.12)",
                                        borderWidth: 1,
                                        borderColor: "rgba(255,255,255,0.25)",
                                    }}
                                >
                                    <Text style={{ color: C.white, fontWeight: "700" }}>🗑 Delete</Text>
                                </TouchableOpacity>
                            ) : null}

                            <TouchableOpacity
                                onPress={closeViewer}
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 10,
                                    backgroundColor: C.white,
                                }}
                            >
                                <Text style={{ color: C.black, fontWeight: "800" }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Image area */}
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        {items[viewerIndex] ? (
                            <Image
                                source={{ uri: items[viewerIndex].uri }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="contain"
                            />
                        ) : null}
                    </View>

                    {/* Nav buttons */}
                    {items.length > 1 ? (
                        <>
                            <TouchableOpacity
                                onPress={prev}
                                style={{
                                    position: "absolute",
                                    left: 10,
                                    top: "50%",
                                    transform: [{ translateY: -22 }],
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(255,255,255,0.15)",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.25)",
                                }}
                            >
                                <Text style={{ color: C.white, fontSize: 22, fontWeight: "800" }}>‹</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={next}
                                style={{
                                    position: "absolute",
                                    right: 10,
                                    top: "50%",
                                    transform: [{ translateY: -22 }],
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(255,255,255,0.15)",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.25)",
                                }}
                            >
                                <Text style={{ color: C.white, fontSize: 22, fontWeight: "800" }}>›</Text>
                            </TouchableOpacity>
                        </>
                    ) : null}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
