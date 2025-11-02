// services/catalog.ts
import {
    addDoc, collection, serverTimestamp, deleteDoc, doc, getDoc, updateDoc,getDocs,
    limit,
    orderBy,
    query,
    Timestamp,
} from "firebase/firestore";
import { useFirebase } from "@/hooks/useFirebase";
import { uploadUriToCloudinary, deleteByToken } from "@/services/cloudinary";
import { APP_CONFIG } from "@/config/appConfig";

export type NewCatalogItem = {
    title: string;
    description?: string;
    category?: string;
    imageUri: string;        // file://
    createdByUid: string;
};

export type CatalogListItem = {
    id: string;
    title: string;
    description?: string;
    category?: string;
    imageUrl: string;
    createdAt?: Timestamp | null;
    updatedAt?: Timestamp | null;
};

export async function addCatalogItemCloudinary(payload: NewCatalogItem) {
    const { db } = useFirebase();
    const folder = `${APP_CONFIG.CLOUDINARY.FOLDER_PREFIX}/${payload.createdByUid}`;
    const up = await uploadUriToCloudinary(payload.imageUri);

    const docRef = await addDoc(collection(db, "catalog"), {
        title: payload.title,
        description: payload.description ?? "",
        category: payload.category ?? "",
        imageUrl: up.secure_url,
        cloudinaryPublicId: up.public_id,
        cloudinaryAssetId: up.asset_id,
        cloudinaryFormat: up.format,
        cloudinaryWidth: up.width,
        cloudinaryHeight: up.height,
        cloudinaryDeleteToken: up.delete_token ?? null,
        createdBy: payload.createdByUid,
        createdAt: serverTimestamp(),
    });

    return { id: docRef.id };
}

export async function getCatalogItemById(id: string) {
    const { db } = useFirebase();
    const snap = await getDoc(doc(db, "catalog", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
}

export async function listCatalog(max = 30): Promise<CatalogListItem[]> {
    const { db } = useFirebase();
    const col = collection(db, "catalog");
    const q = query(col, orderBy("createdAt", "desc"), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data() as any;
        return {
            id: d.id,
            title: data.title ?? "",
            description: data.description ?? "",
            category: data.category ?? "",
            imageUrl: data.imageUrl ?? "",
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
        };
    });
}

export async function updateCatalogItemCloudinary(
    id: string,
    payload: {
        title?: string;
        description?: string;
        price?: number | null;
        category?: string;
        // ถ้ามีรูปใหม่ -> upload -> ลบรูปเก่า(ถ้ามี token) -> อัปเดต
        newImageUri?: string | null;
        updatedByUid: string;
    }
) {
    const { db } = useFirebase();

    const snap = await getDoc(doc(db, "catalog", id));
    if (!snap.exists()) throw new Error("Catalog not found");
    const before = snap.data() as any;

    let updateData: any = {
        title: payload.title ?? before.title,
        description: payload.description ?? before.description ?? "",
        price: payload.price ?? before.price ?? null,
        category: payload.category ?? before.category ?? "",
        updatedBy: payload.updatedByUid,
        updatedAt: serverTimestamp(),
    };

    if (payload.newImageUri) {
        // upload new
        const folder = `${APP_CONFIG.CLOUDINARY.FOLDER_PREFIX}/${payload.updatedByUid}`;
        const up = await uploadUriToCloudinary(payload.newImageUri);
        updateData = {
            ...updateData,
            imageUrl: up.secure_url,
            cloudinaryPublicId: up.public_id,
            cloudinaryAssetId: up.asset_id,
            cloudinaryFormat: up.format,
            cloudinaryWidth: up.width,
            cloudinaryHeight: up.height,
            cloudinaryDeleteToken: up.delete_token ?? null,
        };

        // try delete old via token (ไม่บล็อคถ้าพลาด)
        const oldToken: string | undefined = before.cloudinaryDeleteToken || undefined;
        if (oldToken) {
            try { await deleteByToken(oldToken); } catch (e) { console.warn("delete old token failed"); }
        }
    }

    await updateDoc(doc(db, "catalog", id), updateData);
}

export async function deleteCatalogItemCloudinary(id: string) {
    const { db } = useFirebase();
    const snap = await getDoc(doc(db, "catalog", id));
    if (snap.exists()) {
        const data = snap.data() as any;
        if (data.cloudinaryDeleteToken) {
            try { await deleteByToken(data.cloudinaryDeleteToken); } catch (e) { console.warn(e); }
        }
    }
    await deleteDoc(doc(db, "catalog", id));

}
