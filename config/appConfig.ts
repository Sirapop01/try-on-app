// config/appConfig.ts
export const APP_CONFIG = {
  USE_MOCK_ML: process.env.EXPO_PUBLIC_USE_MOCK_ML === "true",
  CLOUDINARY: {
    CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_NAME!,
    UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_PRESET!,
    FOLDER_PREFIX: "tryon",
    DEFAULT_MIME: "image/jpeg" as const,
  },
};

