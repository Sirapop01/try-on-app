// services/providers/localMediaStore.ts
// ⬇️ เปลี่ยนเป็น legacy
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MediaInput, MediaRecord, MediaStore } from "../mediaStore";

const KEY = "local_tryon_results_v2";
const BASE64: any = (FileSystem as any).EncodingType?.Base64 ?? "base64";

export const localMediaStore: MediaStore = {
  async saveResult(input) {
    let fileUri = "";
    if (input.kind === "base64") {
      fileUri = `${FileSystem.cacheDirectory}result_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(fileUri, input.data, { encoding: BASE64 });
    } else {
      const target = `${FileSystem.cacheDirectory}result_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: input.uri, to: target });
      fileUri = target;
    }

    const rec: MediaRecord = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      displayUri: fileUri,
      createdAt: Date.now(),
      provider: "local",
    };

    const raw = (await AsyncStorage.getItem(KEY)) || "[]";
    const arr: MediaRecord[] = JSON.parse(raw);
    arr.unshift(rec);
    await AsyncStorage.setItem(KEY, JSON.stringify(arr.slice(0, 200)));
    return rec;
  },

  async listResults(limit = 50) {
    const raw = (await AsyncStorage.getItem(KEY)) || "[]";
    const arr: MediaRecord[] = JSON.parse(raw);
    return arr.slice(0, limit);
  },

  async removeResult(id) {
    const raw = (await AsyncStorage.getItem(KEY)) || "[]";
    const arr: MediaRecord[] = JSON.parse(raw);
    const idx = arr.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const fileUri = arr[idx].displayUri;
      try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch {}
      arr.splice(idx, 1);
      await AsyncStorage.setItem(KEY, JSON.stringify(arr));
    }
  },
};
