// config/appConfig.ts
import { Platform } from "react-native";

function getBackendBase() {
  if (Platform.OS === "android") return "http://10.0.2.2:8000"; // ✅ Emulator Android
  if (Platform.OS === "ios") return "http://localhost:8000";     // iOS Simulator
  return "http://192.168.1.103:8000";                            // มือถือจริงใน LAN
}

export const APP_CONFIG = {

  CLOUDINARY: {
    CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_NAME!,
    UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_PRESET!,
    FOLDER_PREFIX: "tryon",
    DEFAULT_MIME: "image/jpeg" as const,
  },
  USE_MOCK_ML: false,
  ML_BACKEND_URL: "http://192.168.1.103:8000",
};

