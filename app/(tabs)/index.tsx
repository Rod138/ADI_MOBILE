import { ScreenHeader } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useCatalogs, useIncidents, type Incident } from "@/hooks/useIncidents";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator, Animated, Dimensions, FlatList, Image,
    Platform, Pressable, ScrollView, StatusBar, StyleSheet,
    Text, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.72;

function formatDateTime(iso: string) {
    const d = new Date(iso);
    return {
        date: d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true }),
    };
}

function getStatusStyle(name: string) {
    const n = name?.toLowerCase() ?? "";
    if (n.includes("resuel") || n.includes("complet"))
        return { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "checkmark-circle-outline" as const };
    if (n.includes("pend"))
        return { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "time-outline" as const };
    if (n.includes("cerr"))
        return { color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB", icon: "lock-closed-outline" as const };
    return { color: Colors.primary.main, bg: Colors.screen.chipBlue, border: Colors.screen.border, icon: "ellipse-outline" as const };
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
            <View style={[cardStyles.statusBar, { backgroundColor: ss.color }]} />
            <View style={cardStyles.inner}>
                {/* Fila superior */}
                <View style={cardStyles.topRow}>
                    <View style={cardStyles.avatar}>
                        <Text style={cardStyles.avatarText}>
                            {reportedBy.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </Text>
                    </View>
                    <View style={cardStyles.reporterInfo}>
                        <Text style={cardStyles.reportedBy} numberOfLines={1}>{reportedBy}</Text>
                        <View style={cardStyles.dateRow}>
                            <Ionicons name="calendar-outline" size={11} color={Colors.screen.textMuted} />
                            <Text style={cardStyles.dateText}>{date}</Text>
                            <View style={cardStyles.dot} />
                            <Ionicons name="time-outline" size={11} color={Colors.screen.textMuted} />
                            <Text style={cardStyles.dateText}>{time}</Text>
                        </View>
                    </View>
                    <View style={[cardStyles.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                        <Ionicons name={ss.icon} size={12} color={ss.color} />
                        <Text style={[cardStyles.statusText, { color: ss.color }]}>{statusName}</Text>
                    </View>
                </View>

                <View style={cardStyles.divider} />

                {/* Chips */}
                <View style={cardStyles.chips}>
                    <View style={cardStyles.chipBlue}>
                        <Ionicons name="grid-outline" size={11} color={Colors.screen.chipBlueTxt} />
                        <Text style={[cardStyles.chipText, { color: Colors.screen.chipBlueTxt }]}>
                            {item.areas?.name ?? "—"}
                        </Text>
                    </View>
                    <View style={cardStyles.chipPurple}>
                        <Ionicons name="alert-circle-outline" size={11} color={Colors.screen.chipPurpleTxt} />
                        <Text style={[cardStyles.chipText, { color: Colors.screen.chipPurpleTxt }]}>
                            {item.inc_types?.name ?? "—"}
                        </Text>
                    </View>
                </View>

                <Text style={cardStyles.description} numberOfLines={3}>{item.description}</Text>

                {item.image ? (
                    <Image source={{ uri: item.image }} style={cardStyles.image} resizeMode="cover" />
                ) : null}

                <View style={cardStyles.footer}>
                    <Ionicons name="cash-outline" size={12} color={Colors.screen.textMuted} />
                    <Text style={cardStyles.costLabel}>Costo:</Text>
                    <Text style={cardStyles.costValue}>${item.cost ?? 0}</Text>
                </View>
            </View>
        </View>
    );
}

export default function IncidentsScreen() {
    const { areas, statuses, catalogsLoading } = useCatalogs();
    const { incidents, isLoading, error, fetchIncidents } = useIncidents();

    const [activeStatusId, setActiveStatusId] = useState<number | undefined>();
    const [activeAreaId, setActiveAreaId] = useState<number | undefined>();
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
    const activeAreaName = areas.find((a) => a.id === activeAreaId)?.name;

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />

            <SafeAreaView style={styles.safeArea}>
                <ScreenHeader
                    theme="dark"
                    title="ADI"
                    logoImage={require("@/assets/images/logo.png")}
                    rightActions={[
                        { icon: "person-circle-outline", onPress: () => router.push("/(tabs)/profile" as any) },
                        { icon: "options-outline", onPress: openDrawer, badge: activeAreaId !== undefined },
                    ]}
                />

                {/* Status tabs */}
                {catalogsLoading ? (
                    <View style={styles.tabsLoading}>
                        <ActivityIndicator size="small" color={Colors.screen.textMuted} />
                    </View>
                ) : (
                    <View style={styles.tabsWrapper}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                            <TouchableOpacity
                                onPress={() => setActiveStatusId(undefined)}
                                style={[styles.tab, activeStatusId === undefined && styles.tabAllActive]}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.tabText, activeStatusId === undefined && styles.tabTextAllActive]}>
                                    Todas
                                </Text>
                            </TouchableOpacity>
                            {statuses.map((s) => {
                                const ss = getStatusStyle(s.name);
                                const isActive = activeStatusId === s.id;
                                return (
                                    <TouchableOpacity
                                        key={s.id}
                                        onPress={() => setActiveStatusId(s.id)}
                                        style={[styles.tab, isActive && { borderColor: ss.border, backgroundColor: ss.bg }]}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={ss.icon} size={12} color={isActive ? ss.color : Colors.screen.textMuted} style={{ marginRight: 4 }} />
                                        <Text style={[styles.tabText, isActive && { color: ss.color, fontFamily: "Outfit_700Bold" }]}>
                                            {s.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Banner filtro activo */}
                {activeAreaId !== undefined && (
                    <View style={styles.filterBanner}>
                        <Ionicons name="funnel" size={12} color={Colors.primary.main} />
                        <Text style={styles.filterText}>Área: {activeAreaName}</Text>
                        <TouchableOpacity onPress={() => setActiveAreaId(undefined)}>
                            <Ionicons name="close-circle" size={16} color={Colors.screen.textMuted} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Contador */}
                {!isLoading && !error && (
                    <View style={styles.resultsBar}>
                        <Text style={styles.resultsText}>
                            {incidents.length} {incidents.length === 1 ? "incidencia" : "incidencias"}
                            {activeStatusId !== undefined ? ` · ${statuses.find(s => s.id === activeStatusId)?.name}` : ""}
                            {activeAreaId !== undefined ? ` · ${activeAreaName}` : ""}
                        </Text>
                    </View>
                )}

                {/* Lista */}
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.light} />
                        <Text style={styles.emptyText}>Cargando incidencias...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={40} color={Colors.screen.textMuted} />
                        <Text style={styles.emptyText}>{error}</Text>
                    </View>
                ) : incidents.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="document-text-outline" size={44} color={Colors.screen.textMuted} />
                        <Text style={styles.emptyTitle}>Sin incidencias</Text>
                        <Text style={styles.emptyText}>No hay registros con los filtros actuales.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={incidents}
                        keyExtractor={(i) => String(i.id)}
                        renderItem={({ item }) => <IncidentCard item={item} />}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        onRefresh={() => fetchIncidents(activeStatusId, activeAreaId)}
                        refreshing={isLoading}
                    />
                )}
            </SafeAreaView>

            {/* Drawer */}
            {drawerOpen && (
                <View style={StyleSheet.absoluteFillObject}>
                    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
                        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDrawer} />
                    </Animated.View>
                    <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                        <SafeAreaView style={styles.drawerSafe}>
                            <View style={styles.drawerHeader}>
                                <Text style={styles.drawerTitle}>Filtrar por área</Text>
                                <TouchableOpacity onPress={closeDrawer}>
                                    <Ionicons name="close" size={22} color={Colors.screen.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {[{ id: undefined, name: "Todas las áreas", icon: "apps-outline" as const }, ...areas.map(a => ({ ...a, icon: "grid-outline" as const }))].map((item) => {
                                    const isActive = activeAreaId === item.id;
                                    return (
                                        <TouchableOpacity
                                            key={item.id ?? "all"}
                                            style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                                            onPress={() => selectArea(item.id)}
                                        >
                                            <Ionicons name={item.icon} size={18} color={isActive ? Colors.primary.main : Colors.screen.textSecondary} />
                                            <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>
                                                {item.name}
                                            </Text>
                                            {isActive && <Ionicons name="checkmark" size={16} color={Colors.primary.main} style={{ marginLeft: "auto" }} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </SafeAreaView>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const cardStyles = StyleSheet.create({
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
    costLabel: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted, flex: 1 },
    costValue: { fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.screen.textSecondary },
});

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },
    safeArea: { flex: 1 },
    tabsLoading: { height: 50, alignItems: "center", justifyContent: "center", backgroundColor: Colors.screen.card },
    tabsWrapper: { backgroundColor: Colors.screen.card, borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    tabs: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, alignItems: "center" },
    tab: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1,
        borderColor: Colors.screen.border, backgroundColor: Colors.screen.bg,
    },
    tabAllActive: { borderColor: Colors.primary.soft, backgroundColor: Colors.primary.soft },
    tabText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textMuted },
    tabTextAllActive: { fontFamily: "Outfit_700Bold", color: Colors.primary.main },
    filterBanner: {
        flexDirection: "row", alignItems: "center", gap: 6,
        marginHorizontal: 16, marginTop: 10,
        paddingHorizontal: 12, paddingVertical: 7,
        backgroundColor: Colors.screen.chipBlue,
        borderRadius: 10, borderWidth: 1, borderColor: Colors.screen.border,
    },
    filterText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.primary.main, flex: 1 },
    resultsBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 },
    resultsText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted },
    list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.screen.textSecondary },
    emptyText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center" },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
    drawer: {
        position: "absolute", top: 0, bottom: 0, right: 0, width: DRAWER_WIDTH,
        backgroundColor: Colors.screen.card,
        borderLeftWidth: 1, borderLeftColor: Colors.screen.border,
        shadowColor: "#000", shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
    },
    drawerSafe: { flex: 1, paddingTop: Platform.OS === "android" ? 40 : 0 },
    drawerHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    drawerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary },
    drawerItem: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 20, paddingVertical: 15,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    drawerItemActive: { backgroundColor: Colors.screen.chipBlue },
    drawerItemText: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.screen.textSecondary },
    drawerItemTextActive: { fontFamily: "Outfit_600SemiBold", color: Colors.primary.main },
});