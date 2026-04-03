import supabase from "@/lib/supabase";
import { useEffect, useState } from "react";

// ─── Tipos de notificación (deben coincidir con notification_types en BD) ─────
// IDs esperados en la tabla notification_types:
// 1 - incident_status_change
// 2 - quota_published
// 3 - quota_rejected
// 4 - quota_validated
// 5 - new_expense
// 6 - new_incident        (solo admin)
// 7 - new_receipt         (solo tesorero)

export const NOTIFICATION_TYPE = {
    INCIDENT_STATUS_CHANGE: 1,
    QUOTA_PUBLISHED: 2,
    QUOTA_REJECTED: 3,
    QUOTA_VALIDATED: 4,
    NEW_EXPENSE: 5,
    NEW_INCIDENT: 6,
    NEW_RECEIPT: 7,
} as const;

export type NotificationTypeId = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export interface NotificationType {
    id: number;
    name: string;
}

export interface Notification {
    id: number;
    title: string;
    description: string;
    type_id: number | null;
    usr_id: number;
    created_at: string;
    notification_types?: NotificationType | null;
}

export interface CreateNotificationPayload {
    title: string;
    description: string;
    type_id: NotificationTypeId;
    usr_id: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal — lista de notificaciones del usuario
// ─────────────────────────────────────────────────────────────────────────────
export function useNotifications(userId: number) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (userId) fetchNotifications();
    }, [userId]);

    const fetchNotifications = async () => {
        if (!userId) return;
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: dbError } = await supabase
                .from("notifications")
                .select("*, notification_types ( id, name )")
                .eq("usr_id", userId)
                .order("created_at", { ascending: false });

            if (dbError) {
                setError("Error al cargar las notificaciones.");
                return;
            }

            const list = (data as Notification[]) ?? [];
            setNotifications(list);
            setUnreadCount(list.length); // En el futuro se puede agregar campo "read"
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    const deleteNotification = async (id: number): Promise<boolean> => {
        try {
            const { error: dbError } = await supabase
                .from("notifications")
                .delete()
                .eq("id", id);

            if (dbError) return false;
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            return true;
        } catch {
            return false;
        }
    };

    return {
        notifications,
        isLoading,
        error,
        unreadCount,
        refetch: fetchNotifications,
        deleteNotification,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidad para crear notificaciones (usada por useNotificationSender)
// ─────────────────────────────────────────────────────────────────────────────
export async function createNotification(
    payload: CreateNotificationPayload
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from("notifications")
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
        return !error;
    } catch {
        return false;
    }
}

export async function createNotificationBatch(
    payloads: CreateNotificationPayload[]
): Promise<boolean> {
    if (payloads.length === 0) return true;
    try {
        const rows = payloads.map((p) => ({
            ...p,
            created_at: new Date().toISOString(),
        }));
        const { error } = await supabase.from("notifications").insert(rows);
        return !error;
    } catch {
        return false;
    }
}