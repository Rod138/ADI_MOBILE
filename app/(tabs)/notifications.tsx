import { ScreenHeader, ScreenShell } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import {
    NOTIFICATION_TYPE,
    useNotifications,
    type Notification,
} from "@/hooks/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 2) return "Ahora";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs}h`;
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7)
        return d.toLocaleDateString("es-MX", { weekday: "long" });
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

// ── Configuración visual por tipo de notificación ─────────────────────────────

interface TypeConfig {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    border: string;
    label: string;
}

function getTypeConfig(typeId: number | null | undefined): TypeConfig {
    switch (typeId) {
        case NOTIFICATION_TYPE.INCIDENT_STATUS_CHANGE:
            return {
                icon: "refresh-circle-outline",
                color: Colors.primary.dark,
                bg: Colors.primary.soft,
                border: Colors.primary.muted,
                label: "Incidencia",
            };
        case NOTIFICATION_TYPE.QUOTA_PUBLISHED:
            return {
                icon: "calendar-outline",
                color: "#0891B2",
                bg: "#F0F9FF",
                border: "#BAE6FD",
                label: "Cuota",
            };
        case NOTIFICATION_TYPE.QUOTA_REJECTED:
            return {
                icon: "close-circle-outline",
                color: Colors.status.error,
                bg: Colors.status.errorBg,
                border: Colors.status.errorBorder,
                label: "Rechazado",
            };
        case NOTIFICATION_TYPE.QUOTA_VALIDATED:
            return {
                icon: "checkmark-circle-outline",
                color: Colors.status.success,
                bg: Colors.status.successBg,
                border: Colors.status.successBorder,
                label: "Aprobado",
            };
        case NOTIFICATION_TYPE.NEW_EXPENSE:
            return {
                icon: "trending-down-outline",
                color: Colors.secondary.main,
                bg: Colors.secondary.soft,
                border: "#FED7AA",
                label: "Gasto",
            };
        case NOTIFICATION_TYPE.NEW_INCIDENT:
            return {
                icon: "warning-outline",
                color: Colors.status.warning,
                bg: Colors.status.warningBg,
                border: Colors.status.warningBorder,
                label: "Nueva incidencia",
            };
        case NOTIFICATION_TYPE.NEW_RECEIPT:
            return {
                icon: "receipt-outline",
                color: "#7C3AED",
                bg: "#F5F3FF",
                border: "#DDD6FE",
                label: "Comprobante",
            };
        default:
            return {
                icon: "notifications-outline",
                color: Colors.primary.main,
                bg: Colors.primary.soft,
                border: Colors.primary.muted,
                label: "Notificación",
            };
    }
}

// ── Notification Card ─────────────────────────────────────────────────────────

function NotificationCard({
    item,
    onDelete,
}: {
    item: Notification;
    onDelete: (id: number) => void;
}) {
    const cfg = getTypeConfig(item.type_id);
    const translateX = useRef(new Animated.Value(0)).current;

    const handleLongPress = () => {
        Alert.alert("Eliminar notificación", "¿Deseas eliminar esta notificación?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: () => {
                    Animated.timing(translateX, {
                        toValue: -400,
                        duration: 280,
                        useNativeDriver: true,
                    }).start(() => onDelete(item.id));
                },
            },
        ]);
    };

    return (
        <Animated.View style={{ transform: [{ translateX }] }}>
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onLongPress={handleLongPress}
                delayLongPress={400}
            >
                {/* Accent side bar */}
                <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />

                {/* Icon */}
                <View style={[styles.cardIcon, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                    <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <View style={styles.cardTopRow}>
                        <View style={[styles.typePill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                            <Text style={[styles.typePillText, { color: cfg.color }]}>
                                {cfg.label}
                            </Text>
                        </View>
                        <Text style={styles.cardTime}>{formatDate(item.created_at)}</Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={styles.cardDescription} numberOfLines={3}>
                        {item.description}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Group Header ──────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
    return (
        <View style={styles.groupHeader}>
            <Text style={styles.groupHeaderText}>{label}</Text>
            <View style={styles.groupHeaderLine} />
        </View>
    );
}

// ── Agrupar notificaciones por fecha ──────────────────────────────────────────

interface ListItem {
    type: "header" | "notification";
    label?: string;
    data?: Notification;
    key: string;
}

function groupNotifications(notifications: Notification[]): ListItem[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, Notification[]> = {
        Hoy: [],
        Ayer: [],
        "Esta semana": [],
        "Más antiguas": [],
    };

    for (const n of notifications) {
        const d = new Date(n.created_at);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() >= today.getTime()) groups["Hoy"].push(n);
        else if (d.getTime() >= yesterday.getTime()) groups["Ayer"].push(n);
        else if (d.getTime() >= weekAgo.getTime()) groups["Esta semana"].push(n);
        else groups["Más antiguas"].push(n);
    }

    const result: ListItem[] = [];
    for (const [label, items] of Object.entries(groups)) {
        if (items.length === 0) continue;
        result.push({ type: "header", label, key: `header-${label}` });
        items.forEach((n) =>
            result.push({ type: "notification", data: n, key: `notif-${n.id}` })
        );
    }
    return result;
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
    const { user } = useSession();
    const { notifications, isLoading, error, refetch, deleteNotification } =
        useNotifications(user?.id ?? 0);

    const listItems = groupNotifications(notifications);

    const handleDeleteAll = () => {
        if (notifications.length === 0) return;
        Alert.alert(
            "Limpiar notificaciones",
            "¿Deseas eliminar todas tus notificaciones?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar todas",
                    style: "destructive",
                    onPress: async () => {
                        for (const n of notifications) {
                            await deleteNotification(n.id);
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScreenShell theme="light">
            <ScreenHeader
                theme="light"
                title="Notificaciones"
                logoIcon="notifications"
                rightActions={[
                    ...(notifications.length > 0
                        ? [{ icon: "trash-outline" as const, onPress: handleDeleteAll }]
                        : []),
                    { icon: "refresh-outline" as const, onPress: refetch },
                ]}
            />

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary.main} />
                    <Text style={styles.stateText}>Cargando notificaciones...</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <View style={styles.stateIconWrap}>
                        <Ionicons name="cloud-offline-outline" size={32} color={Colors.screen.textMuted} />
                    </View>
                    <Text style={styles.stateTitle}>Sin conexión</Text>
                    <Text style={styles.stateText}>{error}</Text>
                    <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
                        <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.centered}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="notifications-off-outline" size={36} color={Colors.screen.textMuted} />
                    </View>
                    <Text style={styles.stateTitle}>Sin notificaciones</Text>
                    <Text style={styles.stateText}>
                        Aquí aparecerán los avisos sobre cuotas, incidencias y gastos del condominio.
                    </Text>
                </View>
            ) : (
                <>
                    {/* Summary pill */}
                    <View style={styles.summaryBar}>
                        <Ionicons name="notifications" size={13} color={Colors.primary.main} />
                        <Text style={styles.summaryText}>
                            {notifications.length} notificación{notifications.length !== 1 ? "es" : ""}
                        </Text>
                        <Text style={styles.summaryHint}>· Mantén presionado para eliminar</Text>
                    </View>

                    <FlatList
                        data={listItems}
                        keyExtractor={(item) => item.key}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        onRefresh={refetch}
                        refreshing={isLoading}
                        renderItem={({ item }) => {
                            if (item.type === "header") {
                                return <GroupHeader label={item.label!} />;
                            }
                            return (
                                <NotificationCard
                                    item={item.data!}
                                    onDelete={deleteNotification}
                                />
                            );
                        }}
                    />
                </>
            )}
        </ScreenShell>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // States
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 32,
    },
    stateIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: Colors.neutral[100],
        alignItems: "center",
        justifyContent: "center",
    },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: Colors.primary.soft,
        borderWidth: 1,
        borderColor: Colors.primary.muted,
        alignItems: "center",
        justifyContent: "center",
    },
    stateTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 17,
        color: Colors.screen.textSecondary,
    },
    stateText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: Colors.screen.textMuted,
        textAlign: "center",
        lineHeight: 20,
    },
    retryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: Colors.primary.soft,
        borderWidth: 1,
        borderColor: Colors.primary.muted,
        marginTop: 4,
    },
    retryText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: Colors.primary.dark,
    },

    // Summary bar
    summaryBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: Colors.primary.soft,
        borderBottomWidth: 1,
        borderBottomColor: Colors.primary.muted,
    },
    summaryText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: Colors.primary.dark,
    },
    summaryHint: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.primary.dark,
        opacity: 0.6,
    },

    // List
    list: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 32,
        gap: 8,
    },

    // Group header
    groupHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 8,
        marginBottom: 4,
    },
    groupHeaderText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 10,
        color: Colors.screen.textMuted,
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    groupHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.screen.border,
    },

    // Card
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        backgroundColor: Colors.screen.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    cardAccent: {
        width: 3,
        alignSelf: "stretch",
        flexShrink: 0,
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 12,
    },
    cardContent: {
        flex: 1,
        paddingTop: 12,
        paddingBottom: 12,
        paddingRight: 14,
        gap: 4,
    },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    typePill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    typePillText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 9,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    cardTime: {
        fontFamily: "Outfit_400Regular",
        fontSize: 10,
        color: Colors.screen.textMuted,
    },
    cardTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 13,
        color: Colors.screen.textPrimary,
        lineHeight: 18,
    },
    cardDescription: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: Colors.screen.textSecondary,
        lineHeight: 18,
    },
});