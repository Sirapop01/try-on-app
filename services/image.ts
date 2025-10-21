// services/image.ts
// ⬇️ เปลี่ยนเป็น legacy
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

// รองรับทั้งกรณีมี/ไม่มี EncodingType
const BASE64: any = (FileSystem as any).EncodingType?.Base64 ?? "base64";

export async function toBase64Compressed(localUri: string, maxW = 1080) {
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: maxW } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return FileSystem.readAsStringAsync(manipulated.uri, { encoding: BASE64 });
}

export function toDataUri(
  base64: string,
  mime: "image/jpeg" | "image/png" = "image/jpeg"
) {
  return `data:${mime};base64,${base64}`;
}

// ถ้าคุณยังใช้ฟังก์ชันนี้อยู่ ให้คงไว้และเปลี่ยน import เป็น legacy
export async function base64ToFile(base64: string, name = `result_${Date.now()}.jpg`) {
  const path = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(path, base64, { encoding: BASE64 });
  return path;
}
