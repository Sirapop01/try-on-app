// config/appConfig.ts
import { Platform } from "react-native";

function getBackendBase() {
  if (Platform.OS === "android") return "http://10.0.2.2:8000"; // ✅ Emulator Android
  if (Platform.OS === "ios") return "http://localhost:8000";     // iOS Simulator
  return "http://192.168.1.103:8000";                            // มือถือจริงใน LAN
}

export const APP_CONFIG = {

  CLOUDINARY: {
    CLOUD_NAME: "matchweb",
    UPLOAD_PRESET: "tryon_unsigned",
    FOLDER_PREFIX: "tryon",           // ทุกอัพโหลดจะเก็บภายใต้ "catalog/<uid>"
    DEFAULT_MIME: "image/jpeg" as const,
    RETURN_DELETE_TOKEN: true,          // เปิดถ้าอยากลบจาก client ด้วย delete_token
  },
  USE_MOCK_ML: false,
  ML_BACKEND_URL: "http://192.168.1.103:8000",
};

