// services/garments.ts
import { uploadBase64ToCloudinary } from "./cloudinary";
import { useFirebase } from "../hooks/useFirebase";
import { doc, setDoc, serverTimestamp, collection, query, orderBy, getDocs, limit } from "firebase/firestore";

export type UserShirt = {
  id: string;
  imageUrl: string;
  publicId: string;
  createdAt: any;
};

export async function addUserShirt(uid: string, base64: string) {
  const { db } = useFirebase();
  const cloud = await uploadBase64ToCloudinary(base64, { folder: `tryon/${uid}`, mime: "image/jpeg" });
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, `users/${uid}/garments/${id}`), {
    imageUrl: cloud.secure_url ?? null,
    publicId: cloud.public_id ?? null,
    createdAt: serverTimestamp(),
  }, { merge: true });
  return { id, imageUrl: cloud.secure_url, publicId: cloud.public_id };
}

export async function listUserShirts(uid: string, take = 50): Promise<UserShirt[]> {
  const { db } = useFirebase();
  const q = query(collection(db, `users/${uid}/garments`), orderBy("createdAt", "desc"), limit(take));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
}
