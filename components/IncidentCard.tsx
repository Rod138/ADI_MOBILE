import { Colors } from "@/constants/colors";
import { type Incident } from "@/hooks/useIncidents";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
    return { color: Colors.primary.main, bg: Colors.primary.soft, border: Colors.screen.border, icon: "ellipse-outline" as const };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface IncidentCardProps {
    item: Incident;
    currentUserId?: number;
    onPress?: (item: Incident) => void;
    onEdit?: (item: Incident) => void;
    onDelete?: (item: Incident) => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function IncidentCard({ item, currentUserId, onPress, onEdit, onDelete }: IncidentCardProps) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const reportedBy = item.users
        ? `${item.users.name} ${item.users.ap}${item.users.am ? " " + item.users.am : ""}`.trim()
        : "—";
    const statusName = item.inc_status?.name ?? "—";
    const ss = getStatusStyle(statusName);
    const { date, time } = formatDateTime(item.created_at);
    const isOwner = currentUserId !== undefined && item.usr_id === currentUserId;

    const isPending = (item.inc_status?.name ?? "").toLowerCase().includes("pend");
    const ageMs = Date.now() - new Date(item.created_at).getTime();
    const withinEditWindow = ageMs < 24 * 60 * 60 * 1000;   // 24 h — editar
    const withinDeleteWindow = ageMs < 2 * 60 * 60 * 1000;  // 2 h  — eliminar

    const showEditBtn = isOwner && onEdit && withinEditWindow && isPending;
    const showDeleteBtn = isOwner && onDelete && withinDeleteWindow && isPending;

    const editedLabel = item.edited_at ? (() => {
        const { date: ed, time: et } = formatDateTime(item.edited_at);
        return `Editada · ${ed} ${et}`;
    })() : null;

    return (
        <>
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => onPress?.(item)}
            >
                {/* Barra lateral de color de estado */}
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
                            <View style={styles.metaRow}>
                                <Text style={styles.metaText}>{date}</Text>
                                <Text style={styles.metaDot}>·</Text>
                                <Text style={styles.metaText}>{time}</Text>
                            </View>
                            {editedLabel && (
                                <Text style={styles.editedText}>{editedLabel}</Text>
                            )}
                        </View>
                        {/* Badge de estado */}
                        <View style={[styles.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                            <Text style={[styles.statusText, { color: ss.color }]}>{statusName}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Área y tipo */}
                    <View style={styles.tagsRow}>
                        <Text style={styles.tagText}>{item.areas?.name ?? "—"}</Text>
                        <Text style={styles.tagSep}>·</Text>
                        <Text style={styles.tagText}>{item.inc_types?.name ?? "—"}</Text>
                    </View>

                    {/* Descripción */}
                    <Text style={styles.description} numberOfLines={3}>{item.description}</Text>

                    {/* Imagen */}
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                    ) : null}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.costText}>${item.cost ?? 0}</Text>
                        <View style={styles.footerRight}>
                            {/* Botón eliminar — papelera minimalista */}
                            {showDeleteBtn && (
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={(e) => { e.stopPropagation?.(); setShowDeleteModal(true); }}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                            {showEditBtn && (
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={(e) => { e.stopPropagation?.(); onEdit!(item); }}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="pencil-outline" size={13} color={Colors.screen.textSecondary} />
                                    <Text style={styles.editBtnText}>Editar</Text>
                                </TouchableOpacity>
                            )}
                            <View style={styles.detailHint}>
                                <Text style={styles.detailHintText}>Ver detalle</Text>
                                <Ionicons name="chevron-forward" size={12} color={Colors.screen.textMuted} />
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Modal de confirmación de eliminación */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={modal.overlay}>
                    <View style={modal.sheet}>
                        {/* Ícono */}
                        <View style={modal.iconWrap}>
                            <Ionicons name="trash-outline" size={28} color="#EF4444" />
                        </View>

                        <Text style={modal.title}>¿Eliminar incidencia?</Text>
                        <Text style={modal.body}>
                            Esta acción no se puede deshacer. La incidencia será eliminada permanentemente.
                        </Text>

                        <View style={modal.actions}>
                            <TouchableOpacity
                                style={[modal.btn, modal.btnCancel]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={modal.btnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[modal.btn, modal.btnDelete]}
                                onPress={() => {
                                    setShowDeleteModal(false);
                                    onDelete?.(item);
                                }}
                            >
                                <Ionicons name="trash-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={modal.btnDeleteText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 28,
    },
    sheet: {
        width: "100%",
        backgroundColor: Colors.screen.card,
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
        elevation: 12,
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#FEF2F2",
        borderWidth: 1.5,
        borderColor: "#FECACA",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 2,
    },
    title: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: Colors.screen.textPrimary,
        textAlign: "center",
    },
    body: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: Colors.screen.textSecondary,
        textAlign: "center",
        lineHeight: 20,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        width: "100%",
        marginTop: 4,
    },
    btn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 13,
        borderRadius: 12,
    },
    btnCancel: {
        backgroundColor: Colors.screen.bg,
        borderWidth: 1,
        borderColor: Colors.screen.border,
    },
    btnDelete: {
        backgroundColor: "#EF4444",
    },
    btnCancelText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: Colors.screen.textSecondary,
    },
    btnDeleteText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 14,
        color: "#FFFFFF",
    },
});

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        backgroundColor: Colors.screen.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        marginBottom: 10,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    statusBar: { width: 3 },
    inner: { flex: 1, padding: 14 },

    topRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    avatar: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: Colors.screen.bg,
        borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: Colors.screen.textSecondary,
    },
    reporterInfo: { flex: 1, gap: 2 },
    reportedBy: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: Colors.screen.textPrimary,
    },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
    },
    metaDot: { fontSize: 11, color: Colors.screen.border },
    editedText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 10,
        color: Colors.screen.textMuted,
        marginTop: 1,
    },

    statusBadge: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexShrink: 0,
    },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },

    divider: { height: 1, backgroundColor: Colors.screen.border, marginBottom: 10 },

    tagsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    tagText: {
        fontFamily: "Outfit_500Medium",
        fontSize: 12,
        color: Colors.screen.textSecondary,
    },
    tagSep: { fontSize: 12, color: Colors.screen.border },

    description: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: Colors.screen.textSecondary,
        lineHeight: 20,
        marginBottom: 10,
    },
    image: { width: "100%", height: 160, borderRadius: 10, marginBottom: 10 },

    footer: {
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: Colors.screen.border,
        paddingTop: 8,
    },
    costText: {
        fontFamily: "Outfit_500Medium",
        fontSize: 12,
        color: Colors.screen.textMuted,
        flex: 1,
    },
    footerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    // Papelera — minimalista, solo ícono con borde suave
    deleteBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        alignItems: "center",
        justifyContent: "center",
    },
    editBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: Colors.screen.bg,
        borderWidth: 1,
        borderColor: Colors.screen.border,
    },
    editBtnText: {
        fontFamily: "Outfit_500Medium",
        fontSize: 12,
        color: Colors.screen.textSecondary,
    },
    detailHint: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    detailHintText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
    },
});