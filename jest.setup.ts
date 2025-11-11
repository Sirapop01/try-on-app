// jest.setup.ts

// 1) Matchers & fetch polyfill
import "@testing-library/jest-native/extend-expect";
import "whatwg-fetch";
import fetchMock from "jest-fetch-mock";
fetchMock.enableMocks();

// 2) ลด noise log ระหว่างรันเทส
jest.spyOn(global.console, "error").mockImplementation(() => {});
jest.spyOn(global.console, "warn").mockImplementation(() => {});

// 3) Safe-area ให้คงที่ (กัน layout เพี้ยนเวลารันบน jsdom)
jest.mock("react-native-safe-area-context", () => {
    const actual = jest.requireActual("react-native-safe-area-context");
    return {
        ...actual,
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
});

// 4) AsyncStorage mock สำหรับ Jest (แทน native module)
jest.mock("@react-native-async-storage/async-storage", () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// 5) Polyfill setImmediate/clearImmediate (บาง lib ของ RN ใช้)
if (typeof (global as any).setImmediate === "undefined") {
    (global as any).setImmediate = (fn: any, ...args: any[]) => setTimeout(fn, 0, ...args);
}
if (typeof (global as any).clearImmediate === "undefined") {
    (global as any).clearImmediate = (id: any) => clearTimeout(id);
}

// 6) Mock bottom tab height (หน้า Home เรียก useBottomTabBarHeight)
jest.mock("@react-navigation/bottom-tabs", () => {
    const actual = jest.requireActual("@react-navigation/bottom-tabs");
    return { ...actual, useBottomTabBarHeight: () => 56 };
});

// 7) Reanimated mock (ลด warning/behavior แปลก ๆ)
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

// 8) Expo Image Picker
jest.mock("expo-image-picker", () => ({
    MediaTypeOptions: { Images: "Images" },
    requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    launchImageLibraryAsync: jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file:///mock.jpg" }],
    }),
}));

// 9) Expo Image Manipulator
jest.mock("expo-image-manipulator", () => ({
    manipulateAsync: jest.fn().mockResolvedValue({ uri: "file:///mock-processed.jpg" }),
    SaveFormat: { JPEG: "jpeg" },
}));

// 10) Expo FileSystem (legacy) + SAF ที่ใช้ใน try-on-result / wardrobe
jest.mock("expo-file-system/legacy", () => ({
    cacheDirectory: "file:///cache/",
    documentDirectory: "file:///doc/",
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    deleteAsync: jest.fn().mockResolvedValue(undefined),
    getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
    makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
    StorageAccessFramework: {
        requestDirectoryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, directoryUri: "saf://dir" }),
        createFileAsync: jest.fn().mockResolvedValue("saf://dir/tryon_123.png"),
    },
}));

// 11) Expo Sharing (ใช้ในปุ่ม Share / Save…)
jest.mock("expo-sharing", () => ({
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// 12) (ออปชัน) Mock expo-haptics ถ้ามีเรียกใช้งาน
jest.mock("expo-haptics", () => ({
    selectionAsync: jest.fn().mockResolvedValue(undefined),
    impactAsync: jest.fn().mockResolvedValue(undefined),
}));

// 13) (ออปชัน) Mock expo-status-bar กันการอัปเดต global state
jest.mock("expo-status-bar", () => ({
    StatusBar: () => null,
    setStatusBarStyle: jest.fn(),
    setStatusBarBackgroundColor: jest.fn(),
}));
