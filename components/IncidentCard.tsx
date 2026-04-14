import { Colors } from "@/constants/colors";
import { type Incident } from "@/hooks/useIncidents";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatDateTime(iso: string) {
    const d = new Date(iso);
    return {
        date: d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true }),
    };
}

export function getStatusStyle(name: string) {
    const n = name?.toLowerCase() ?? "";
    if (n.includes("resuel") || n.includes("complet"))
        return {
            color: Colors.status.success,
            bg: Colors.status.successBg,
            border: Colors.status.successBorder,
            icon: "checkmark-circle" as const,
            label: n,
        };
    if (n.includes("pend"))
        return {
            color: Colors.status.warning,
            bg: Colors.status.warningBg,
            border: Colors.status.warningBorder,
            icon: "time" as const,
            label: n,
        };
    if (n.includes("cerr"))
        return {
            color: Colors.screen.textMuted,
            bg: Colors.neutral[100],
            border: Colors.screen.border,
            icon: "lock-closed" as const,
            label: n,
        };
    return {
        color: Colors.primary.dark,
        bg: Colors.primary.soft,
        border: Colors.primary.muted,
        icon: "ellipse" as const,
        label: n,
    };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface IncidentCardProps {
    item: Incident;
    currentUserId?: number;
    currentUserRole?: number; // 1=Residente, 2=Tesorero, 3=Admin, 4=Tesorero+Admin
    onPress?: (item: Incident) => void;
    onEdit?: (item: Incident) => void;
    onAdminEdit?: (item: Incident) => void; // Panel admin
    onDelete?: (item: Incident) => void;   // Eliminar (solo dueño dentro ventana)
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function IncidentCard({
    item,
    currentUserId,
    currentUserRole = 1,
    onPress,
    onEdit,
    onAdminEdit,
    onDelete,
}: IncidentCardProps) {
    const reportedBy = item.users
        ? `${item.users.name} ${item.users.ap}${item.users.am ? " " + item.users.am : ""}`.trim()
        : "—";
    const statusName = item.inc_status?.name ?? "—";
    const ss = getStatusStyle(statusName);
    const { date, time } = formatDateTime(item.created_at);
    const isOwner = currentUserId !== undefined && Number(item.usr_id) === Number(currentUserId);
    const isAdmin = currentUserRole >= 3;

    const statusLower = (item.inc_status?.name ?? "").toLowerCase();
    const isPending = statusLower.includes("pend") || (!statusLower.includes("resuel") && !statusLower.includes("cerr") && !statusLower.includes("complet"));
    const withinEditWindow = Date.now() - new Date(item.created_at).getTime() < 24 * 60 * 60 * 1000; // 24 horas
    const showEditBtn = isOwner && onEdit && withinEditWindow && isPending;
    const showAdminBtn = isAdmin && onAdminEdit;
    const showDeleteBtn = isOwner && onDelete && withinEditWindow && isPending;

    const editedLabel = item.edited_at
        ? (() => {
            const { date: ed, time: et } = formatDateTime(item.edited_at);
            return `Editada · ${ed} ${et}`;
        })()
        : null;

    const initials = reportedBy
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.82}
            onPress={() => onPress?.(item)}
        >
            {/* Accent top bar */}
            <View style={[styles.accentBar, { backgroundColor: ss.color }]} />

            <View style={styles.inner}>
                {/* Header row */}
                <View style={styles.headerRow}>
                    <View style={[styles.avatar, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                        <Text style={[styles.avatarText, { color: ss.color }]}>{initials}</Text>
                    </View>
                    <View style={styles.headerMeta}>
                        <Text style={styles.reportedBy} numberOfLines={1}>{reportedBy}</Text>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={10} color={Colors.screen.textMuted} />
                            <Text style={styles.dateText}>{date} · {time}</Text>
                        </View>
                        {editedLabel && (
                            <View style={styles.editedRow}>
                                <Ionicons name="create-outline" size={10} color={Colors.primary.main} />
                                <Text style={styles.editedText}>{editedLabel}</Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                        <Ionicons name={ss.icon} size={12} color={ss.color} />
                        <Text style={[styles.statusText, { color: ss.color }]}>{statusName}</Text>
                    </View>
                </View>

                {/* Classification chips */}
                <View style={styles.chipsRow}>
                    {item.areas?.name && (
                        <View style={styles.chip}>
                            <Ionicons name="location-outline" size={10} color={Colors.screen.textSecondary} />
                            <Text style={styles.chipText}>{item.areas.name}</Text>
                        </View>
                    )}
                    {item.inc_types?.name && (
                        <View style={styles.chip}>
                            <Ionicons name="pricetag-outline" size={10} color={Colors.screen.textSecondary} />
                            <Text style={styles.chipText}>{item.inc_types.name}</Text>
                        </View>
                    )}
                </View>

                {/* Description */}
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

                {/* Image */}
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                ) : null}

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.costPill}>
                        <Ionicons name="cash-outline" size={12} color={Colors.screen.textMuted} />
                        <Text style={styles.costText}>${item.cost ?? 0}</Text>
                    </View>

                    <View style={styles.footerRight}>
                        {/* Admin: botón Gestionar */}
                        {showAdminBtn && (
                            <TouchableOpacity
                                style={styles.adminBtn}
                                onPress={(e) => { e.stopPropagation?.(); onAdminEdit!(item); }}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="shield-outline" size={12} color={Colors.primary.dark} />
                                <Text style={styles.adminBtnText}>Gestionar</Text>
                            </TouchableOpacity>
                        )}

                        {/* Owner: botón Editar */}
                        {showEditBtn && (
                            <TouchableOpacity
                                style={styles.editBtn}
                                onPress={(e) => { e.stopPropagation?.(); onEdit!(item); }}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="pencil" size={14} color={Colors.primary.dark} />
                            </TouchableOpacity>
                        )}

                        {/* Owner: botón Eliminar (solo dueño, pendiente, dentro de 24h) */}
                        {showDeleteBtn && (
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={(e) => { e.stopPropagation?.(); onDelete!(item); }}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="trash-outline" size={14} color={Colors.status.error} />
                            </TouchableOpacity>
                        )}

                        <View style={styles.detailHint}>
                            <Text style={styles.detailHintText}>Ver detalle</Text>
                            <Ionicons name="chevron-forward" size={12} color={Colors.primary.main} />
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.screen.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        marginBottom: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    accentBar: { height: 3, width: "100%" },
    inner: { padding: 14, gap: 10 },

    headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    avatar: {
        width: 38, height: 38, borderRadius: 12, borderWidth: 1.5,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarText: { fontFamily: "Outfit_700Bold", fontSize: 13, letterSpacing: 0.5 },
    headerMeta: { flex: 1, gap: 3 },
    reportedBy: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textPrimary, lineHeight: 18 },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    dateText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    editedRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    editedText: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.primary.main },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, flexShrink: 0,
    },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, letterSpacing: 0.2 },

    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: Colors.neutral[100], borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.screen.border,
    },
    chipText: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.screen.textSecondary },

    description: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textSecondary, lineHeight: 19 },

    image: { width: "100%", height: 160, borderRadius: 10 },

    footer: {
        flexDirection: "row", alignItems: "center",
        paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.screen.border,
    },
    costPill: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
    costText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textMuted },
    footerRight: { flexDirection: "row", alignItems: "center", gap: 8 },

    // Admin button — verde oscuro
    adminBtn: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    adminBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.primary.dark },

    // Edit button (minimalist icon)
    editBtn: {
        width: 28, height: 28, borderRadius: 8,
        alignItems: "center", justifyContent: "center",
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },

    // Delete button (minimalist icon)
    deleteBtn: {
        width: 28, height: 28, borderRadius: 8,
        alignItems: "center", justifyContent: "center",
        backgroundColor: Colors.status.errorBg, borderWidth: 1, borderColor: Colors.status.errorBorder,
    },

    detailHint: { flexDirection: "row", alignItems: "center", gap: 2 },
    detailHintText: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.primary.main },
});