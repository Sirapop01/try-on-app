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

/** โครงสร้างข้อมูลเสื้อของผู้ใช้ */
export type UserShirt = {
  id: string;          // มาจาก d.id ของ Firestore (ไม่อ่านจาก d.data())
  userId: string;
  imageUrl: string;    // เก็บ URL (Cloudinary / Firebase Storage)
  createdAt?: any;     // serverTimestamp()
  createdAtMs?: number; // client timestamp ไว้ fallback sort
};

const COLL = "user_shirts";

/** ตัวช่วย sort กรณีไม่มี orderBy (หรือ createdAt ยังไม่ resolve) */
function sortByNewest(a: UserShirt, b: UserShirt): number {
  const tb = b.createdAt?.seconds ?? Math.floor((b.createdAtMs ?? 0) / 1000);
  const ta = a.createdAt?.seconds ?? Math.floor((a.createdAtMs ?? 0) / 1000);
  if (tb !== ta) return tb - ta;
  // tie-break ด้วย id เพื่อให้เสถียร
  return a.id < b.id ? 1 : -1;
}

/** เพิ่มเสื้อของผู้ใช้
 * - imageUrl: ส่ง URL ที่อัปโหลดสำเร็จแล้ว
 * - ถ้าโค้ดเก่าคุณเคย addUserShirt(userId, base64) ไปอัปโหลดต่อเอง ก็ยังเรียกใช้ฟังก์ชันนี้แทนได้
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

/** ดึงครั้งเดียว (one-shot) */
export async function listUserShirts(userId: string, max = 50): Promise<UserShirt[]> {
  const { db } = useFirebase();
  const col = collection(db, COLL);

  try {
    // พยายามใช้ orderBy(createdAt, desc) ก่อน
    const q1 = query(col, where("userId", "==", userId), orderBy("createdAt", "desc"), limit(max));
    const snap = await getDocs(q1);

    return snap.docs.map((d) => {
      // ⚠️ ตัด id ที่อาจอยู่ใน d.data() ทิ้ง เพื่อเลี่ยงชนกับ id: d.id
      const { id: _ignored, ...rest } =
          (d.data() as Omit<UserShirt, "id"> & { id?: string });
      return { id: d.id, ...rest } as UserShirt;
    });
  } catch {
    // ถ้ายังไม่สร้าง index → fallback ไม่ใส่ orderBy แล้วไป sort ฝั่ง client
    const q2 = query(col, where("userId", "==", userId), limit(max));
    const snap = await getDocs(q2);

    const rows = snap.docs.map((d) => {
      const { id: _ignored, ...rest } =
          (d.data() as Omit<UserShirt, "id"> & { id?: string });
      return { id: d.id, ...rest } as UserShirt;
    });

    rows.sort(sortByNewest);
    return rows;
  }
}

/** Subscribe แบบทนทานกับ index/serverTimestamp
 * - เริ่มด้วยคิวรีที่มี orderBy
 * - ถ้า onSnapshot error = failed-precondition → ยกเลิกแล้ว fallback ไม่ใส่ orderBy + sort ฝั่ง client
 * - includeMetadataChanges: true เพื่อให้ local writes โผล่ทันที
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
          let rows = snap.docs.map((d) => {
            const { id: _ignored, ...rest } =
                (d.data() as Omit<UserShirt, "id"> & { id?: string });
            return { id: d.id, ...rest } as UserShirt;
          });

          if (!withOrder) {
            rows.sort(sortByNewest);
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

  // เริ่มด้วยคิวรีที่มี orderBy ก่อน
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
