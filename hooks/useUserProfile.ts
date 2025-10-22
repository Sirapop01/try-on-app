// hooks/useUserProfile.ts
import { useEffect, useState, useCallback } from "react";
import { getUserProfile, type UserProfileDoc } from "../services/user";
import { useAuthState } from "./useAuth";

export function useUserProfile() {
    const { user } = useAuthState();
    const [profile, setProfile] = useState<UserProfileDoc | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!user) { setProfile(null); setLoading(false); return; }
        setLoading(true);
        try {
            const p = await getUserProfile(user.uid);
            setProfile(p);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => { refresh(); }, [refresh]);

    const merged = user ? {
        displayName: profile?.displayName ?? user.displayName ?? null,
        email:       profile?.email       ?? user.email       ?? null,
        photoURL:    profile?.photoURL    ?? user.photoURL    ?? null,
        gender:      profile?.gender ?? null,
        // measurements: (removed)
    } : null;

    return { loading, profile: merged, refresh };
}
