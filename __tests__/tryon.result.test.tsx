// __tests__/tryon.result.test.tsx
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { tryOn } from "@/services/ml";
import * as Sharing from "expo-sharing";

// ---- Mock Zustand store เป็น factory (ต้องมาก่อน import คอมโพเนนต์) ----
const mockState = {
    person: { base64: "p_b64" },
    garment: { imageUrl: "https://img" },
    setPerson: jest.fn(),
    setGarment: jest.fn(),
    reset: jest.fn(),
};
jest.mock("@/store/selectionStore", () => {
    const useSelectionStore = (selector?: any) => (selector ? selector(mockState) : mockState);
    return { useSelectionStore };
});

// ---- Mock services ----
jest.mock("@/services/ml", () => ({ tryOn: jest.fn() }));
jest.mock("expo-sharing", () => ({
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// ต้อง import หลัง mock store เสมอ
import TryOnResult from "@/app/try-on-result";

describe("TryOnResult", () => {
    beforeEach(() => {
        (tryOn as jest.Mock).mockResolvedValue({ result_b64: "iVBORw0KGgoAAA==" });
        (Sharing.shareAsync as jest.Mock).mockClear();
    });

    it("กด Share / Save… แล้วเรียก shareAsync", async () => {
        render(<TryOnResult />);

        // รอให้ภาพ result โผล่ (แปลว่า result_b64 มาแล้ว)
        await waitFor(() => expect(screen.getByText("Result")).toBeTruthy());

        fireEvent.press(screen.getByText("Share / Save…"));

        // รอจนกว่าจะเรียก shareAsync จริง (เพราะเป็น async chain)
        await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    });
});
