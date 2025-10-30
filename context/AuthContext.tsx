// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { useFirebase } from "@/hooks/useFirebase";

type Role = "admin" | "user" | "staff" | undefined;

type AppUser = {
    uid: string;
    email?: string | null;
    role: Role;
} | null;

type AuthContextType = {
    user: AppUser;
    loading: boolean;
    refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    refreshRole: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { auth, db } = useFirebase(); // ✅ ดึง instance ที่นี่
    const [user, setUser] = useState<AppUser>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubUserDoc: (() => void) | undefined;

        const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
            if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = undefined; }

            if (!fbUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const userRef = doc(db, "users", fbUser.uid);
                const snap = await getDoc(userRef);

                // สร้างเอกสารพื้นฐานถ้ายังไม่มี
                if (!snap.exists()) {
                    await setDoc(userRef, {
                        role: "user",
                        email: fbUser.email ?? null,
                        createdAt: new Date(),
                    }, { merge: true });
                }

                const s2 = snap.exists() ? snap : await getDoc(userRef);
                const role = (s2.exists() ? (s2.data()?.role as Role) : undefined) ?? "user";
                setUser({ uid: fbUser.uid, email: fbUser.email, role });
                setLoading(false);

                // realtime (ถ้าโดน deny จะไม่ทำให้แอพพัง)
                unsubUserDoc = onSnapshot(userRef, (s) => {
                    const r = (s.exists() ? (s.data()?.role as Role) : undefined) ?? "user";
                    setUser((prev) => (prev ? { ...prev, role: r } : prev));
                }, (err) => {
                    console.warn("users snapshot denied:", err?.message);
                });

            } catch (err: any) {
                console.warn("users doc read/create error:", err?.message);
                setUser({ uid: fbUser.uid, email: fbUser.email, role: "user" }); // fallback
                setLoading(false);
            }
        });

        return () => { if (unsubUserDoc) unsubUserDoc(); unsubAuth(); };
    }, [auth, db]);

    const refreshRole = async () => {
        const fbUser = auth.currentUser;
        if (!fbUser) return;
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        const role = (snap.exists() ? (snap.data()?.role as Role) : undefined) ?? "user";
        setUser({ uid: fbUser.uid, email: fbUser.email, role });
    };

    const value = useMemo(() => ({ user, loading, refreshRole }), [user, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
