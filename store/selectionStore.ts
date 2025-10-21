// store/selectionStore.ts
import { create } from "zustand";

export type GarmentSel = {
  id?: string;          // ถ้าเป็นแคตตาล็อก
  name?: string;
  imageUrl?: string;    // แคตตาล็อก -> ส่ง URL เข้า ML ได้
  base64?: string;      // ถ้าผู้อัปโหลดเอง
  size?: string;
  color?: string;
};

export type PersonPhoto = {
  localUri?: string;
  base64?: string;
};

type State = {
  garment?: GarmentSel;
  person?: PersonPhoto;
  setGarment: (g?: GarmentSel) => void;
  setPerson: (p?: PersonPhoto) => void;
  reset: () => void;
};

export const useSelectionStore = create<State>((set) => ({
  garment: undefined,
  person: undefined,
  setGarment: (garment) => set({ garment }),
  setPerson: (person) => set({ person }),
  reset: () => set({ garment: undefined, person: undefined }),
}));
