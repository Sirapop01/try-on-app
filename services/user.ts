// services/user.ts
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile, User } from "firebase/auth";
import { useFirebase } from "../hooks/useFirebase";
import { uploadBase64ToCloudinary } from "./cloudinary";
import { toBase64Compressed } from "./image";


export type UserProfileDoc = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phone?: string | null;
  bio?: string | null;
  gender?: "male" | "female" | "other" | null;
  role?: string;
  settings?: {
    keepUploads?: boolean;
    shareTelemetry?: boolean;
  };
  createdAt?: any;
  updatedAt?: any;
};

// เรียกหลังสมัคร/ล็อกอินครั้งแรก
export async function createUserProfile(u: User, data: Partial<UserProfileDoc>) {
  const { db } = useFirebase();
  const ref = doc(db, "users", u.uid);

  const payload: UserProfileDoc = {
    uid: u.uid,
    displayName: (data.displayName ?? u.displayName ?? "") || null,
    email: (u.email ?? data.email ?? "") || null,
    photoURL: (data.photoURL ?? u.photoURL ?? null) || null,
    phone: data.phone ?? null,
    bio: data.bio ?? null,
    gender: data.gender ?? null,
    role:"user",
    settings: {
      keepUploads: data.settings?.keepUploads ?? true,
      shareTelemetry: data.settings?.shareTelemetry ?? false,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (payload.displayName && u.displayName !== payload.displayName) {
    await updateProfile(u, { displayName: payload.displayName });
  }
  if (payload.photoURL && u.photoURL !== payload.photoURL) {
    await updateProfile(u, { photoURL: payload.photoURL });
  }

  await setDoc(ref, payload, { merge: true });
  return payload;
}

export async function getUserProfile(uid: string): Promise<UserProfileDoc | null> {
  const { db } = useFirebase();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfileDoc) : null;
}

// ใช้ในหน้า Edit
export async function saveUserProfile(
    uid: string,
    data: Partial<Pick<UserProfileDoc, "displayName" | "photoURL" | "phone" | "bio" | "gender" | "settings">>
) {
  const { db, auth } = useFirebase();
  const ref = doc(db, "users", uid);

  const patch: any = {
    ...(data.displayName !== undefined ? { displayName: data.displayName ?? null } : {}),
    ...(data.photoURL !== undefined ? { photoURL: data.photoURL ?? null } : {}),
    ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
    ...(data.bio !== undefined ? { bio: data.bio ?? null } : {}),
    ...(data.gender !== undefined ? { gender: data.gender ?? null } : {}),
    ...(data.settings !== undefined
        ? {
          settings: {
            keepUploads: data.settings?.keepUploads ?? true,
            shareTelemetry: data.settings?.shareTelemetry ?? false,
          },
        }
        : {}),
    updatedAt: serverTimestamp(),
    ...(auth.currentUser?.email ? { email: auth.currentUser.email } : {}),
  };

  await setDoc(ref, patch, { merge: true });

  if (auth.currentUser && (data.displayName !== undefined || data.photoURL !== undefined)) {
    await updateProfile(auth.currentUser, {
      displayName: data.displayName ?? auth.currentUser.displayName ?? null,
      photoURL: data.photoURL ?? auth.currentUser.photoURL ?? null,
    });
  }
}

// อัปโหลด avatar → Cloudinary แล้วคืน URL
export async function uploadAvatarAndGetUrl(localUri: string, userId: string) {
  const b64 = await toBase64Compressed(localUri, 512);
  const up = await uploadBase64ToCloudinary(b64, {
    folder: `tryon/${userId}/avatar`,
    mime: "image/jpeg",
  });
  return up.secure_url;
}
