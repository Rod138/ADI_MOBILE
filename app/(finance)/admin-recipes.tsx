import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { MONTH_ORDER, useRecipes, type Recipe } from "@/hooks/useRecipes";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    Linking,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Tipos locales ────────────────────────────────────────────────────────────

type FilterStatus = "all" | "pending" | "approved" | "rejected";

interface Stats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalAmount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatCurrency(n: number) {
    return `$${Number(n).toLocaleString("es-MX", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

function getStatusConfig(validated: boolean | null) {
    if (validated === true)
        return {
            label: "Aprobado",
            color: Colors.status.success,
            bg: Colors.status.successBg,
            border: Colors.status.successBorder,
            icon: "checkmark-circle" as const,
        };
    if (validated === false)
        return {
            label: "Rechazado",
            color: Colors.status.error,
            bg: Colors.status.errorBg,
            border: Colors.status.errorBorder,
            icon: "close-circle" as const,
        };
    return {
        label: "Pendiente",
        color: Colors.status.warning,
        bg: Colors.status.warningBg,
        border: Colors.status.warningBorder,
        icon: "time" as const,
    };
}

// ─── Image Viewer ─────────────────────────────────────────────────────────────

function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }, []);
    return (
        <Modal visible animationType="none" transparent onRequestClose={onClose}>
            <Animated.View style={[viewer.overlay, { opacity: fade }]}>
                <TouchableOpacity style={viewer.closeBtn} onPress={onClose} activeOpacity={0.8}>
                    <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
                <Image source={{ uri }} style={viewer.img} resizeMode="contain" />
            </Animated.View>
        </Modal>
    );
}

// ─── Stats Banner ─────────────────────────────────────────────────────────────

function StatsBanner({ stats }: { stats: Stats }) {
    const items = [
        { label: "Total", value: stats.total, icon: "receipt-outline" as const, color: Colors.screen.textSecondary },
        { label: "Pendientes", value: stats.pending, icon: "time-outline" as const, color: Colors.status.warning },
        { label: "Aprobados", value: stats.approved, icon: "checkmark-circle-outline" as const, color: Colors.status.success },
    ];
    return (
        <View style={banner.root}>
            <View style={banner.amountRow}>
                <Ionicons name="wallet-outline" size={15} color={Colors.primary.main} />
                <Text style={banner.amountLabel}>Monto total aprobado</Text>
                <Text style={banner.amountValue}>{formatCurrency(stats.totalAmount)}</Text>
            </View>
            <View style={banner.divider} />
            <View style={banner.statsRow}>
                {items.map((item, i) => (
                    <View key={i} style={banner.statItem}>
                        <View style={[banner.statIcon, { backgroundColor: item.color + "18" }]}>
                            <Ionicons name={item.icon} size={14} color={item.color} />
                        </View>
                        <Text style={[banner.statValue, { color: item.color }]}>{item.value}</Text>
                        <Text style={banner.statLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "all", label: "Todos", icon: "apps" },
    { key: "pending", label: "Pendientes", icon: "time" },
    { key: "approved", label: "Aprobados", icon: "checkmark-circle" },
    // { key: "rejected", label: "Rechazados", icon: "close-circle" },
];

function FilterTabs({
    active,
    onChange,
    counts,
}: {
    active: FilterStatus;
    onChange: (f: FilterStatus) => void;
    counts: Record<FilterStatus, number>;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tabs.row}
        >
            {FILTER_TABS.map((tab) => {
                const isActive = active === tab.key;
                const sc = tab.key === "pending"
                    ? Colors.status.warning
                    : tab.key === "approved"
                        ? Colors.status.success
                        : tab.key === "rejected"
                            ? Colors.status.error
                            : Colors.primary.main;

                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            tabs.tab,
                            isActive && { borderColor: sc, backgroundColor: sc + "18" },
                        ]}
                        onPress={() => onChange(tab.key)}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name={tab.icon}
                            size={12}
                            color={isActive ? sc : Colors.screen.textMuted}
                        />
                        <Text style={[tabs.label, isActive && { color: sc, fontFamily: "Outfit_700Bold" }]}>
                            {tab.label}
                        </Text>
                        {counts[tab.key] > 0 && (
                            <View style={[tabs.badge, { backgroundColor: isActive ? sc : Colors.screen.border }]}>
                                <Text style={[tabs.badgeText, { color: isActive ? "#fff" : Colors.screen.textMuted }]}>
                                    {counts[tab.key]}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

// ─── Receipt Card (admin view) ────────────────────────────────────────────────

function AdminReceiptCard({
    item,
    onValidate,
    onViewImage,
}: {
    item: Recipe;
    onValidate: (id: number, validated: boolean) => void;
    onViewImage: (url: string) => void;
}) {
    const sc = getStatusConfig(item.validated ?? null);
    const isPdf = item.img?.toLowerCase().includes(".pdf") || item.img?.includes("/raw/");

    // Extract user name from joined data
    const userName = item.users
        ? `${item.users.name} ${item.users.ap}`.trim()
        : "—";
    const initials = userName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const isPending = item.validated === null || item.validated === undefined;

    const handleApprove = () => {
        Alert.alert(
            "Aprobar comprobante",
            `¿Confirmar aprobación de la cuota de ${item.month} ${item.year} de ${userName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Aprobar",
                    onPress: () => onValidate(item.id, true),
                },
            ]
        );
    };

    const handleReject = () => {
        Alert.alert(
            "Rechazar comprobante",
            `¿Confirmar rechazo del comprobante de ${item.month} ${item.year} de ${userName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Rechazar",
                    style: "destructive",
                    onPress: () => onValidate(item.id, false),
                },
            ]
        );
    };

    return (
        <View style={rcard.root}>
            {/* Accent bar */}
            <View style={[rcard.accentBar, { backgroundColor: sc.color }]} />

            <View style={rcard.inner}>
                {/* Header — resident info + period + status */}
                <View style={rcard.headerRow}>
                    <View style={[rcard.avatar, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                        <Text style={[rcard.avatarText, { color: sc.color }]}>{initials}</Text>
                    </View>

                    <View style={rcard.headerInfo}>
                        <Text style={rcard.residentName} numberOfLines={1}>{userName}</Text>
                        <View style={rcard.metaRow}>
                            <Ionicons name="calendar-outline" size={11} color={Colors.screen.textMuted} />
                            <Text style={rcard.metaText}>{item.month} {item.year}</Text>
                            {item.amount != null && (
                                <>
                                    <View style={rcard.dot} />
                                    <Ionicons name="cash-outline" size={11} color={Colors.screen.textMuted} />
                                    <Text style={rcard.metaText}>{formatCurrency(Number(item.amount))}</Text>
                                </>
                            )}
                        </View>
                    </View>

                    <View style={[rcard.statusPill, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                        <Ionicons name={sc.icon} size={11} color={sc.color} />
                        <Text style={[rcard.statusText, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                </View>

                {/* Attachment */}
                {item.img ? (
                    isPdf ? (
                        <TouchableOpacity
                            style={rcard.pdfRow}
                            activeOpacity={0.85}
                            onPress={() => Linking.openURL(item.img!)}
                        >
                            <View style={rcard.pdfIcon}>
                                <Ionicons name="document-text" size={22} color={Colors.status.error} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={rcard.pdfLabel}>Comprobante PDF</Text>
                                <Text style={rcard.pdfHint}>Toca para abrir</Text>
                            </View>
                            <Ionicons name="open-outline" size={16} color={Colors.screen.textMuted} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity activeOpacity={0.85} onPress={() => onViewImage(item.img!)}>
                            <Image source={{ uri: item.img }} style={rcard.img} resizeMode="cover" />
                            <View style={rcard.imgOverlay}>
                                <Ionicons name="expand-outline" size={14} color="#fff" />
                                <Text style={rcard.imgOverlayText}>Ver comprobante</Text>
                            </View>
                        </TouchableOpacity>
                    )
                ) : (
                    <View style={rcard.noImg}>
                        <Ionicons name="image-outline" size={16} color={Colors.screen.textMuted} />
                        <Text style={rcard.noImgText}>Sin comprobante adjunto</Text>
                    </View>
                )}

                {/* Action buttons — only for pending */}
                {isPending && (
                    <View style={rcard.actions}>
                        <TouchableOpacity
                            style={[rcard.actionBtn, rcard.rejectBtn]}
                            onPress={handleReject}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={14} color={Colors.status.error} />
                            <Text style={[rcard.actionBtnText, { color: Colors.status.error }]}>
                                Rechazar
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[rcard.actionBtn, rcard.approveBtn]}
                            onPress={handleApprove}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark" size={14} color={Colors.status.success} />
                            <Text style={[rcard.actionBtnText, { color: Colors.status.success }]}>
                                Aprobar
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}


            </View>
        </View>
    );
}

// ─── Group Header ─────────────────────────────────────────────────────────────

function GroupHeader({ title, count }: { title: string; count: number }) {
    return (
        <View style={gh.root}>
            <Text style={gh.title}>{title}</Text>
            <View style={gh.line} />
            <View style={gh.countBadge}>
                <Text style={gh.countText}>{count}</Text>
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminRecipesScreen() {
    const { user } = useSession();
    const { recipes, isLoading, error, fetchAllRecipes, validateRecipe } = useRecipes();

    const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [validatingId, setValidatingId] = useState<number | null>(null);

    // Years available
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1];

    useEffect(() => {
        fetchAllRecipes(selectedYear);
    }, [selectedYear]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = useMemo<Stats>(() => {
        const pending = recipes.filter((r) => r.validated === null || r.validated === undefined).length;
        const approved = recipes.filter((r) => r.validated === true).length;
        const rejected = recipes.filter((r) => r.validated === false).length;
        const totalAmount = recipes
            .filter((r) => r.validated === true)
            .reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
        // total excludes rejected
        return { total: pending + approved, pending, approved, rejected, totalAmount };
    }, [recipes]);

    const filterCounts: Record<FilterStatus, number> = {
        all: stats.total,
        pending: stats.pending,
        approved: stats.approved,
        rejected: stats.rejected,
    };

    // ── Filtered & grouped ────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let r = [...recipes];
        // Always hide rejected from view
        r = r.filter((x) => x.validated !== false);
        if (activeFilter === "pending") r = r.filter((x) => x.validated === null || x.validated === undefined);
        else if (activeFilter === "approved") r = r.filter((x) => x.validated === true);
        // "rejected" filter kept in logic but hidden from UI

        // Sort by month desc
        return r.sort((a, b) => (MONTH_ORDER[b.month] ?? 0) - (MONTH_ORDER[a.month] ?? 0));
    }, [recipes, activeFilter]);

    // Group by month
    type GroupItem =
        | { type: "header"; key: string; title: string; count: number }
        | { type: "card"; key: string; recipe: Recipe };

    const listItems = useMemo<GroupItem[]>(() => {
        const groups: Record<string, Recipe[]> = {};
        for (const r of filtered) {
            const k = `${r.month} ${r.year}`;
            if (!groups[k]) groups[k] = [];
            groups[k].push(r);
        }
        const result: GroupItem[] = [];
        for (const [title, items] of Object.entries(groups)) {
            result.push({ type: "header", key: `hdr-${title}`, title, count: items.length });
            for (const item of items) {
                result.push({ type: "card", key: `card-${item.id}`, recipe: item });
            }
        }
        return result;
    }, [filtered]);

    // ── Validate ──────────────────────────────────────────────────────────────
    const handleValidate = async (id: number, validated: boolean | null) => {
        setValidatingId(id);
        // The hook's validateRecipe only accepts boolean — handle null reset separately
        if (validated === null) {
            // Reset to pending via direct supabase update through the hook workaround
            // validateRecipe(id, null as any) works since supabase just passes the value
            await (useRecipes as any);
            // Workaround: call the hook's internal update
            // Since hook doesn't expose resetRecipe, we re-fetch after a direct call
            const { default: supabase } = await import("@/lib/supabase");
            await supabase.from("recipes").update({ validated: null }).eq("id", id);
            fetchAllRecipes(selectedYear);
        } else {
            await validateRecipe(id, validated);
        }
        setValidatingId(null);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.push("/(finance)" as any)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={18} color={Colors.screen.textSecondary} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Cuotas de residentes</Text>
                            <Text style={styles.headerSubtitle}>Validación de comprobantes</Text>
                        </View>
                    </View>

                </View>

                {/* ── Filter Tabs ────────────────────────────────────────── */}
                <View style={styles.tabsWrapper}>
                    <FilterTabs
                        active={activeFilter}
                        onChange={setActiveFilter}
                        counts={filterCounts}
                    />
                </View>

                {/* ── Content ────────────────────────────────────────────── */}
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.stateText}>Cargando comprobantes...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <View style={styles.stateIcon}>
                            <Ionicons name="cloud-offline-outline" size={28} color={Colors.screen.textMuted} />
                        </View>
                        <Text style={styles.stateTitle}>Sin conexión</Text>
                        <Text style={styles.stateText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => fetchAllRecipes(selectedYear)}
                        >
                            <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
                            <Text style={styles.retryText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={listItems}
                        keyExtractor={(item) => item.key}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            recipes.length > 0 ? <StatsBanner stats={stats} /> : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyCard}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons name="receipt-outline" size={32} color={Colors.screen.textMuted} />
                                </View>
                                <Text style={styles.emptyTitle}>Sin comprobantes</Text>
                                <Text style={styles.stateText}>
                                    {activeFilter === "all"
                                        ? `No hay comprobantes registrados para ${selectedYear}.`
                                        : `No hay comprobantes con este filtro.`}
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            if (item.type === "header") {
                                return (
                                    <GroupHeader title={item.title} count={item.count} />
                                );
                            }
                            const r = item.recipe;
                            return (
                                <View style={{ opacity: validatingId === r.id ? 0.55 : 1 }}>
                                    {validatingId === r.id && (
                                        <View style={styles.validatingOverlay}>
                                            <ActivityIndicator size="small" color={Colors.primary.main} />
                                        </View>
                                    )}
                                    <AdminReceiptCard
                                        item={r}
                                        onValidate={handleValidate}
                                        onViewImage={setViewingImage}
                                    />
                                </View>
                            );
                        }}
                        onRefresh={() => fetchAllRecipes(selectedYear)}
                        refreshing={isLoading}
                    />
                )}
            </SafeAreaView>

            {/* Image viewer */}
            {viewingImage && (
                <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.screen.border,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary },
    headerSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },

    // Year selector
    yearSelector: { flexDirection: "row", gap: 4 },
    yearBtn: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
    },
    yearBtnActive: {
        backgroundColor: Colors.primary.main, borderColor: Colors.primary.main,
    },
    yearBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.screen.textSecondary },
    yearBtnTextActive: { color: "#fff" },

    // Tabs
    tabsWrapper: {
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.screen.border,
    },

    // List
    list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 0 },

    // States
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24 },
    stateIcon: {
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    stateTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.screen.textSecondary },
    stateText: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20,
    },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4,
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },

    // Empty
    emptyCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border,
        padding: 32, alignItems: "center", gap: 10, marginTop: 16,
    },
    emptyIcon: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center",
    },
    emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.screen.textSecondary },

    // Validating overlay
    validatingOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 10, alignItems: "center", justifyContent: "center",
    },
});

// Stats Banner
const banner = StyleSheet.create({
    root: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border,
        marginBottom: 16, overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        borderTopWidth: 3, borderTopColor: Colors.primary.main,
    },
    amountRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    },
    amountLabel: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.screen.textSecondary, flex: 1 },
    amountValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 18, color: Colors.primary.dark },
    divider: { height: 1, backgroundColor: Colors.screen.border, marginHorizontal: 16 },
    statsRow: {
        flexDirection: "row", paddingHorizontal: 16,
        paddingVertical: 12, gap: 0,
    },
    statItem: { flex: 1, alignItems: "center", gap: 4 },
    statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    statValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 18 },
    statLabel: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted },
});

// Filter Tabs
const tabs = StyleSheet.create({
    row: { paddingHorizontal: 16, paddingVertical: 10, gap: 6, alignItems: "center" },
    tab: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: Colors.screen.border, backgroundColor: Colors.screen.bg,
    },
    label: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textMuted },
    badge: {
        minWidth: 18, height: 18, borderRadius: 9,
        alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
    },
    badgeText: { fontFamily: "Outfit_700Bold", fontSize: 9 },
});

// Group Header
const gh = StyleSheet.create({
    root: {
        flexDirection: "row", alignItems: "center", gap: 10,
        marginTop: 16, marginBottom: 8,
    },
    title: {
        fontFamily: "Outfit_700Bold", fontSize: 11,
        color: Colors.screen.textMuted, letterSpacing: 1.6,
        textTransform: "uppercase",
    },
    line: { flex: 1, height: 1, backgroundColor: Colors.screen.border },
    countBadge: {
        backgroundColor: Colors.neutral[100], borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 2,
        borderWidth: 1, borderColor: Colors.screen.border,
    },
    countText: { fontFamily: "Outfit_700Bold", fontSize: 10, color: Colors.screen.textMuted },
});

// Receipt Card (admin)
const rcard = StyleSheet.create({
    root: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border,
        overflow: "hidden", marginBottom: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    accentBar: { height: 3, width: "100%" },
    inner: { padding: 14, gap: 12 },

    // Header
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: {
        width: 40, height: 40, borderRadius: 12, borderWidth: 1.5,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarText: { fontFamily: "Outfit_700Bold", fontSize: 13, letterSpacing: 0.5 },
    headerInfo: { flex: 1, gap: 3 },
    residentName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textPrimary },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    metaText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.screen.border },
    statusPill: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 20, borderWidth: 1, flexShrink: 0,
    },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },

    // Attachment
    img: { width: "100%", height: 160, borderRadius: 10 },
    imgOverlay: {
        position: "absolute", bottom: 0, left: 0, right: 0,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 8,
        backgroundColor: "rgba(0,0,0,0.38)",
        borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    },
    imgOverlayText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#fff" },
    pdfRow: {
        flexDirection: "row", alignItems: "center", gap: 12,
        padding: 12, borderRadius: 10,
        backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    },
    pdfIcon: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: "#fff", borderWidth: 1, borderColor: "#FECACA",
        alignItems: "center", justifyContent: "center",
    },
    pdfLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    pdfHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    noImg: {
        height: 48, borderRadius: 10, borderWidth: 1.5,
        borderColor: Colors.screen.border, borderStyle: "dashed",
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    noImgText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted },

    // Actions
    actions: { flexDirection: "row", gap: 8 },
    actionBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    },
    approveBtn: { backgroundColor: Colors.status.successBg, borderColor: Colors.status.successBorder },
    rejectBtn: { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder },
    actionBtnText: { fontFamily: "Outfit_700Bold", fontSize: 13 },

    // Undo
    undoBtn: {
        flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-end",
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 8, borderWidth: 1, borderColor: Colors.screen.border,
    },
    undoBtnText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
});

// Image Viewer
const viewer = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
        alignItems: "center", justifyContent: "center",
    },
    closeBtn: {
        position: "absolute", top: 52, right: 20, zIndex: 10,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center", justifyContent: "center",
    },
    img: { width: "92%", height: "75%" },
});