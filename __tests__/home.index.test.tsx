import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import HomeScreen from "@/app/(tabs)/index";
import { useAuthState } from "@/hooks/useAuth";
import { subscribeUserShirts } from "@/services/garments";
import { listCatalog } from "@/services/catalog";

jest.mock("@/hooks/useAuth", () => ({ useAuthState: jest.fn() }));
jest.mock("@/services/garments", () => ({ subscribeUserShirts: jest.fn(), deleteUserShirt: jest.fn() }));
jest.mock("@/services/catalog", () => ({ listCatalog: jest.fn() }));

describe("Home index", () => {
    beforeEach(() => {
        (useAuthState as jest.Mock).mockReturnValue({ user: { uid: "u1" } });
        (subscribeUserShirts as jest.Mock).mockImplementation((_uid: string, cb: any) => {
            cb([{ id: "m1", imageUrl: "https://img" }]);
            return () => {};
        });
        (listCatalog as jest.Mock).mockResolvedValue([
            { id: "c1", title: "Test1", category: "Casual", imageUrl: "https://img1" },
            { id: "c2", title: "Test2", category: "Sport", imageUrl: "https://img2" },
        ]);
    });

    it("เปลี่ยนคอลัมน์ได้ และแสดงปุ่ม Try This On", async () => {
        render(<HomeScreen />);
        await waitFor(() => screen.getByText("Explore Collection"));
        fireEvent.press(screen.getByText("3")); // ปรับ grid = 3
        expect(screen.getAllByText("Try This On").length).toBeGreaterThan(0);
    });
});
