import supabase from "@/lib/supabase";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Notification {
    id: number;
    title: string;
    description: string;
    type_id: number | null;
    usr_id: number;
    created_at: string;
    // "read" puede no existir aún en la BD — lo tratamos como opcional
    read?: boolean | null;
}

interface NotificationsContextValue {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: number) => Promise<boolean>;
    deleteAllNotifications: () => Promise<boolean>;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

// Determina si una notificación está sin leer.
// Si el campo "read" no existe en la BD (undefined/null), la tratamos como no leída.
function isUnread(n: Notification): boolean {
    return n.read !== true;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    refetch: async () => { },
    markAsRead: async () => { },
    markAllAsRead: async () => { },
    deleteNotification: async () => false,
    deleteAllNotifications: async () => false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationsProvider({
    userId,
    children,
}: {
    userId: number | null | undefined;
    children: React.ReactNode;
}) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // unreadCount derivado del estado en memoria — siempre consistente
    const unreadCount = notifications.filter(isUnread).length;

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        if (!userId) {
            setNotifications([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Query simple sin join — evita errores si notification_types no está configurada.
            // El type_id se usa solo para estilos visuales en el cliente, no requiere join.
            const { data, error: dbError } = await supabase
                .from("notifications")
                .select("id, title, description, type_id, usr_id, created_at, read")
                .eq("usr_id", userId)
                .order("created_at", { ascending: false });

            if (dbError) {
                console.error("[Notifications] Supabase error:", dbError.message, dbError.details);

                // Si el error es que la columna "read" no existe, hacemos el query sin ella
                if (
                    dbError.message?.includes("read") ||
                    dbError.code === "42703" // column does not exist
                ) {
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .from("notifications")
                        .select("id, title, description, type_id, usr_id, created_at")
                        .eq("usr_id", userId)
                        .order("created_at", { ascending: false });

                    if (fallbackError) {
                        console.error("[Notifications] Fallback error:", fallbackError.message);
                        setError("No se pudieron cargar las notificaciones.");
                        return;
                    }

                    // Marcar todas como no leídas (read no existe en BD aún)
                    const list = (fallbackData ?? []).map((n: any) => ({ ...n, read: false }));
                    setNotifications(list as Notification[]);
                    return;
                }

                setError("No se pudieron cargar las notificaciones.");
                return;
            }

            const list = (data ?? []).map((n: any) => ({
                ...n,
                // Si read es null (BD tiene el campo pero valor null), tratar como no leído
                read: n.read === true,
            }));

            setNotifications(list as Notification[]);
        } catch (e: any) {
            console.error("[Notifications] Unexpected error:", e?.message);
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Fetch automático cuando el userId está disponible o cambia
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // ── Marcar UNA como leída (optimistic) ───────────────────────────────────
    const markAsRead = useCallback(async (id: number): Promise<void> => {
        // Actualizar en memoria inmediatamente
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );

        try {
            await supabase
                .from("notifications")
                .update({ read: true })
                .eq("id", id);
        } catch (e: any) {
            console.error("[Notifications] markAsRead error:", e?.message);
            // No revertir — la experiencia optimistic es más importante
        }
    }, []);

    // ── Marcar TODAS como leídas (optimistic) ────────────────────────────────
    const markAllAsRead = useCallback(async (): Promise<void> => {
        if (!userId) return;

        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        try {
            await supabase
                .from("notifications")
                .update({ read: true })
                .eq("usr_id", userId);
        } catch (e: any) {
            console.error("[Notifications] markAllAsRead error:", e?.message);
        }
    }, [userId]);

    // ── Eliminar UNA (optimistic) ─────────────────────────────────────────────
    const deleteNotification = useCallback(async (id: number): Promise<boolean> => {
        // Guardar snapshot por si hay que revertir
        const snapshot = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));

        try {
            const { error: dbError } = await supabase
                .from("notifications")
                .delete()
                .eq("id", id);

            if (dbError) {
                console.error("[Notifications] delete error:", dbError.message);
                // Revertir si falla
                if (snapshot) {
                    setNotifications((prev) => [snapshot, ...prev]);
                }
                return false;
            }
            return true;
        } catch (e: any) {
            console.error("[Notifications] delete unexpected:", e?.message);
            if (snapshot) setNotifications((prev) => [snapshot, ...prev]);
            return false;
        }
    }, [notifications]);

    // ── Eliminar TODAS (optimistic) ───────────────────────────────────────────
    const deleteAllNotifications = useCallback(async (): Promise<boolean> => {
        if (!userId) return false;

        const snapshot = [...notifications];
        setNotifications([]);

        try {
            const { error: dbError } = await supabase
                .from("notifications")
                .delete()
                .eq("usr_id", userId);

            if (dbError) {
                console.error("[Notifications] deleteAll error:", dbError.message);
                setNotifications(snapshot);
                return false;
            }
            return true;
        } catch (e: any) {
            console.error("[Notifications] deleteAll unexpected:", e?.message);
            setNotifications(snapshot);
            return false;
        }
    }, [userId, notifications]);

    return (
        <NotificationsContext.Provider
            value={{
                notifications,
                unreadCount,
                isLoading,
                error,
                refetch: fetchNotifications,
                markAsRead,
                markAllAsRead,
                deleteNotification,
                deleteAllNotifications,
            }}
        >
            {children}
        </NotificationsContext.Provider>
    );
}

// ─── Hook de consumo ──────────────────────────────────────────────────────────

export function useNotificationsContext(): NotificationsContextValue {
    return useContext(NotificationsContext);
}