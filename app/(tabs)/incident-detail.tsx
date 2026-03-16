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

//  Helpers 

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
        return { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "checkmark-circle-outline" as const };
    if (n.includes("pend"))
        return { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "time-outline" as const };
    if (n.includes("cerr"))
        return { color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB", icon: "lock-closed-outline" as const };
    return { color: Colors.primary.main, bg: Colors.primary.soft, border: Colors.screen.border, icon: "ellipse-outline" as const };
}

//  Sub-componentes 

function SectionTitle({ label }: { label: string }) {
    return (
        <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitleText}>{label}</Text>
            <View style={styles.sectionTitleLine} />
        </View>
    );
}

function InfoRow({
    icon,
    label,
    value,
    valueColor,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
                <Ionicons name={icon} size={15} color={Colors.primary.main} />
            </View>
            <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>
                    {value}
                </Text>
            </View>
        </View>
    );
}

//  Pantalla

export default function IncidentDetailScreen() {
    const { data } = useLocalSearchParams<{ data: string }>();
    const [incident, setIncident] = useState<Incident | null>(null);

    useEffect(() => {
        if (data) {
            try {
                setIncident(JSON.parse(data) as Incident);
            } catch {
                setIncident(null);
            }
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

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <BackButton
                        theme="light"
                        label="Incidencias"
                        onPress={() => router.back()}
                    />
                    <View style={[styles.statusPill, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                        <Ionicons name={ss.icon} size={13} color={ss.color} />
                        <Text style={[styles.statusPillText, { color: ss.color }]}>{statusName}</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero — avatar + nombre + ID */}
                    <View style={styles.hero}>
                        <View style={styles.heroAvatar}>
                            <Text style={styles.heroInitials}>{initials}</Text>
                        </View>
                        <View style={styles.heroTexts}>
                            <Text style={styles.heroName}>{reportedBy}</Text>
                            <Text style={styles.heroId}>Incidencia</Text>
                        </View>
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
                            <Ionicons name="image-outline" size={28} color={Colors.screen.textMuted} />
                            <Text style={styles.noImageText}>Sin imagen adjunta</Text>
                        </View>
                    )}

                    {/* Descripción */}
                    <View style={styles.card}>
                        <SectionTitle label="Descripción" />
                        <Text style={styles.descriptionText}>{incident.description}</Text>
                    </View>

                    {/* Clasificación */}
                    <View style={styles.card}>
                        <SectionTitle label="Clasificación" />
                        <InfoRow
                            icon="grid-outline"
                            label="Área"
                            value={incident.areas?.name ?? "—"}
                        />
                        <View style={styles.rowDivider} />
                        <InfoRow
                            icon="alert-circle-outline"
                            label="Tipo de incidencia"
                            value={incident.inc_types?.name ?? "—"}
                        />
                        <View style={styles.rowDivider} />
                        <InfoRow
                            icon="cash-outline"
                            label="Costo estimado"
                            value={incident.cost != null ? `$${incident.cost.toLocaleString("es-MX")}` : "Sin asignar"}
                        />
                    </View>

                    {/* Fechas */}
                    <View style={styles.card}>
                        <SectionTitle label="Fechas" />
                        <InfoRow
                            icon="calendar-outline"
                            label="Reportada"
                            value={formatFull(incident.created_at)}
                        />
                        {incident.edited_at && (
                            <>
                                <View style={styles.rowDivider} />
                                <InfoRow
                                    icon="create-outline"
                                    label="Última edición"
                                    value={formatFull(incident.edited_at)}
                                />
                            </>
                        )}
                        {incident.completed_at && (
                            <>
                                <View style={styles.rowDivider} />
                                <InfoRow
                                    icon="checkmark-done-outline"
                                    label="Completada"
                                    value={formatFull(incident.completed_at)}
                                    valueColor="#059669"
                                />
                            </>
                        )}
                        {incident.closed_at && (
                            <>
                                <View style={styles.rowDivider} />
                                <InfoRow
                                    icon="lock-closed-outline"
                                    label="Cerrada"
                                    value={formatFull(incident.closed_at)}
                                    valueColor="#6B7280"
                                />
                            </>
                        )}
                    </View>

                    {/* Notas del administrador */}
                    <View style={styles.card}>
                        <SectionTitle label="Notas del administrador" />
                        {incident.notes ? (
                            <Text style={styles.notesText}>{incident.notes}</Text>
                        ) : (
                            <View style={styles.emptyNotes}>
                                <Ionicons name="document-text-outline" size={20} color={Colors.screen.textMuted} />
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

    // Header
    header: {
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
        borderWidth: 1,
    },
    statusPillText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
    },

    scroll: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
        gap: 12,
    },

    // Hero
    hero: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: Colors.screen.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        padding: 16,
    },
    heroAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#4D7C0F",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    heroInitials: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
    heroTexts: { flex: 1, gap: 3 },
    heroName: {
        fontFamily: "Outfit_700Bold",
        fontSize: 16,
        color: Colors.screen.textPrimary,
    },
    heroId: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: Colors.screen.textMuted,
    },

    // Imagen
    image: {
        width: "100%",
        height: 220,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.screen.border,
    },
    noImage: {
        height: 80,
        borderRadius: 14,
        borderWidth: 1,
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
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 6,
        gap: 0,
    },

    // Section title
    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
    },
    sectionTitleText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 11,
        color: Colors.screen.textMuted,
        letterSpacing: 1.4,
        textTransform: "uppercase",
    },
    sectionTitleLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.screen.border,
    },

    // Info row
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 10,
    },
    infoIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: Colors.primary.soft,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
    },
    infoTexts: { flex: 1, gap: 2 },
    infoLabel: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
        letterSpacing: 0.3,
    },
    infoValue: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: Colors.screen.textPrimary,
    },
    rowDivider: {
        height: 1,
        backgroundColor: Colors.screen.border,
        marginLeft: 42,
    },

    // Descripción
    descriptionText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: Colors.screen.textSecondary,
        lineHeight: 22,
        paddingBottom: 10,
    },

    // Notas
    notesText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: Colors.screen.textSecondary,
        lineHeight: 22,
        paddingBottom: 10,
    },
    emptyNotes: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 14,
        paddingBottom: 16,
    },
    emptyNotesText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: Colors.screen.textMuted,
    },
});