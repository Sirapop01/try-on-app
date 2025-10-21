// services/userService.ts
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile, User } from "firebase/auth";
import { useFirebase } from "../hooks/useFirebase";

export async function createUserProfile(u: User, data: any) {
  const { db } = useFirebase();
  const ref = doc(db, "users", u.uid);

  // ห้าม undefined ทุกฟิลด์
  const payload = {
    uid: u.uid,
    displayName: (data.displayName ?? u.displayName ?? ""),
    email: (u.email ?? data.email ?? ""),
    photoURL: (data.photoURL ?? u.photoURL ?? null),
    gender: (data.gender ?? null),
    height_cm: (data.height_cm ?? null),
    weight_kg: (data.weight_kg ?? null),
    measurements: {
      chest: data.measurements?.chest ?? null,
      waist: data.measurements?.waist ?? null,
      hips:  data.measurements?.hips  ?? null,
      shoulder: data.measurements?.shoulder ?? null,
    },
    settings: {
      keepUploads:   data.settings?.keepUploads   ?? true,
      shareTelemetry:data.settings?.shareTelemetry?? false,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (payload.displayName && u.displayName !== payload.displayName) {
    await updateProfile(u, { displayName: payload.displayName });
  }

  await setDoc(ref, payload, { merge: true });
  return payload;
}
