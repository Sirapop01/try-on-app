// services/garments.ts
import { useFirebase } from "@/hooks/useFirebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  QueryConstraint,
} from "firebase/firestore";

export type UserShirt = {
  id: string;
  userId: string;
  imageUrl: string;      // เก็บ URL (จะเป็น Cloudinary/Firebase Storage ก็ได้)
  createdAt?: any;       // serverTimestamp
  createdAtMs?: number;  // client timestamp สำหรับ fallback sort
};

// คอลเลกชัน
const COLL = "user_shirts";

/** เพิ่มเสื้อของผู้ใช้
 *  - imageUrl: ส่ง URL ที่อัปโหลดเสร็จแล้ว
 *  - ถ้าโค้ดคุณเดิมเป็น addUserShirt(userId, base64) ที่ไปอัปโหลดต่อเอง ก็ยังเรียกใช้ได้เหมือนเดิม
 */
export async function addUserShirtUrl(userId: string, imageUrl: string) {
  const { db } = useFirebase();
  await addDoc(collection(db, COLL), {
    userId,
    imageUrl,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

/** (คงไว้เผื่อเรียกที่อื่น) ดึงครั้งเดียว */
export async function listUserShirts(userId: string, max = 50): Promise<UserShirt[]> {
  const { db } = useFirebase();
  const col = collection(db, COLL);
  try {
    const q1 = query(col, where("userId", "==", userId), orderBy("createdAt", "desc"), limit(max));
    const snap = await getDocs(q1);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  } catch {
    const q2 = query(col, where("userId", "==", userId), limit(max));
    const snap = await getDocs(q2);
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    rows.sort((a, b) => {
      const tb = b.createdAt?.seconds ?? Math.floor((b.createdAtMs ?? 0) / 1000);
      const ta = a.createdAt?.seconds ?? Math.floor((a.createdAtMs ?? 0) / 1000);
      if (tb !== ta) return tb - ta;
      return a.id < b.id ? 1 : -1;
    });
    return rows;
  }
}

/** ✅ Subscribe แบบทนทานกับ index/serverTimestamp
 *  - เริ่มจากคิวรีที่มี orderBy
 *  - ถ้า onSnapshot error = failed-precondition → ยกเลิกแล้ว fallback ไม่ใส่ orderBy และ sort ฝั่ง client
 *  - includeMetadataChanges: true → local writes โผล่ทันที
 */
export function subscribeUserShirts(
    userId: string,
    onChange: (items: UserShirt[]) => void,
    max = 50
) {
  const { db } = useFirebase();
  const col = collection(db, COLL);

  let stop: (() => void) | undefined;

  const start = (withOrder: boolean) => {
    const cons: QueryConstraint[] = [where("userId", "==", userId)];
    if (withOrder) cons.push(orderBy("createdAt", "desc"));
    cons.push(limit(max));
    const q = query(col, ...cons);

    stop = onSnapshot(
        q,
        { includeMetadataChanges: true },
        (snap) => {
          let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) as UserShirt }));

          if (!withOrder) {
            // sort ฝั่ง client เมื่อไม่มี orderBy (หรือ createdAt ยังไม่ resolve)
            rows.sort((a, b) => {
              const tb = b.createdAt?.seconds ?? Math.floor((b.createdAtMs ?? 0) / 1000);
              const ta = a.createdAt?.seconds ?? Math.floor((a.createdAtMs ?? 0) / 1000);
              if (tb !== ta) return tb - ta;
              return a.id < b.id ? 1 : -1;
            });
          }

          onChange(rows);
        },
        (err) => {
          // ต้องสร้าง index → fallback
          if ((err as any)?.code === "failed-precondition") {
            if (stop) stop();
            start(false);
          } else {
            console.error("subscribeUserShirts error:", err);
            onChange([]);
          }
        }
    );
  };

  // เริ่มด้วยคิวรีมี orderBy ก่อน
  start(true);

  return () => {
    if (stop) stop();
  };
}

/** ลบเสื้อของผู้ใช้ */
export async function deleteUserShirt(id: string) {
  const { db } = useFirebase();
  await deleteDoc(doc(db, COLL, id));
}
