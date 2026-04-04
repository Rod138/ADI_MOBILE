import supabase from "@/lib/supabase";
import { useEffect, useState } from "react";

// ─── Tipos de notificación ────────────────────────────────────────────────────
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
    read: boolean;
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

            if (dbError) { setError("Error al cargar las notificaciones."); return; }

            const list = (data as Notification[]) ?? [];
            setNotifications(list);
            setUnreadCount(list.filter((n) => !n.read).length);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    // Marca UNA notificación como leída (optimistic)
    const markAsRead = async (id: number): Promise<void> => {
        const target = notifications.find((n) => n.id === id);
        if (!target || target.read) return; // ya leída, no hacer nada

        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            await supabase
                .from("notifications")
                .update({ read: true })
                .eq("id", id)
                .eq("read", false);
        } catch {
            fetchNotifications(); // revertir en caso de error
        }
    };

    // Marca TODAS como leídas (optimistic)
    const markAllAsRead = async (): Promise<void> => {
        if (unreadCount === 0) return;

        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);

        try {
            await supabase
                .from("notifications")
                .update({ read: true })
                .eq("usr_id", userId)
                .eq("read", false);
        } catch {
            fetchNotifications();
        }
    };

    // Elimina una notificación (optimistic)
    const deleteNotification = async (id: number): Promise<boolean> => {
        const target = notifications.find((n) => n.id === id);
        const wasUnread = target ? !target.read : false;

        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            const { error: dbError } = await supabase
                .from("notifications").delete().eq("id", id);
            if (dbError) { fetchNotifications(); return false; }
            return true;
        } catch {
            fetchNotifications();
            return false;
        }
    };

    // Elimina TODAS (optimistic)
    const deleteAllNotifications = async (): Promise<boolean> => {
        const snapshot = notifications;
        setNotifications([]);
        setUnreadCount(0);

        try {
            const { error: dbError } = await supabase
                .from("notifications").delete().eq("usr_id", userId);
            if (dbError) {
                setNotifications(snapshot);
                setUnreadCount(snapshot.filter((n) => !n.read).length);
                return false;
            }
            return true;
        } catch {
            setNotifications(snapshot);
            setUnreadCount(snapshot.filter((n) => !n.read).length);
            return false;
        }
    };

    return {
        notifications,
        isLoading,
        error,
        unreadCount,
        refetch: fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades para crear notificaciones (usadas por useNotificationSender)
// ─────────────────────────────────────────────────────────────────────────────
export async function createNotification(
    payload: CreateNotificationPayload
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from("notifications")
            .insert([{ ...payload, read: false, created_at: new Date().toISOString() }]);
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
            read: false,
            created_at: new Date().toISOString(),
        }));
        const { error } = await supabase.from("notifications").insert(rows);
        return !error;
    } catch {
        return false;
    }
}