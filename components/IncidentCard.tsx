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
        return { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "checkmark-circle-outline" as const };
    if (n.includes("pend"))
        return { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "time-outline" as const };
    if (n.includes("cerr"))
        return { color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB", icon: "lock-closed-outline" as const };
    return { color: Colors.primary.main, bg: Colors.screen.chipBlue, border: Colors.screen.border, icon: "ellipse-outline" as const };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface IncidentCardProps {
    item: Incident;
    /** ID del usuario en sesión — muestra botón Editar si coincide con el creador */
    currentUserId?: number;
    onEdit?: (item: Incident) => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function IncidentCard({ item, currentUserId, onEdit }: IncidentCardProps) {
    const reportedBy = item.users
        ? `${item.users.name} ${item.users.ap}${item.users.am ? " " + item.users.am : ""}`.trim()
        : "—";
    const statusName = item.inc_status?.name ?? "—";
    const ss = getStatusStyle(statusName);
    const { date, time } = formatDateTime(item.created_at);
    const isOwner = currentUserId !== undefined && item.usr_id === currentUserId;

    // Botón Editar solo visible durante las primeras 24h desde la creación
    const withinEditWindow = Date.now() - new Date(item.created_at).getTime() < 24 * 60 * 60 * 1000;
    const showEditBtn = isOwner && onEdit && withinEditWindow;

    // Badge "Editada" con fecha y hora
    const editedLabel = item.edited_at ? (() => {
        const { date: ed, time: et } = formatDateTime(item.edited_at);
        return `Editada · ${ed} ${et}`;
    })() : null;

    return (
        <View style={styles.card}>
            <View style={[styles.statusBar, { backgroundColor: ss.color }]} />
            <View style={styles.inner}>

                {/* Fila superior */}
                <View style={styles.topRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {reportedBy.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.reporterInfo}>
                        <Text style={styles.reportedBy} numberOfLines={1}>{reportedBy}</Text>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={11} color={Colors.screen.textMuted} />
                            <Text style={styles.dateText}>{date}</Text>
                            <View style={styles.dot} />
                            <Ionicons name="time-outline" size={11} color={Colors.screen.textMuted} />
                            <Text style={styles.dateText}>{time}</Text>
                        </View>
                        {editedLabel && (
                            <View style={styles.editedBadge}>
                                <Ionicons name="create-outline" size={11} color="#7C6FAE" />
                                <Text style={styles.editedText}>{editedLabel}</Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                        <Ionicons name={ss.icon} size={12} color={ss.color} />
                        <Text style={[styles.statusText, { color: ss.color }]}>{statusName}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Chips */}
                <View style={styles.chips}>
                    <View style={styles.chipBlue}>
                        <Ionicons name="grid-outline" size={11} color={Colors.screen.chipBlueTxt} />
                        <Text style={[styles.chipText, { color: Colors.screen.chipBlueTxt }]}>
                            {item.areas?.name ?? "—"}
                        </Text>
                    </View>
                    <View style={styles.chipPurple}>
                        <Ionicons name="alert-circle-outline" size={11} color={Colors.screen.chipPurpleTxt} />
                        <Text style={[styles.chipText, { color: Colors.screen.chipPurpleTxt }]}>
                            {item.inc_types?.name ?? "—"}
                        </Text>
                    </View>
                </View>

                {/* Descripción */}
                <Text style={styles.description} numberOfLines={3}>{item.description}</Text>

                {/* Imagen */}
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                ) : null}

                {/* Footer: costo + botón editar */}
                <View style={styles.footer}>
                    <Ionicons name="cash-outline" size={12} color={Colors.screen.textMuted} />
                    <Text style={styles.costLabel}>Costo:</Text>
                    <Text style={styles.costValue}>${item.cost ?? 0}</Text>

                    {showEditBtn && (
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => onEdit!(item)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="pencil-outline" size={13} color={Colors.primary.main} />
                            <Text style={styles.editBtnText}>Editar</Text>
                        </TouchableOpacity>
                    )}
                </View>

            </View>
        </View>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    card: {
        flexDirection: "row", backgroundColor: Colors.screen.card,
        borderRadius: 16, borderWidth: 1, borderColor: Colors.screen.border,
        marginBottom: 10, overflow: "hidden",
        shadowColor: "#1E2D4A", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    statusBar: { width: 4 },
    inner: { flex: 1, padding: 14 },
    topRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    avatar: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.screen.chipBlue, borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarText: { fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.screen.chipBlueTxt },
    reporterInfo: { flex: 1, gap: 3 },
    reportedBy: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textPrimary },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    dateText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.screen.border },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0,
    },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
    divider: { height: 1, backgroundColor: Colors.screen.border, marginBottom: 10 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
    chipBlue: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: Colors.screen.chipBlue, borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 4,
        borderWidth: 1, borderColor: Colors.screen.border,
    },
    chipPurple: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: Colors.screen.chipPurple, borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 4,
        borderWidth: 1, borderColor: "#DDD6FE",
    },
    chipText: { fontFamily: "Outfit_500Medium", fontSize: 11 },
    description: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: Colors.screen.textSecondary, lineHeight: 20, marginBottom: 10,
    },
    image: { width: "100%", height: 160, borderRadius: 12, marginBottom: 10 },
    footer: {
        flexDirection: "row", alignItems: "center", gap: 5,
        borderTopWidth: 1, borderTopColor: Colors.screen.border, paddingTop: 8,
    },
    costLabel: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted },
    costValue: { fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.screen.textSecondary, flex: 1 },
    editedBadge: {
        flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 3,
        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
        backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", marginTop: 2,
    },
    editedText: { fontFamily: "Outfit_400Regular", fontSize: 10, color: "#7C6FAE" },
    editBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
        backgroundColor: Colors.screen.chipBlue,
        borderWidth: 1, borderColor: Colors.screen.border,
    },
    editBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.primary.main },
});