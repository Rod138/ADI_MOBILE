import supabase from "@/lib/supabase";
import { useEffect, useState } from "react";

export interface Notification {
    id: number;
    created_at: string;
    usr_id: number;
    inc_id: number;
    title: string;
    description: string;
}

// ─────────────────────────────────────────────
// Hook — Notificaciones
// ─────────────────────────────────────────────
export function useNotifications(userId: number) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userId) fetchNotifications();
    }, [userId]);

    const fetchNotifications = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: dbError } = await supabase
                .from("notifications")
                .select("*")
                .eq("usr_id", userId)
                .order("created_at", { ascending: false });

            if (dbError) {
                setError("Error al cargar las notificaciones.");
                return;
            }

            setNotifications((data as Notification[]) ?? []);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    return { notifications, isLoading, error, refetch: fetchNotifications };
}