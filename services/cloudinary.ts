// services/cloudinary.ts
import { APP_CONFIG } from "../config/appConfig";

type UploadResult = {
  asset_id: string;
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  [k: string]: any;
};

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

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${APP_CONFIG.CLOUDINARY.CLOUD_NAME}/image/upload`,
    { method: "POST", body: form as any }
  );
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
  return (await res.json()) as UploadResult;
}
