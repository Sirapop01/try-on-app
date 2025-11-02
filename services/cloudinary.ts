// services/cloudinary.ts
import * as FileSystem from "expo-file-system/legacy";
import { APP_CONFIG } from "@/config/appConfig";

export type UploadResult = {
  asset_id: string;
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  delete_token?: string;
  [k: string]: any;
};

export type CloudinaryUploadResult = {
  asset_id: string;
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  [k: string]: any;
};

function errorFrom(res: Response, bodyText: string) {
  try {
    const body = JSON.parse(bodyText);
    const msg = body?.error?.message ? ` - ${body.error.message}` : "";
    return new Error(`Cloudinary upload failed: ${res.status}${msg}`);
  } catch {
    return new Error(`Cloudinary upload failed: ${res.status}`);
  }
}

// file:// URI -> base64
export async function uriToBase64(uri: string) {
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

// อัปโหลด base64 (data URI) ไป Cloudinary ด้วย unsigned upload
export async function uploadBase64ToCloudinary(
    base64: string,
    opts?: { folder?: string; mime?: "image/jpeg" | "image/png" }
): Promise<UploadResult> {
  const mime = opts?.mime ?? APP_CONFIG.CLOUDINARY.DEFAULT_MIME;
  const dataUri = `data:${mime};base64,${base64}`;

  const form = new FormData();
  form.append("file", dataUri as any);
  form.append("upload_preset", APP_CONFIG.CLOUDINARY.UPLOAD_PRESET);
  if (opts?.folder) form.append("folder", opts.folder);
  if (APP_CONFIG.CLOUDINARY.RETURN_DELETE_TOKEN) {
    form.append("return_delete_token", "1");
  }

  const res = await fetch(
      `https://api.cloudinary.com/v1_1/${APP_CONFIG.CLOUDINARY.CLOUD_NAME}/image/upload`,
      { method: "POST", body: form as any }
  );
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
  return (await res.json()) as UploadResult;
}

export async function uploadUriToCloudinary(uri: string): Promise<CloudinaryUploadResult> {
  const form = new FormData();
  form.append("upload_preset", APP_CONFIG.CLOUDINARY.UPLOAD_PRESET);
  // ไม่ต้องส่ง folder ใน request (preset คุณตั้ง Asset folder = tryon ไว้แล้ว)
  form.append("file", {
    uri,
    name: `catalog_${Date.now()}.jpg`, // ต้องใส่ชื่อไฟล์
    type: "image/jpeg",                // และ MIME type
  } as any);

  const res = await fetch(
      `https://api.cloudinary.com/v1_1/${APP_CONFIG.CLOUDINARY.CLOUD_NAME}/image/upload`,
      { method: "POST", body: form as any }
  );

  const text = await res.text();
  if (!res.ok) throw errorFrom(res, text);
  return JSON.parse(text) as CloudinaryUploadResult;
}

// ลบด้วย delete_token (ต้องเปิด return_delete_token ใน preset)
export async function deleteByToken(deleteToken: string) {
  const form = new FormData();
  form.append("token", deleteToken as any);
  const res = await fetch(
      `https://api.cloudinary.com/v1_1/${APP_CONFIG.CLOUDINARY.CLOUD_NAME}/delete_by_token`,
      { method: "POST", body: form as any }
  );
  if (!res.ok) throw new Error(`Cloudinary delete failed: ${res.status}`);
  return await res.json();
}
