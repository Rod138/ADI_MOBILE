import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useCatalogs, useIncidents, type Incident } from "@/hooks/useIncidents";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.72;

function formatDateTime(iso: string) {
    const d = new Date(iso);
    const date = d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
    return { date, time };
}

// Colores por status (por nombre normalizado)
function getStatusStyle(name: string): { color: string; bg: string; border: string; icon: any } {
    const n = name?.toLowerCase() ?? "";
    if (n.includes("resuel") || n.includes("complet")) {
        return { color: "#34D399", bg: "rgba(5,150,105,0.15)", border: "rgba(52,211,153,0.35)", icon: "checkmark-circle-outline" };
    }
    if (n.includes("pend")) {
        return { color: "#FBBF24", bg: "rgba(217,119,6,0.15)", border: "rgba(251,191,36,0.35)", icon: "time-outline" };
    }
    if (n.includes("cerr")) {
        return { color: "#94A3B8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.30)", icon: "lock-closed-outline" };
    }
    return { color: Colors.primary.light, bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.35)", icon: "ellipse-outline" };
}

function IncidentCard({ item }: { item: Incident }) {
    const reportedBy = item.users
        ? `${item.users.name} ${item.users.ap}${item.users.am ? " " + item.users.am : ""}`.trim()
        : "—";

    const statusName = item.inc_status?.name ?? "—";
    const ss = getStatusStyle(statusName);
    const { date, time } = formatDateTime(item.created_at);

    return (
        <View style={cardStyles.card}>
            {/* Barra lateral coloreada por status */}
            <View style={[cardStyles.statusBar, { backgroundColor: ss.color }]} />

            <View style={cardStyles.inner}>
                {/* ── Fila superior: avatar + quien reportó + status badge ── */}
                <View style={cardStyles.topRow}>
                    <View style={cardStyles.avatarCircle}>
                        <Text style={cardStyles.avatarInitials}>
                            {reportedBy.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </Text>
                    </View>
                    <View style={cardStyles.reporterInfo}>
                        <Text style={cardStyles.reportedBy} numberOfLines={1}>{reportedBy}</Text>
                        <View style={cardStyles.dateTimeRow}>
                            <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.40)" />
                            <Text style={cardStyles.dateText}>{date}</Text>
                            <View style={cardStyles.timeDot} />
                            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.40)" />
                            <Text style={cardStyles.dateText}>{time}</Text>
                        </View>
                    </View>
                    <View style={[cardStyles.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                        <Ionicons name={ss.icon} size={13} color={ss.color} />
                        <Text style={[cardStyles.statusText, { color: ss.color }]}>{statusName}</Text>
                    </View>
                </View>

                {/* ── Divisor ── */}
                <View style={cardStyles.divider} />

                {/* ── Meta chips: Área + Tipo ── */}
                <View style={cardStyles.metaRow}>
                    <View style={cardStyles.metaChip}>
                        <Ionicons name="grid-outline" size={12} color={Colors.primary.light} />
                        <Text style={cardStyles.metaChipText}>{item.areas?.name ?? "—"}</Text>
                    </View>
                    <View style={[cardStyles.metaChip, cardStyles.metaChipPurple]}>
                        <Ionicons name="alert-circle-outline" size={12} color="#A78BFA" />
                        <Text style={[cardStyles.metaChipText, { color: "#C4B5FD" }]}>{item.inc_types?.name ?? "—"}</Text>
                    </View>
                </View>

                {/* ── Descripción ── */}
                <Text style={cardStyles.description} numberOfLines={3}>{item.description}</Text>

                {/* ── Imagen (opcional) ── */}
                {item.image ? (
                    <Image source={{ uri: item.image }} style={cardStyles.image} resizeMode="cover" />
                ) : null}

                {/* ── Footer: costo + ID ── */}
                <View style={cardStyles.footer}>
                    <View style={cardStyles.footerLeft}>
                        <Ionicons name="cash-outline" size={13} color="rgba(255,255,255,0.35)" />
                        <Text style={cardStyles.costLabel}>Costo:</Text>
                        <Text style={cardStyles.costValue}>${item.cost ?? 0}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

export default function IncidentsScreen() {
    const { user } = useSession();
    const { areas, statuses, catalogsLoading } = useCatalogs();
    const { incidents, isLoading, error, fetchIncidents } = useIncidents();

    const [activeStatusId, setActiveStatusId] = useState<number | undefined>(undefined);
    const [activeAreaId, setActiveAreaId] = useState<number | undefined>(undefined);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => { fetchIncidents(); }, []);
    useEffect(() => { fetchIncidents(activeStatusId, activeAreaId); }, [activeStatusId, activeAreaId]);

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.parallel([
            Animated.timing(drawerAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.timing(drawerAnim, { toValue: DRAWER_WIDTH, duration: 240, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
        ]).start(() => setDrawerOpen(false));
    };

    const selectArea = (id?: number) => { setActiveAreaId(id); closeDrawer(); };
    const selectStatus = (id?: number) => { setActiveStatusId(id); };

    const activeAreaName = areas.find((a) => a.id === activeAreaId)?.name;

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />
            <View style={styles.blobTR} />
            <View style={styles.blobBL} />

            <SafeAreaView style={styles.safeArea}>
                {/* ── HEADER ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoCircle}>
                            <Image
                                source={require("@/assets/images/logo.png")}
                                style={styles.logoImg}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.headerTitle}>ADI</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/profile" as any)}
                            style={styles.headerIconBtn}
                        >
                            <Ionicons name="person-circle-outline" size={28} color="rgba(255,255,255,0.75)" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={openDrawer} style={styles.headerIconBtn}>
                            <Ionicons
                                name="options-outline"
                                size={24}
                                color={activeAreaId !== undefined ? Colors.primary.light : "rgba(255,255,255,0.75)"}
                            />
                            {activeAreaId !== undefined && <View style={styles.filterDot} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── STATUS TABS (desde BD) ── */}
                {catalogsLoading ? (
                    <View style={styles.tabsLoading}>
                        <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
                    </View>
                ) : (
                    <View style={styles.tabsWrapper}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.statusTabsContainer}
                        >
                            {/* Tab "Todas" */}
                            <TouchableOpacity
                                onPress={() => selectStatus(undefined)}
                                style={[styles.statusTab, activeStatusId === undefined && styles.statusTabAllActive]}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.statusTabText, activeStatusId === undefined && styles.statusTabTextAllActive]}>
                                    Todas
                                </Text>
                            </TouchableOpacity>

                            {/* Tabs de status desde BD */}
                            {statuses.map((s) => {
                                const ss = getStatusStyle(s.name);
                                const isActive = activeStatusId === s.id;
                                return (
                                    <TouchableOpacity
                                        key={s.id}
                                        onPress={() => selectStatus(s.id)}
                                        style={[
                                            styles.statusTab,
                                            isActive && { borderColor: ss.border, backgroundColor: ss.bg },
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={ss.icon}
                                            size={13}
                                            color={isActive ? ss.color : "rgba(255,255,255,0.35)"}
                                            style={{ marginRight: 5 }}
                                        />
                                        <Text style={[
                                            styles.statusTabText,
                                            isActive && [styles.statusTabTextActive, { color: ss.color }],
                                        ]}>
                                            {s.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* ── Banner filtro activo por área ── */}
                {activeAreaId !== undefined && (
                    <View style={styles.activeFilterBanner}>
                        <Ionicons name="funnel" size={12} color={Colors.primary.light} />
                        <Text style={styles.activeFilterText}>Área: {activeAreaName}</Text>
                        <TouchableOpacity onPress={() => setActiveAreaId(undefined)}>
                            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Contador de resultados ── */}
                {!isLoading && !error && (
                    <View style={styles.resultsBar}>
                        <Text style={styles.resultsText}>
                            {incidents.length} {incidents.length === 1 ? "incidencia" : "incidencias"}
                            {activeStatusId !== undefined ? ` · ${statuses.find(s => s.id === activeStatusId)?.name}` : ""}
                            {activeAreaId !== undefined ? ` · ${activeAreaName}` : ""}
                        </Text>
                    </View>
                )}

                {/* ── LISTA ── */}
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.light} />
                        <Text style={styles.emptyText}>Cargando incidencias...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={40} color="rgba(255,255,255,0.25)" />
                        <Text style={styles.emptyText}>{error}</Text>
                    </View>
                ) : incidents.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="document-text-outline" size={44} color="rgba(255,255,255,0.15)" />
                        <Text style={styles.emptyTitle}>Sin incidencias</Text>
                        <Text style={styles.emptyText}>No hay registros con los filtros actuales.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={incidents}
                        keyExtractor={(i) => String(i.id)}
                        renderItem={({ item }) => <IncidentCard item={item} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onRefresh={() => fetchIncidents(activeStatusId, activeAreaId)}
                        refreshing={isLoading}
                    />
                )}
            </SafeAreaView>

            {/* ── DRAWER FILTRO POR ÁREA ── */}
            {drawerOpen && (
                <View style={StyleSheet.absoluteFillObject}>
                    <Animated.View style={[styles.drawerOverlay, { opacity: overlayAnim }]}>
                        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDrawer} />
                    </Animated.View>
                    <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                        <SafeAreaView style={styles.drawerSafe}>
                            <View style={styles.drawerHeader}>
                                <Text style={styles.drawerTitle}>Filtrar por área</Text>
                                <TouchableOpacity onPress={closeDrawer}>
                                    <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <TouchableOpacity
                                    style={[styles.drawerItem, activeAreaId === undefined && styles.drawerItemActive]}
                                    onPress={() => selectArea(undefined)}
                                >
                                    <Ionicons name="apps-outline" size={18}
                                        color={activeAreaId === undefined ? Colors.primary.light : "rgba(255,255,255,0.55)"} />
                                    <Text style={[styles.drawerItemText, activeAreaId === undefined && styles.drawerItemTextActive]}>
                                        Todas las áreas
                                    </Text>
                                    {activeAreaId === undefined && (
                                        <Ionicons name="checkmark" size={16} color={Colors.primary.light} style={{ marginLeft: "auto" }} />
                                    )}
                                </TouchableOpacity>
                                {areas.map((area) => (
                                    <TouchableOpacity
                                        key={area.id}
                                        style={[styles.drawerItem, activeAreaId === area.id && styles.drawerItemActive]}
                                        onPress={() => selectArea(area.id)}
                                    >
                                        <Ionicons name="grid-outline" size={18}
                                            color={activeAreaId === area.id ? Colors.primary.light : "rgba(255,255,255,0.55)"} />
                                        <Text style={[styles.drawerItemText, activeAreaId === area.id && styles.drawerItemTextActive]}>
                                            {area.name}
                                        </Text>
                                        {activeAreaId === area.id && (
                                            <Ionicons name="checkmark" size={16} color={Colors.primary.light} style={{ marginLeft: "auto" }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </SafeAreaView>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

// ─── Card Styles ───────────────────────────────────────────
const cardStyles = StyleSheet.create({
    card: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        marginBottom: 12,
        overflow: "hidden",
    },
    statusBar: { width: 4 },
    inner: { flex: 1, padding: 14 },
    topRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    avatarCircle: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: "rgba(59,130,246,0.20)",
        borderWidth: 1, borderColor: "rgba(59,130,246,0.30)",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarInitials: { fontFamily: "Outfit_700Bold", fontSize: 13, color: Colors.primary.light },
    reporterInfo: { flex: 1, gap: 3 },
    reportedBy: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#FFFFFF" },
    dateTimeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    dateText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.42)" },
    timeDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.20)" },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, flexShrink: 0,
    },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
    divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 10 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
    metaChip: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 4,
        borderWidth: 1, borderColor: "rgba(59,130,246,0.20)",
    },
    metaChipPurple: { backgroundColor: "rgba(109,40,217,0.12)", borderColor: "rgba(167,139,250,0.20)" },
    metaChipText: { fontFamily: "Outfit_500Medium", fontSize: 11, color: "rgba(255,255,255,0.70)" },
    description: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: "rgba(255,255,255,0.72)", lineHeight: 20, marginBottom: 10,
    },
    image: { width: "100%", height: 160, borderRadius: 12, marginBottom: 10 },
    footer: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", paddingTop: 8,
    },
    footerLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
    costLabel: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "rgba(255,255,255,0.38)" },
    costValue: { fontFamily: "Outfit_700Bold", fontSize: 12, color: "rgba(255,255,255,0.65)" },
    incId: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.25)" },
});

// ─── Screen Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0C1F5C" },
    blobTR: {
        position: "absolute", top: -60, right: -70,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: "rgba(59,130,246,0.12)",
    },
    blobBL: {
        position: "absolute", bottom: 100, left: -60,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: "rgba(109,40,217,0.10)",
    },
    safeArea: { flex: 1 },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "#FFFFFF",
        alignItems: "center", justifyContent: "center", overflow: "hidden",
    },
    logoImg: { width: 32, height: 32 },
    headerTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: "#FFFFFF", letterSpacing: 2 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
    headerIconBtn: { padding: 6, position: "relative" },
    filterDot: {
        position: "absolute", top: 4, right: 4,
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: Colors.primary.light,
        borderWidth: 1.5, borderColor: "#0C1F5C",
    },
    tabsLoading: { height: 54, alignItems: "center", justifyContent: "center" },
    tabsWrapper: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
    statusTabsContainer: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, alignItems: "center" },
    statusTab: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 13, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    statusTabAllActive: {
        borderColor: "rgba(59,130,246,0.45)",
        backgroundColor: "rgba(59,130,246,0.15)",
    },
    statusTabText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "rgba(255,255,255,0.42)" },
    statusTabTextAllActive: { fontFamily: "Outfit_700Bold", color: Colors.primary.light },
    statusTabTextActive: { fontFamily: "Outfit_700Bold" },
    activeFilterBanner: {
        flexDirection: "row", alignItems: "center", gap: 6,
        marginHorizontal: 16, marginTop: 8,
        paddingHorizontal: 12, paddingVertical: 7,
        backgroundColor: "rgba(59,130,246,0.12)",
        borderRadius: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.25)",
    },
    activeFilterText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.primary.light, flex: 1 },
    resultsBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 },
    resultsText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "rgba(255,255,255,0.30)" },
    listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: "rgba(255,255,255,0.40)" },
    emptyText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "rgba(255,255,255,0.28)", textAlign: "center" },
    drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
    drawer: {
        position: "absolute", top: 0, bottom: 0, right: 0, width: DRAWER_WIDTH,
        backgroundColor: "#0F2470",
        borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.09)",
        shadowColor: "#000", shadowOffset: { width: -8, height: 0 },
        shadowOpacity: 0.45, shadowRadius: 20, elevation: 20,
    },
    drawerSafe: { flex: 1, paddingTop: Platform.OS === "android" ? 40 : 0 },
    drawerHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 18,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
    },
    drawerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#FFFFFF" },
    drawerItem: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
    },
    drawerItemActive: { backgroundColor: "rgba(59,130,246,0.10)" },
    drawerItemText: { fontFamily: "Outfit_400Regular", fontSize: 14, color: "rgba(255,255,255,0.60)" },
    drawerItemTextActive: { fontFamily: "Outfit_600SemiBold", color: "#FFFFFF" },
});