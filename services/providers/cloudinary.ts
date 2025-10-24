// services/providers/cloudinary.ts
// Upload base64/uri → Cloudinary (unsigned preset)
// ทำงานกับ React-Native/Expo ได้แน่นอน

import { APP_CONFIG } from "../../config/appConfig";
import * as FileSystem from "expo-file-system/legacy";

export type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  public_id?: string;
  [k: string]: any;
};

function getCfg() {
  const cloud = (APP_CONFIG as any).CLOUDINARY_CLOUD_NAME as string | undefined;
  const preset = (APP_CONFIG as any).CLOUDINARY_UPLOAD_PRESET as string | undefined;
  const defaultFolder = (APP_CONFIG as any).CLOUDINARY_FOLDER as string | undefined;
  if (!cloud || !preset) {
    throw new Error(
        "Missing Cloudinary config: set APP_CONFIG.CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET."
    );
  }
  return { cloud, preset, defaultFolder };
}

export async function uploadBase64(
    base64: string,
    folder?: string,
    filename?: string
): Promise<CloudinaryUploadResponse> {
  const { cloud, preset, defaultFolder } = getCfg();

  // Cloudinary รองรับ data URI
  const dataUri = `data:image/png;base64,${base64}`;

  const form = new FormData();
  // ⬇️ ใช้ "key, value" ปกติ — อย่าใช้รูปแบบ { name: ... }
  (form as any).append("file", dataUri);
  (form as any).append("upload_preset", preset); // preset เป็น string ชัวร์

  const folderToUse = folder ?? defaultFolder;
  if (folderToUse) (form as any).append("folder", folderToUse);
  if (filename) (form as any).append("public_id", filename.replace(/\.(png|jpg|jpeg)$/i, ""));

  const endpoint = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
  const res = await fetch(endpoint, { method: "POST", body: form });
  const json = (await res.json()) as CloudinaryUploadResponse & { error?: { message: string } };

  if (!res.ok) {
    throw new Error(json?.error?.message || `Cloudinary HTTP ${res.status}`);
  }
  return json;
}

// เผื่ออยากอัปจากไฟล์ URI (อ่านเป็น base64 ก่อนแล้วเรียก uploadBase64)
export async function uploadUri(
    uri: string,
    folder?: string,
    filename?: string
): Promise<CloudinaryUploadResponse> {
  const b64 = await (FileSystem as any).readAsStringAsync(uri, { encoding: "base64" });
  return uploadBase64(b64, folder, filename);
}
