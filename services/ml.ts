// services/ml.ts
import { APP_CONFIG } from "../config/appConfig";
// ✅ ใช้ legacy ให้ตรงกับคำเตือนของ SDK 54
import * as FileSystem from "expo-file-system/legacy";

export type TryOnParams = {
    person_b64: string;
    garment_b64?: string;
    garment_url?: string;
    relax_validation?: boolean;
    filenamePerson?: string;
    filenameGarment?: string;
};

const CACHE_DIR =
    // ทั้งสองตัวมีใน legacy อยู่แล้ว
    (FileSystem as any).cacheDirectory ??
    (FileSystem as any).documentDirectory ??
    "";

async function writeB64ToTmp(b64: string, name = `img_${Date.now()}.jpg`) {
    const path = `${CACHE_DIR}${name}`;
    // ✅ ใช้ "base64" (string) แทน enum ที่บางเวอร์ชันไม่มี
    await (FileSystem as any).writeAsStringAsync(path, b64, { encoding: "base64" });
    return path;
}

async function downloadToTmp(url: string, name = `dl_${Date.now()}.jpg`) {
    const path = `${CACHE_DIR}${name}`;
    const { status, uri } = await (FileSystem as any).downloadAsync(url, path);
    if (status < 200 || status >= 300) throw new Error(`Download failed: ${status}`);
    return uri;
}

export async function tryOn(params: TryOnParams) {
    const {
        person_b64,
        garment_b64,
        garment_url,
        relax_validation = true,
        filenamePerson = "person.jpg",
        filenameGarment = "garment.jpg",
    } = params;

    if (!person_b64) throw new Error("person_b64 is required");
    if (!garment_b64 && !garment_url) throw new Error("Provide garment_b64 or garment_url");

    const personPath = await writeB64ToTmp(person_b64, filenamePerson);
    const garmentPath = garment_b64
        ? await writeB64ToTmp(garment_b64, filenameGarment)
        : await downloadToTmp(garment_url!, filenameGarment);

    const fd = new FormData();
    // ⬇️ TS ของ RN ไม่ตรง DOM → ให้ ts-ignore ตรงจุด runtime-only
    // @ts-ignore
    fd.append("file", { uri: personPath, name: filenamePerson, type: "image/jpeg" });
    // @ts-ignore
    fd.append("garm_img", { uri: garmentPath, name: filenameGarment, type: "image/jpeg" });
    fd.append("relax_validation", String(relax_validation));

    const url = `${APP_CONFIG.ML_BACKEND_URL}/api/try-on`;

    try {
        // ห้ามตั้ง Content-Type เอง ปล่อย RN ใส่ boundary ให้
        const res = await fetch(url, { method: "POST", body: fd });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(payload?.detail ?? `HTTP ${res.status}`);
        if (!payload?.image_base64) throw new Error("No image_base64 in response");

        return { result_b64: payload.image_base64 };
    } finally {
        try { await (FileSystem as any).deleteAsync(personPath, { idempotent: true }); } catch {}
        try { await (FileSystem as any).deleteAsync(garmentPath, { idempotent: true }); } catch {}
    }
}
