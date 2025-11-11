import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import AdminAddCatalog from "@/app/admin/catalog/add";
import { useAuth } from "@/context/AuthContext";

// utils
const flush = () => new Promise((r) => setTimeout(r, 0));

// mocks
jest.mock("@/context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("@/services/catalog", () => ({
    addCatalogItemCloudinary: jest.fn().mockResolvedValue({ id: "id1" }),
}));

const { addCatalogItemCloudinary } = require("@/services/catalog");

describe("AdminAddCatalog", () => {
    beforeEach(() => {
        (useAuth as jest.Mock).mockReturnValue({ user: { uid: "u1" } });
        (addCatalogItemCloudinary as jest.Mock).mockClear();

        // mute alert ในเทส
        jest.spyOn(Alert, "alert").mockImplementation(() => undefined as unknown as any);
    });

    it("validate: ต้องใส่ชื่อและรูป", async () => {
        render(<AdminAddCatalog />);
        fireEvent.press(screen.getByText("บันทึก"));
        expect(addCatalogItemCloudinary).not.toHaveBeenCalled();
    });

    it("บันทึกสำเร็จเมื่อกรอกครบ", async () => {
        render(<AdminAddCatalog />);

        // กรอกชื่อ
        fireEvent.changeText(
            screen.getByPlaceholderText("เช่น Patterned Shirt"),
            "Test Shirt"
        );

        // ครั้งแรกปุ่มเป็น 'เลือกรูปจากคลัง'
        fireEvent.press(screen.getByText(/เลือกรูปจากคลัง/i));

        // รอให้เลือกภาพ/manipulate เสร็จ -> label เปลี่ยนเป็น 'เปลี่ยนรูป'
        await waitFor(() => expect(screen.getByText(/เปลี่ยนรูป/i)).toBeTruthy());
        await act(async () => { await flush(); });

        // กดบันทึก
        fireEvent.press(screen.getByText("บันทึก"));

        // รอจน service ถูกเรียกพร้อมพารามิเตอร์หลัก
        await waitFor(() =>
            expect(addCatalogItemCloudinary).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Test Shirt",
                    createdByUid: "u1",
                    imageUri: expect.stringMatching(/^file:\/\//),
                })
            )
        );
    });
});
