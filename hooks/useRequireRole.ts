// src/hooks/useRequireRole.ts
import { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export function useRequireRole(required: "admin" | "user" | "staff") {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace("/login"); // ปรับเป็นหน้าล็อกอินของโปรเจกต์คุณ
            return;
        }
        if (user.role !== required) {
            router.replace("/not-authorized");
        }
    }, [user, loading, required, router, pathname]);
}
