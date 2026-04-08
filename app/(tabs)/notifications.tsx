import { ScreenHeader, ScreenShell } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import {
    useNotificationsContext,
    type Notification,
} from "@/context/NotificationsContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

// ── Constantes de tipo (coinciden con notification_types en BD) ───────────────

const NTYPE = {
    INCIDENT_STATUS_CHANGE: 1,
    QUOTA_PUBLISHED: 2,
    QUOTA_REJECTED: 3,
    QUOTA_VALIDATED: 4,
    NEW_EXPENSE: 5,
    NEW_INCIDENT: 6,
    NEW_RECEIPT: 7,
} as const;

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
    if (diffDays < 7) return d.toLocaleDateString("es-MX", { weekday: "long" });
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

// ── Config visual por tipo ────────────────────────────────────────────────────

interface TypeConfig {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    border: string;
    label: string;
}

function getTypeConfig(typeId: number | null | undefined): TypeConfig {
    switch (typeId) {
        case NTYPE.INCIDENT_STATUS_CHANGE:
            return { icon: "refresh-circle-outline", color: Colors.primary.dark, bg: Colors.primary.soft, border: Colors.primary.muted, label: "Incidencia" };
        case NTYPE.QUOTA_PUBLISHED:
            return { icon: "calendar-outline", color: "#0891B2", bg: "#F0F9FF", border: "#BAE6FD", label: "Cuota" };
        case NTYPE.QUOTA_REJECTED:
            return { icon: "close-circle-outline", color: Colors.status.error, bg: Colors.status.errorBg, border: Colors.status.errorBorder, label: "Rechazado" };
        case NTYPE.QUOTA_VALIDATED:
            return { icon: "checkmark-circle-outline", color: Colors.status.success, bg: Colors.status.successBg, border: Colors.status.successBorder, label: "Aprobado" };
        case NTYPE.NEW_EXPENSE:
            return { icon: "trending-down-outline", color: Colors.secondary.main, bg: Colors.secondary.soft, border: "#FED7AA", label: "Gasto" };
        case NTYPE.NEW_INCIDENT:
            return { icon: "warning-outline", color: Colors.status.warning, bg: Colors.status.warningBg, border: Colors.status.warningBorder, label: "Incidencia" };
        case NTYPE.NEW_RECEIPT:
            return { icon: "receipt-outline", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", label: "Comprobante" };
        default:
            return { icon: "notifications-outline", color: Colors.primary.main, bg: Colors.primary.soft, border: Colors.primary.muted, label: "Aviso" };
    }
}

// ── Notification Card ─────────────────────────────────────────────────────────

function NotificationCard({
    item,
    onPress,
    onDelete,
}: {
    item: Notification;
    onPress: (id: number) => void;
    onDelete: (id: number) => void;
}) {
    const cfg = getTypeConfig(item.type_id);
    const translateX = useRef(new Animated.Value(0)).current;
    const isUnread = item.read !== true;

    const handleLongPress = () => {
        Alert.alert("Notificación", "¿Qué deseas hacer?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: () => {
                    Animated.timing(translateX, {
                        toValue: -400,
                        duration: 260,
                        useNativeDriver: true,
                    }).start(() => onDelete(item.id));
                },
            },
        ]);
    };

    return (
        <Animated.View style={{ transform: [{ translateX }] }}>
            <TouchableOpacity
                style={[styles.card, isUnread && styles.cardUnread]}
                activeOpacity={0.82}
                onPress={() => onPress(item.id)}
                onLongPress={handleLongPress}
                delayLongPress={400}
            >
                {/* Accent lateral */}
                <View style={[
                    styles.cardAccent,
                    { backgroundColor: isUnread ? cfg.color : Colors.screen.border },
                ]} />

                {/* Ícono */}
                <View style={[
                    styles.cardIcon,
                    {
                        backgroundColor: isUnread ? cfg.bg : Colors.neutral[100],
                        borderColor: isUnread ? cfg.border : Colors.screen.border,
                    },
                ]}>
                    <Ionicons
                        name={cfg.icon}
                        size={20}
                        color={isUnread ? cfg.color : Colors.screen.textMuted}
                    />
                </View>

                {/* Contenido */}
                <View style={styles.cardContent}>
                    <View style={styles.cardTopRow}>
                        <View style={[
                            styles.typePill,
                            {
                                backgroundColor: isUnread ? cfg.bg : Colors.neutral[100],
                                borderColor: isUnread ? cfg.border : Colors.screen.border,
                            },
                        ]}>
                            <Text style={[styles.typePillText, { color: isUnread ? cfg.color : Colors.screen.textMuted }]}>
                                {cfg.label}
                            </Text>
                        </View>
                        <View style={styles.cardTopRight}>
                            <Text style={styles.cardTime}>{formatDate(item.created_at)}</Text>
                            {isUnread && (
                                <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />
                            )}
                        </View>
                    </View>

                    <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={styles.cardDescription} numberOfLines={3}>
                        {item.description}
                    </Text>

                    {isUnread && (
                        <View style={styles.readHint}>
                            <Ionicons name="eye-outline" size={10} color={cfg.color} />
                            <Text style={[styles.readHintText, { color: cfg.color }]}>
                                Toca para marcar como leído
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Group Header ──────────────────────────────────────────────────────────────

function GroupHeader({ label, count }: { label: string; count: number }) {
    return (
        <View style={styles.groupHeader}>
            <Text style={styles.groupHeaderText}>{label}</Text>
            <View style={styles.groupHeaderLine} />
            <View style={styles.groupCountBadge}>
                <Text style={styles.groupCountText}>{count}</Text>
            </View>
        </View>
    );
}

// ── Agrupar por fecha ─────────────────────────────────────────────────────────

interface ListItem {
    type: "header" | "notification";
    label?: string;
    count?: number;
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
        result.push({ type: "header", label, count: items.length, key: `header-${label}` });
        items.forEach((n) =>
            result.push({ type: "notification", data: n, key: `notif-${n.id}` })
        );
    }
    return result;
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
    const { user } = useSession();

    // Consume el contexto compartido — mismo estado que el badge del layout
    const {
        notifications,
        isLoading,
        error,
        unreadCount,
        refetch,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
    } = useNotificationsContext();

    const listItems = groupNotifications(notifications);


    const handleCardPress = async (id: number, notification: Notification) => {
        markAsRead(id);

        const { type_id } = notification;

        if (type_id === NTYPE.INCIDENT_STATUS_CHANGE || type_id === NTYPE.NEW_INCIDENT) {
            router.push("/(incidents)" as any);
        } else if (
            type_id === NTYPE.QUOTA_PUBLISHED ||
            type_id === NTYPE.QUOTA_REJECTED ||
            type_id === NTYPE.QUOTA_VALIDATED
        ) {
            router.push("/(finance)/recipes" as any);
        } else if (type_id === NTYPE.NEW_EXPENSE) {
            router.push("/(finance)/expenses" as any);
        } else if (type_id === NTYPE.NEW_RECEIPT) {
            router.push("/(finance)/admin-recipes" as any);
        }
    };

    const handleDeleteAll = () => {
        if (notifications.length === 0) return;
        Alert.alert(
            "Limpiar notificaciones",
            `¿Eliminar todas las notificaciones (${notifications.length})?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar todas",
                    style: "destructive",
                    onPress: () => deleteAllNotifications(),
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
                    <Text style={styles.stateTitle}>Error al cargar</Text>
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
                    {/* Barra de resumen */}
                    <View style={styles.summaryBar}>
                        <View style={styles.summaryLeft}>
                            {unreadCount > 0 ? (
                                <>
                                    <View style={styles.unreadBadgeLarge}>
                                        <Text style={styles.unreadBadgeLargeText}>{unreadCount}</Text>
                                    </View>
                                    <Text style={styles.summaryText}>sin leer</Text>
                                    <Text style={styles.summaryTotal}>· {notifications.length} total</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={14} color={Colors.status.success} />
                                    <Text style={[styles.summaryText, { color: Colors.status.success }]}>
                                        Todo al día
                                    </Text>
                                    <Text style={styles.summaryTotal}>· {notifications.length} notificaciones</Text>
                                </>
                            )}
                        </View>
                        {unreadCount > 0 && (
                            <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead} activeOpacity={0.8}>
                                <Ionicons name="checkmark-done-outline" size={13} color={Colors.primary.dark} />
                                <Text style={styles.markAllText}>Marcar todo</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Hint */}
                    <View style={styles.hintBar}>
                        <Ionicons name="hand-left-outline" size={11} color={Colors.screen.textMuted} />
                        <Text style={styles.hintText}>Mantén presionado para eliminar</Text>
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
                                return <GroupHeader label={item.label!} count={item.count!} />;
                            }
                            return (
                                <NotificationCard
                                    item={item.data!}
                                    onPress={(id) => handleCardPress(id, item.data!)}
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
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
    stateIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center" },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted, alignItems: "center", justifyContent: "center" },
    stateTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: Colors.screen.textSecondary },
    stateText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20 },
    retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted, marginTop: 4 },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },

    summaryBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.screen.card, borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    summaryLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    unreadBadgeLarge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: Colors.status.error, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
    unreadBadgeLargeText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: "#fff" },
    summaryText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.screen.textSecondary },
    summaryTotal: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    markAllBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted },
    markAllText: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: Colors.primary.dark },

    hintBar: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: Colors.neutral[50], borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    hintText: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted },

    list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 8 },

    groupHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 4 },
    groupHeaderText: { fontFamily: "Outfit_700Bold", fontSize: 10, color: Colors.screen.textMuted, letterSpacing: 1.5, textTransform: "uppercase" },
    groupHeaderLine: { flex: 1, height: 1, backgroundColor: Colors.screen.border },
    groupCountBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.neutral[200], alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
    groupCountText: { fontFamily: "Outfit_700Bold", fontSize: 9, color: Colors.screen.textSecondary },

    card: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: Colors.screen.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.screen.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    cardUnread: { backgroundColor: "#FAFFFE", borderColor: Colors.primary.muted, shadowOpacity: 0.08, elevation: 3 },
    cardAccent: { width: 3, alignSelf: "stretch", flexShrink: 0 },
    cardIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 12 },
    cardContent: { flex: 1, paddingTop: 12, paddingBottom: 12, paddingRight: 14, gap: 4 },
    cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    cardTopRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    typePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    typePillText: { fontFamily: "Outfit_700Bold", fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase" },
    cardTime: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted },
    unreadDot: { width: 8, height: 8, borderRadius: 4 },
    cardTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textSecondary, lineHeight: 18 },
    cardTitleUnread: { fontFamily: "Outfit_700Bold", color: Colors.screen.textPrimary },
    cardDescription: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textSecondary, lineHeight: 18 },
    readHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    readHintText: { fontFamily: "Outfit_400Regular", fontSize: 10 },
});