// services/history.ts
import { getFirestore, doc, collection, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getApp } from "firebase/app";

// โครงสร้างข้อมูลที่บันทึก
export type TryOnHistoryItem = {
  imageUrl: string | null;          // Cloudinary URL
  localUri?: string | null;   // URI ที่เก็บไว้ในเครื่องของแอป (documentDirectory)
  createdAt?: number;         // epoch ms (เผื่อใช้เรียง), เราจะเก็บ serverTimestamp ด้วย
  garmentUrl?: string | null;
  hasGarmentB64?: boolean;
};

export async function addTryOnHistory(uid: string, item: TryOnHistoryItem) {
  const app = getApp();
  const db = getFirestore(app);
  // เก็บไว้ใต้ users/{uid}/wardrobe
  const col = collection(doc(db, "users", uid), "wardrobe");
  await addDoc(col, {
    ...item,
    createdAt: item.createdAt ?? Date.now(),
    createdAtServer: serverTimestamp(),
  });
}

// ถ้าต้องการอัปเดต/ลบ ในอนาคตสามารถเพิ่มฟังก์ชันได้ เช่น:
// export async function removeTryOnHistory(uid: string, id: string) { ... }
