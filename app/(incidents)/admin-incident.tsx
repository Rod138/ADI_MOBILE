import PrimaryButton from "@/components/PrimaryButton";
import { BackButton, SectionCard } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useIncidents, type Incident } from "@/hooks/useIncidents";
import { notifyIncidentStatusChange } from "@/hooks/useNotificationSender";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface StatusOption {
    id: number;
    name: string;
    color: string;
    bg: string;
    border: string;
    icon: keyof typeof Ionicons.glyphMap;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFull(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return (
        d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) +
        " · " +
        d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true })
    );
}

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string; icon: keyof typeof Ionicons.glyphMap }> = {
    pendiente: {
        color: Colors.status.warning,
        bg: Colors.status.warningBg,
        border: Colors.status.warningBorder,
        icon: "time-outline",
    },
    resuelto: {
        color: Colors.status.success,
        bg: Colors.status.successBg,
        border: Colors.status.successBorder,
        icon: "checkmark-circle-outline",
    },
    cerrado: {
        color: Colors.screen.textMuted,
        bg: Colors.neutral[100],
        border: Colors.screen.border,
        icon: "lock-closed-outline",
    },
};

function getStatusKey(name: string) {
    const n = name.toLowerCase();
    if (n.includes("resuel") || n.includes("complet")) return "resuelto";
    if (n.includes("cerr")) return "cerrado";
    return "pendiente";
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
    return (
        <View style={ui.sectionHeader}>
            <View style={ui.sectionIconWrap}>
                <Ionicons name={icon} size={14} color={Colors.primary.main} />
            </View>
            <Text style={ui.sectionLabel}>{label}</Text>
        </View>
    );
}

function InfoChip({ icon, text, color = Colors.screen.textSecondary }: {
    icon: keyof typeof Ionicons.glyphMap;
    text: string;
    color?: string;
}) {
    return (
        <View style={ui.chip}>
            <Ionicons name={icon} size={12} color={color} />
            <Text style={[ui.chipText, { color }]}>{text}</Text>
        </View>
    );
}

// ── StatusSelector ─────────────────────────────────────────────────────────────

function StatusSelector({
    statuses,
    selectedId,
    onSelect,
}: {
    statuses: StatusOption[];
    selectedId: number | undefined;
    onSelect: (id: number, name: string) => void;
}) {
    return (
        <View style={ss.grid}>
            {statuses.map((s) => {
                const isActive = selectedId === s.id;
                return (
                    <TouchableOpacity
                        key={s.id}
                        onPress={() => onSelect(s.id, s.name)}
                        activeOpacity={0.75}
                        style={[
                            ss.option,
                            { borderColor: isActive ? s.color : Colors.screen.border },
                            isActive && { backgroundColor: s.bg },
                        ]}
                    >
                        <View style={[ss.iconWrap, { backgroundColor: isActive ? s.color + "20" : Colors.neutral[100] }]}>
                            <Ionicons name={s.icon} size={18} color={isActive ? s.color : Colors.screen.textMuted} />
                        </View>
                        <Text style={[ss.optionText, { color: isActive ? s.color : Colors.screen.textSecondary }]}>
                            {s.name}
                        </Text>
                        {isActive && (
                            <View style={[ss.activeDot, { backgroundColor: s.color }]} />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ── CostInput ──────────────────────────────────────────────────────────────────

function CostInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={ci.wrapper}>
            <View style={[ci.row, focused && ci.rowFocused]}>
                <View style={ci.currencyWrap}>
                    <Text style={ci.currency}>$</Text>
                </View>
                <TextInput
                    style={ci.input}
                    value={value}
                    onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={Colors.screen.textMuted}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    maxLength={10}
                />
                <Text style={ci.mxn}>MXN</Text>
            </View>
        </View>
    );
}

// ── NotesInput ─────────────────────────────────────────────────────────────────

function NotesInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={[ni.wrapper, focused && ni.wrapperFocused]}>
            <Ionicons
                name="document-text-outline"
                size={16}
                color={focused ? Colors.primary.main : Colors.screen.iconMuted}
                style={ni.icon}
            />
            <TextInput
                style={ni.input}
                value={value}
                onChangeText={onChange}
                placeholder="Escribe las notas o resolución de la incidencia..."
                placeholderTextColor={Colors.screen.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                maxLength={800}
            />
            <Text style={ni.counter}>{value.length}/800</Text>
        </View>
    );
}

// ── ConfirmModal ───────────────────────────────────────────────────────────────

function ConfirmModal({
    visible,
    onCancel,
    onConfirm,
    isLoading,
}: {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    isLoading: boolean;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={cm.overlay}>
                <View style={cm.sheet}>
                    <View style={cm.iconWrap}>
                        <Ionicons name="shield-checkmark-outline" size={32} color={Colors.primary.main} />
                    </View>
                    <Text style={cm.title}>¿Guardar cambios?</Text>
                    <Text style={cm.body}>
                        Estás a punto de actualizar el estado, costo y notas de esta incidencia. Los
                        cambios serán visibles inmediatamente para el residente.
                    </Text>
                    <View style={cm.actions}>
                        <TouchableOpacity style={[cm.btn, cm.btnCancel]} onPress={onCancel} disabled={isLoading}>
                            <Text style={cm.btnCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[cm.btn, cm.btnConfirm]} onPress={onConfirm} disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={cm.btnConfirmText}>Guardar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ── Pantalla Principal ─────────────────────────────────────────────────────────

export default function AdminIncidentScreen() {
    const { data } = useLocalSearchParams<{ data: string }>();
    const { updateIncident, isLoading } = useIncidents();

    const [incident, setIncident] = useState<Incident | null>(null);
    const [statuses, setStatuses] = useState<StatusOption[]>([]);
    const [catalogsLoading, setCatalogsLoading] = useState(true);

    // Form state
    const [selectedStatusId, setSelectedStatusId] = useState<number | undefined>();
    const [selectedStatusName, setSelectedStatusName] = useState("");
    const [notes, setNotes] = useState("");
    const [cost, setCost] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Animations
    const successScale = useRef(new Animated.Value(0.8)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (data) {
            try {
                const inc = JSON.parse(data) as Incident;
                setIncident(inc);
                setSelectedStatusId(inc.status_id);
                setNotes(inc.notes ?? "");
                setCost(inc.cost != null ? String(inc.cost) : "0");
            } catch {
                setIncident(null);
            }
        }
        loadStatuses();
    }, [data]);

    const loadStatuses = async () => {
        setCatalogsLoading(true);
        try {
            const supabase = (await import("@/lib/supabase")).default;
            const { data: rows } = await supabase.from("inc_status").select("id, name");
            if (rows) {
                const mapped: StatusOption[] = rows.map((r: { id: number; name: string }) => {
                    const key = getStatusKey(r.name);
                    const style = STATUS_STYLES[key];
                    return { id: r.id, name: r.name, ...style };
                });
                setStatuses(mapped);
                if (incident) {
                    const match = mapped.find((s) => s.id === incident.status_id);
                    if (match) setSelectedStatusName(match.name);
                }
            }
        } finally {
            setCatalogsLoading(false);
        }
    };

    const handleStatusSelect = (id: number, name: string) => {
        setSelectedStatusId(id);
        setSelectedStatusName(name);
    };

    const hasChanges = incident
        ? selectedStatusId !== incident.status_id ||
        notes !== (incident.notes ?? "") ||
        cost !== String(incident.cost ?? 0)
        : false;

    const handleSave = async () => {
        setShowConfirm(false);
        if (!incident || !selectedStatusId) return;

        const parsedCost = parseFloat(cost) || 0;

        const now = new Date().toISOString();
        const newStatusKey = selectedStatusName.toLowerCase();
        const isResolved = newStatusKey.includes("resuel") || newStatusKey.includes("complet");
        const isClosed = newStatusKey.includes("cerr");

        // Payload plano sin spreads condicionales para que Supabase
        // reciba exactamente los campos que debe actualizar.
        const payload: Record<string, unknown> = {
            status_id: selectedStatusId,
            notes: notes.trim() || null,
            cost: parsedCost,
            edited_at: now,
        };

        if (isResolved) {
            payload.completed_at = now;
        }
        if (isClosed) {
            payload.closed_at = now;
        }


        const ok = await (async () => {
            try {
                const supabase = (await import("@/lib/supabase")).default;
                const { data, error } = await supabase
                    .from("incidents")
                    .update(payload)
                    .eq("id", incident.id)
                    .select();

                if (error) {
                    console.error("[AdminIncident] Supabase error:", error.message, error.details, error.hint);
                    return false;
                }

                return true;
            } catch (e: any) {
                console.error("[AdminIncident] Error inesperado:", e?.message);
                return false;
            }
        })();

        if (ok) {
            notifyIncidentStatusChange({
                reporterUserId: incident.usr_id,
                newStatus: selectedStatusName,
                area: incident.areas?.name,
            }).catch(() => { });

            setShowSuccess(true);
            Animated.parallel([
                Animated.spring(successScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
                Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
        } else {
            Alert.alert("Error", "No se pudieron guardar los cambios. Intenta de nuevo.");
        }
    };

    // ── Loading / Error States ──────────────────────────────────────────────

    if (!incident) {
        return (
            <View style={styles.root}>
                <SafeAreaView style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary.main} />
                </SafeAreaView>
            </View>
        );
    }

    const reportedBy = incident.users
        ? `${incident.users.name} ${incident.users.ap}`.trim()
        : "—";
    const initials = reportedBy.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const currentStatusKey = getStatusKey(incident.inc_status?.name ?? "");
    const currentStatusStyle = STATUS_STYLES[currentStatusKey];

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* Top bar */}
                <View style={styles.topBar}>
                    <BackButton theme="light" label="Incidencias" onPress={() => router.back()} />
                    <View style={styles.adminBadge}>
                        <Ionicons name="shield-outline" size={12} color={Colors.primary.dark} />
                        <Text style={styles.adminBadgeText}>Panel Admin</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Hero card — incident overview */}
                    <View style={styles.heroCard}>
                        <View style={styles.heroLeft}>
                            <View style={[styles.heroAvatar, {
                                backgroundColor: currentStatusStyle.bg,
                                borderColor: currentStatusStyle.border,
                            }]}>
                                <Text style={[styles.heroInitials, { color: currentStatusStyle.color }]}>
                                    {initials}
                                </Text>
                            </View>
                            <View style={styles.heroTexts}>
                                <Text style={styles.heroName} numberOfLines={1}>{reportedBy}</Text>
                                <Text style={styles.heroDate}>
                                    {new Date(incident.created_at).toLocaleDateString("es-MX", {
                                        day: "2-digit", month: "short", year: "numeric",
                                    })}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.currentStatusBadge, {
                            backgroundColor: currentStatusStyle.bg,
                            borderColor: currentStatusStyle.border,
                        }]}>
                            <Ionicons name={currentStatusStyle.icon} size={12} color={currentStatusStyle.color} />
                            <Text style={[styles.currentStatusText, { color: currentStatusStyle.color }]}>
                                {incident.inc_status?.name ?? "—"}
                            </Text>
                        </View>
                    </View>

                    {/* Incident info summary */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryChips}>
                            {incident.areas?.name && (
                                <InfoChip icon="location-outline" text={incident.areas.name} />
                            )}
                            {incident.inc_types?.name && (
                                <InfoChip icon="pricetag-outline" text={incident.inc_types.name} />
                            )}
                            <InfoChip
                                icon="cash-outline"
                                text={`$${incident.cost?.toLocaleString("es-MX") ?? "0"} actual`}
                                color={Colors.primary.dark}
                            />
                        </View>
                        <Text style={styles.summaryDescription} numberOfLines={3}>
                            {incident.description}
                        </Text>
                        {incident.image && (
                            <Image
                                source={{ uri: incident.image }}
                                style={styles.summaryImage}
                                resizeMode="cover"
                            />
                        )}
                    </View>

                    {/* ── SECCIÓN 1: Estado ───────────────────────────────── */}
                    <SectionCard theme="light" padding={16} paddingTop={16}>
                        <SectionHeader icon="swap-horizontal-outline" label="Cambiar estado" />
                        <Text style={styles.sectionHint}>
                            Selecciona el nuevo estado para esta incidencia.
                        </Text>
                        {catalogsLoading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={Colors.screen.textMuted} />
                                <Text style={styles.loadingText}>Cargando estados...</Text>
                            </View>
                        ) : (
                            <StatusSelector
                                statuses={statuses}
                                selectedId={selectedStatusId}
                                onSelect={handleStatusSelect}
                            />
                        )}

                        {/* Status change warning */}
                        {selectedStatusId !== incident.status_id && (
                            <View style={styles.changeWarning}>
                                <Ionicons name="information-circle-outline" size={14} color={Colors.status.info} />
                                <Text style={styles.changeWarningText}>
                                    El estado cambiará de{" "}
                                    <Text style={{ fontFamily: "Outfit_700Bold" }}>
                                        {incident.inc_status?.name}
                                    </Text>{" "}
                                    a{" "}
                                    <Text style={{ fontFamily: "Outfit_700Bold" }}>
                                        {selectedStatusName}
                                    </Text>
                                </Text>
                            </View>
                        )}
                    </SectionCard>

                    {/* ── SECCIÓN 2: Costo ────────────────────────────────── */}
                    <SectionCard theme="light" padding={16} paddingTop={16}>
                        <SectionHeader icon="cash-outline" label="Costo estimado" />
                        <Text style={styles.sectionHint}>
                            Ingresa el costo total de la reparación o solución.
                        </Text>
                        <CostInput value={cost} onChange={setCost} />
                    </SectionCard>

                    {/* ── SECCIÓN 3: Notas ────────────────────────────────── */}
                    <SectionCard theme="light" padding={16} paddingTop={16}>
                        <SectionHeader icon="document-text-outline" label="Notas del administrador" />
                        <Text style={styles.sectionHint}>
                            Describe la resolución, pasos tomados o cualquier observación relevante.
                        </Text>
                        <NotesInput value={notes} onChange={setNotes} />
                    </SectionCard>

                    {/* ── Timeline ────────────────────────────────────────── */}
                    <View style={styles.timelineCard}>
                        <SectionHeader icon="time-outline" label="Línea de tiempo" />
                        <View style={styles.timelineRows}>
                            <TimelineRow
                                icon="calendar-outline"
                                label="Reportada"
                                value={formatFull(incident.created_at)}
                                isLast={!incident.edited_at && !incident.completed_at && !incident.closed_at}
                            />
                            {incident.edited_at && (
                                <TimelineRow
                                    icon="create-outline"
                                    label="Última edición"
                                    value={formatFull(incident.edited_at)}
                                    isLast={!incident.completed_at && !incident.closed_at}
                                />
                            )}
                            {incident.completed_at && (
                                <TimelineRow
                                    icon="checkmark-done-outline"
                                    label="Completada"
                                    value={formatFull(incident.completed_at)}
                                    color={Colors.status.success}
                                    isLast={!incident.closed_at}
                                />
                            )}
                            {incident.closed_at && (
                                <TimelineRow
                                    icon="lock-closed-outline"
                                    label="Cerrada"
                                    value={formatFull(incident.closed_at)}
                                    color={Colors.screen.textMuted}
                                    isLast
                                />
                            )}
                        </View>
                    </View>

                    {/* ── Botón guardar ─────────────────────────────────── */}
                    <PrimaryButton
                        label="Guardar cambios"
                        onPress={() => setShowConfirm(true)}
                        isLoading={isLoading}
                        disabled={isLoading || !hasChanges}
                    />

                    {!hasChanges && (
                        <Text style={styles.noChangesHint}>No hay cambios pendientes por guardar</Text>
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* ── Modal de confirmación ───────────────────────────────────── */}
            <ConfirmModal
                visible={showConfirm}
                onCancel={() => setShowConfirm(false)}
                onConfirm={handleSave}
                isLoading={isLoading}
            />

            {/* ── Modal de éxito ──────────────────────────────────────────── */}
            <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => setShowSuccess(false)}>
                <View style={cm.overlay}>
                    <Animated.View style={[cm.sheet, { transform: [{ scale: successScale }], opacity: successOpacity }]}>
                        <View style={[cm.iconWrap, { backgroundColor: Colors.status.successBg, borderColor: Colors.status.successBorder }]}>
                            <Ionicons name="checkmark-circle" size={36} color={Colors.status.success} />
                        </View>
                        <Text style={cm.title}>¡Cambios guardados!</Text>
                        <Text style={cm.body}>
                            La incidencia fue actualizada correctamente. El residente recibirá una notificación.
                        </Text>
                        <View style={cm.successStats}>
                            <View style={cm.stat}>
                                <Ionicons name="swap-horizontal-outline" size={14} color={Colors.primary.main} />
                                <Text style={cm.statText}>{selectedStatusName || "—"}</Text>
                            </View>
                            <View style={cm.statDivider} />
                            <View style={cm.stat}>
                                <Ionicons name="cash-outline" size={14} color={Colors.primary.main} />
                                <Text style={cm.statText}>${parseFloat(cost || "0").toLocaleString("es-MX")}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[cm.btn, cm.btnConfirm, { width: "100%" }]}
                            onPress={() => { setShowSuccess(false); router.back(); }}
                        >
                            <Text style={cm.btnConfirmText}>Volver a incidencias</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

// ── TimelineRow ────────────────────────────────────────────────────────────────

function TimelineRow({
    icon, label, value, color = Colors.screen.textMuted, isLast = false,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    color?: string;
    isLast?: boolean;
}) {
    return (
        <View style={tl.row}>
            <View style={tl.iconCol}>
                <View style={tl.iconCircle}>
                    <Ionicons name={icon} size={12} color={Colors.primary.main} />
                </View>
                {!isLast && <View style={tl.line} />}
            </View>
            <View style={tl.content}>
                <Text style={tl.label}>{label}</Text>
                <Text style={[tl.value, { color }]}>{value}</Text>
            </View>
        </View>
    );
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },

    topBar: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    adminBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    adminBadgeText: {
        fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.primary.dark, letterSpacing: 0.5,
    },

    scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 12 },

    // Hero
    heroCard: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 14,
    },
    heroLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    heroAvatar: {
        width: 44, height: 44, borderRadius: 13,
        borderWidth: 1.5, alignItems: "center", justifyContent: "center",
    },
    heroInitials: { fontFamily: "Outfit_700Bold", fontSize: 15, letterSpacing: 1 },
    heroTexts: { flex: 1 },
    heroName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textPrimary },
    heroDate: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    currentStatusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5,
    },
    currentStatusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },

    // Summary
    summaryCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 14, gap: 10,
    },
    summaryChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    summaryDescription: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: Colors.screen.textSecondary, lineHeight: 20,
    },
    summaryImage: { width: "100%", height: 140, borderRadius: 10 },

    sectionHint: {
        fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.screen.textMuted, lineHeight: 17, marginBottom: 14,
    },

    changeWarning: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: Colors.status.infoBg, borderRadius: 10, borderWidth: 1,
        borderColor: Colors.status.infoBorder, padding: 10, marginTop: 10,
    },
    changeWarningText: {
        fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.status.info, flex: 1, lineHeight: 17,
    },

    loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 },
    loadingText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted },

    // Timeline card
    timelineCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 16,
    },
    timelineRows: { marginTop: 4 },

    noChangesHint: {
        fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.screen.textMuted, textAlign: "center", marginTop: -4,
    },
});

// StatusSelector styles
const ss = StyleSheet.create({
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: {
        flex: 1, minWidth: "30%", flexDirection: "column", alignItems: "center",
        gap: 8, paddingVertical: 14, paddingHorizontal: 10,
        borderRadius: 14, borderWidth: 1.5,
        backgroundColor: Colors.screen.bg, position: "relative",
    },
    iconWrap: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    optionText: {
        fontFamily: "Outfit_600SemiBold", fontSize: 12,
        textAlign: "center", letterSpacing: 0.2,
    },
    activeDot: {
        position: "absolute", top: 8, right: 8,
        width: 7, height: 7, borderRadius: 4,
    },
});

// CostInput styles
const ci = StyleSheet.create({
    wrapper: { gap: 12 },
    row: {
        flexDirection: "row", alignItems: "center",
        borderRadius: 12, borderWidth: 1.5, borderColor: Colors.screen.border,
        backgroundColor: Colors.screen.card, overflow: "hidden",
    },
    rowFocused: { borderColor: Colors.primary.light, backgroundColor: "#F7FEE7" },
    currencyWrap: {
        paddingHorizontal: 14, paddingVertical: 14,
        backgroundColor: Colors.screen.bg, borderRightWidth: 1, borderRightColor: Colors.screen.border,
    },
    currency: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.screen.textSecondary },
    input: {
        flex: 1, paddingHorizontal: 14, paddingVertical: 14,
        fontFamily: "Outfit_600SemiBold", fontSize: 20, color: Colors.screen.textPrimary,
    },
    mxn: {
        paddingRight: 14,
        fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textMuted,
    },
});

// NotesInput styles
const ni = StyleSheet.create({
    wrapper: {
        borderRadius: 12, borderWidth: 1.5, borderColor: Colors.screen.border,
        backgroundColor: Colors.screen.card, padding: 12, minHeight: 130,
    },
    wrapperFocused: { borderColor: Colors.primary.light, backgroundColor: "#F7FEE7" },
    icon: { marginBottom: 6 },
    input: {
        flex: 1, fontFamily: "Outfit_400Regular", fontSize: 14,
        color: Colors.screen.textPrimary, minHeight: 90, textAlignVertical: "top",
        lineHeight: 22,
    },
    counter: {
        fontFamily: "Outfit_400Regular", fontSize: 10,
        color: Colors.screen.textMuted, textAlign: "right", marginTop: 4,
    },
});

// SectionHeader styles
const ui = StyleSheet.create({
    sectionHeader: {
        flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6,
    },
    sectionIconWrap: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center",
    },
    sectionLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 13, color: Colors.screen.textPrimary,
    },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: Colors.neutral[100], borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 5,
        borderWidth: 1, borderColor: Colors.screen.border,
    },
    chipText: {
        fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.screen.textSecondary,
    },
});

// ConfirmModal styles
const cm = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center", alignItems: "center", paddingHorizontal: 24,
    },
    sheet: {
        width: "100%", backgroundColor: Colors.screen.card, borderRadius: 24,
        padding: 28, alignItems: "center",
        borderWidth: 1, borderColor: Colors.screen.border, gap: 14,
        shadowColor: "#1E2D4A", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14, shadowRadius: 24, elevation: 14,
    },
    iconWrap: {
        width: 72, height: 72, borderRadius: 36, borderWidth: 1.5,
        backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center",
    },
    title: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.screen.textPrimary, textAlign: "center" },
    body: {
        fontFamily: "Outfit_400Regular", fontSize: 14,
        color: Colors.screen.textSecondary, textAlign: "center", lineHeight: 22,
    },
    successStats: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.screen.bg, borderRadius: 12, borderWidth: 1,
        borderColor: Colors.screen.border, overflow: "hidden", width: "100%",
    },
    stat: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12 },
    statDivider: { width: 1, height: "100%", backgroundColor: Colors.screen.border },
    statText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    actions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 4 },
    btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
    btnCancel: { backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border },
    btnConfirm: { backgroundColor: Colors.primary.main },
    btnCancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    btnConfirmText: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.white },
});

// Timeline styles
const tl = StyleSheet.create({
    row: { flexDirection: "row", gap: 12, minHeight: 52 },
    iconCol: { alignItems: "center", width: 28 },
    iconCircle: {
        width: 28, height: 28, borderRadius: 9,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center",
    },
    line: { flex: 1, width: 1, backgroundColor: Colors.screen.border, marginTop: 4 },
    content: { flex: 1, paddingBottom: 16 },
    label: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    value: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.screen.textPrimary, marginTop: 2 },
});