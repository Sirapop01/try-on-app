// services/history.ts
import { doc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useFirebase } from "../hooks/useFirebase";

export type TryOnHistoryItem = {
  id: string;
  outputUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  createdAt: any;
};

export async function saveResultMeta(uid: string, data: {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
}) {
  const { db } = useFirebase();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const ref = doc(db, `users/${uid}/tryOnResults/${id}`);
  await setDoc(ref, {
    outputUrl: data.secure_url ?? null,
    publicId: data.public_id ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    format: data.format ?? null,
    createdAt: serverTimestamp(),
  }, { merge: true });
  return id;
}

export async function listResults(uid: string, take = 50): Promise<TryOnHistoryItem[]> {
  const { db } = useFirebase();
  const q = query(
    collection(db, `users/${uid}/tryOnResults`),
    orderBy("createdAt", "desc"),
    limit(take)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}
