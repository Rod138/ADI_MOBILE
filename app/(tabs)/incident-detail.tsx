import { BackButton } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { type Incident } from "@/hooks/useIncidents";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFull(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
        day: "2-digit", month: "long", year: "numeric",
    }) + " · " + d.toLocaleTimeString("es-MX", {
        hour: "2-digit", minute: "2-digit", hour12: true,
    });
}

function getStatusStyle(name: string) {
    const n = name?.toLowerCase() ?? "";
    if (n.includes("resuel") || n.includes("complet"))
        return { color: Colors.status.success, bg: Colors.status.successBg, border: Colors.status.successBorder, icon: "checkmark-circle" as const };
    if (n.includes("pend"))
        return { color: Colors.status.warning, bg: Colors.status.warningBg, border: Colors.status.warningBorder, icon: "time" as const };
    if (n.includes("cerr"))
        return { color: Colors.screen.textMuted, bg: Colors.neutral[100], border: Colors.screen.border, icon: "lock-closed" as const };
    return { color: Colors.primary.dark, bg: Colors.primary.soft, border: Colors.primary.muted, icon: "ellipse" as const };
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
    return (
        <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>{label}</Text>
        </View>
    );
}

function InfoRow({ icon, label, value, valueColor, last = false }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    valueColor?: string;
    last?: boolean;
}) {
    return (
        <>
            <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                    <Ionicons name={icon} size={15} color={Colors.primary.main} />
                </View>
                <View style={styles.infoTexts}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>
                        {value}
                    </Text>
                </View>
            </View>
            {!last && <View style={styles.rowDivider} />}
        </>
    );
}

// ── Pantalla ──────────────────────────────────────────────────────────────────

export default function IncidentDetailScreen() {
    const { data } = useLocalSearchParams<{ data: string }>();
    const [incident, setIncident] = useState<Incident | null>(null);

    useEffect(() => {
        if (data) {
            try { setIncident(JSON.parse(data) as Incident); }
            catch { setIncident(null); }
        }
    }, [data]);

    if (!incident) {
        return (
            <View style={styles.root}>
                <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
                <SafeAreaView style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary.main} />
                </SafeAreaView>
            </View>
        );
    }

    const reportedBy = incident.users
        ? `${incident.users.name} ${incident.users.ap}${incident.users.am ? " " + incident.users.am : ""}`.trim()
        : "—";
    const statusName = incident.inc_status?.name ?? "—";
    const ss = getStatusStyle(statusName);
    const initials = reportedBy.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

    const hasDates = incident.edited_at || incident.completed_at || incident.closed_at;

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* Top bar */}
                <View style={styles.topBar}>
                    <BackButton theme="light" label="Incidencias" onPress={() => router.back()} />
                    <View style={[styles.statusPill, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                        <Ionicons name={ss.icon} size={12} color={ss.color} />
                        <Text style={[styles.statusPillText, { color: ss.color }]}>{statusName}</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero */}
                    <View style={styles.heroCard}>
                        <View style={[styles.heroAvatar, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                            <Text style={[styles.heroInitials, { color: ss.color }]}>{initials}</Text>
                        </View>
                        <View style={styles.heroInfo}>
                            <Text style={styles.heroName}>{reportedBy}</Text>
                            <Text style={styles.heroDate}>
                                {new Date(incident.created_at).toLocaleDateString("es-MX", {
                                    day: "2-digit", month: "long", year: "numeric"
                                })}
                            </Text>
                        </View>
                        {incident.edited_at && (
                            <View style={styles.editedTag}>
                                <Ionicons name="create-outline" size={11} color={Colors.primary.dark} />
                                <Text style={styles.editedTagText}>Editada</Text>
                            </View>
                        )}
                    </View>

                    {/* Imagen */}
                    {incident.image ? (
                        <Image
                            source={{ uri: incident.image }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.noImage}>
                            <Ionicons name="image-outline" size={22} color={Colors.screen.textMuted} />
                            <Text style={styles.noImageText}>Sin imagen adjunta</Text>
                        </View>
                    )}

                    {/* Descripción */}
                    <View style={styles.card}>
                        <SectionLabel label="Descripción" />
                        <Text style={styles.description}>{incident.description}</Text>
                    </View>

                    {/* Clasificación */}
                    <View style={styles.card}>
                        <SectionLabel label="Clasificación" />
                        <InfoRow icon="location-outline" label="Área" value={incident.areas?.name ?? "—"} />
                        <InfoRow icon="pricetag-outline" label="Tipo de incidencia" value={incident.inc_types?.name ?? "—"} />
                        <InfoRow
                            icon="cash-outline"
                            label="Costo estimado"
                            value={incident.cost != null ? `$${incident.cost.toLocaleString("es-MX")}` : "Sin asignar"}
                            last
                        />
                    </View>

                    {/* Fechas */}
                    <View style={styles.card}>
                        <SectionLabel label="Línea de tiempo" />
                        <InfoRow icon="calendar-outline" label="Reportada" value={formatFull(incident.created_at)} last={!hasDates} />
                        {incident.edited_at && (
                            <InfoRow icon="create-outline" label="Última edición" value={formatFull(incident.edited_at)} last={!incident.completed_at && !incident.closed_at} />
                        )}
                        {incident.completed_at && (
                            <InfoRow
                                icon="checkmark-done-outline"
                                label="Completada"
                                value={formatFull(incident.completed_at)}
                                valueColor={Colors.status.success}
                                last={!incident.closed_at}
                            />
                        )}
                        {incident.closed_at && (
                            <InfoRow
                                icon="lock-closed-outline"
                                label="Cerrada"
                                value={formatFull(incident.closed_at)}
                                valueColor={Colors.screen.textMuted}
                                last
                            />
                        )}
                    </View>

                    {/* Notas del administrador */}
                    <View style={styles.card}>
                        <SectionLabel label="Notas del administrador" />
                        {incident.notes ? (
                            <Text style={styles.notes}>{incident.notes}</Text>
                        ) : (
                            <View style={styles.emptyNotes}>
                                <Ionicons name="document-text-outline" size={18} color={Colors.screen.textMuted} />
                                <Text style={styles.emptyNotesText}>Sin notas por el momento</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },

    // Top bar
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.screen.border,
    },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    statusPillText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
    },

    scroll: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 40,
        gap: 10,
    },

    // Hero
    heroCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: Colors.screen.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        padding: 16,
    },
    heroAvatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    heroInitials: {
        fontFamily: "Outfit_700Bold",
        fontSize: 17,
        letterSpacing: 1,
    },
    heroInfo: { flex: 1, gap: 3 },
    heroName: {
        fontFamily: "Outfit_700Bold",
        fontSize: 15,
        color: Colors.screen.textPrimary,
    },
    heroDate: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: Colors.screen.textMuted,
    },
    editedTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: Colors.primary.soft,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.primary.muted,
    },
    editedTagText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 10,
        color: Colors.primary.dark,
    },

    // Image
    image: {
        width: "100%",
        height: 220,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.screen.border,
    },
    noImage: {
        height: 68,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Colors.screen.border,
        borderStyle: "dashed",
        backgroundColor: Colors.screen.card,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    noImageText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: Colors.screen.textMuted,
    },

    // Cards
    card: {
        backgroundColor: Colors.screen.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        padding: 16,
        gap: 0,
    },

    // Section label
    sectionLabel: {
        marginBottom: 14,
    },
    sectionLabelText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 11,
        color: Colors.screen.textMuted,
        letterSpacing: 1.4,
        textTransform: "uppercase",
    },

    // Info rows
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
    },
    infoIcon: {
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: Colors.primary.soft,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    infoTexts: { flex: 1, gap: 2 },
    infoLabel: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
    },
    infoValue: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: Colors.screen.textPrimary,
    },
    rowDivider: {
        height: 1,
        backgroundColor: Colors.screen.border,
        marginLeft: 44,
    },

    // Description
    description: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: Colors.screen.textSecondary,
        lineHeight: 22,
    },

    // Notes
    notes: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: Colors.screen.textSecondary,
        lineHeight: 22,
    },
    emptyNotes: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
    },
    emptyNotesText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: Colors.screen.textMuted,
    },
});