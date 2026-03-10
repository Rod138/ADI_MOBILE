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

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function IncidentCard({ item }: { item: Incident }) {
    const reportedBy = item.users
        ? `${item.users.name} ${item.users.ap}${item.users.am ? " " + item.users.am : ""}`.trim()
        : "—";

    const statusName = item.inc_status?.name?.toLowerCase() ?? "";
    const statusColor =
        statusName.includes("resuel") ? Colors.status.success :
            statusName.includes("pend") ? Colors.status.warning :
                Colors.primary.light;

    return (
        <View style={cardStyles.card}>
            <View style={cardStyles.header}>
                <View style={cardStyles.headerLeft}>
                    <Text style={cardStyles.reportedBy} numberOfLines={1}>{reportedBy}</Text>
                    <Text style={cardStyles.date}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={[cardStyles.statusBadge, { borderColor: statusColor }]}>
                    <View style={[cardStyles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[cardStyles.statusText, { color: statusColor }]}>
                        {item.inc_status?.name ?? "—"}
                    </Text>
                </View>
            </View>

            <View style={cardStyles.metaRow}>
                <View style={cardStyles.metaItem}>
                    <Ionicons name="grid-outline" size={12} color="rgba(255,255,255,0.45)" />
                    <Text style={cardStyles.metaText}>{item.areas?.name ?? "—"}</Text>
                </View>
                <View style={cardStyles.metaDot} />
                <View style={cardStyles.metaItem}>
                    <Ionicons name="alert-circle-outline" size={12} color="rgba(255,255,255,0.45)" />
                    <Text style={cardStyles.metaText}>{item.inc_types?.name ?? "—"}</Text>
                </View>
            </View>

            <Text style={cardStyles.description} numberOfLines={2}>{item.description}</Text>

            {item.image ? (
                <Image source={{ uri: item.image }} style={cardStyles.image} resizeMode="cover" />
            ) : null}

            <View style={cardStyles.footer}>
                <Text style={cardStyles.costText}>
                    Costo: <Text style={cardStyles.costValue}>${item.cost ?? 0}</Text>
                </Text>
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

    // Carga inicial
    useEffect(() => {
        fetchIncidents();
    }, []);

    // Recarga cuando cambian filtros
    useEffect(() => {
        fetchIncidents(activeStatusId, activeAreaId);
    }, [activeStatusId, activeAreaId]);

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

    const selectArea = (id?: number) => {
        setActiveAreaId(id);
        closeDrawer();
    };

    const selectStatus = (id?: number) => {
        setActiveStatusId(id);
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />
            <View style={styles.blobTR} />
            <View style={styles.blobBL} />

            <SafeAreaView style={styles.safeArea}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoCircle}>
                            <Ionicons name="shield-checkmark" size={18} color={Colors.primary.light} />
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
                            <Ionicons name="options-outline" size={24} color="rgba(255,255,255,0.75)" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* STATUS TABS */}
                {catalogsLoading ? (
                    <View style={styles.tabsLoading}>
                        <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
                    </View>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statusTabsContainer}
                    >
                        {/* Tab "Todas" — solo texto, sin fondo cuando está inactivo */}
                        <TouchableOpacity
                            onPress={() => selectStatus(undefined)}
                            style={styles.statusTab}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.statusTabText,
                                activeStatusId === undefined && styles.statusTabTextActive,
                            ]}>
                                Todas
                            </Text>
                            {activeStatusId === undefined && <View style={styles.statusTabUnderline} />}
                        </TouchableOpacity>

                        {statuses.map((s) => (
                            <TouchableOpacity
                                key={s.id}
                                onPress={() => selectStatus(s.id)}
                                style={styles.statusTab}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.statusTabText,
                                    activeStatusId === s.id && styles.statusTabTextActive,
                                ]}>
                                    {s.name}
                                </Text>
                                {activeStatusId === s.id && <View style={styles.statusTabUnderline} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Filtro activo por área */}
                {activeAreaId !== undefined && (
                    <View style={styles.activeFilterBanner}>
                        <Ionicons name="funnel" size={12} color={Colors.primary.light} />
                        <Text style={styles.activeFilterText}>
                            Área: {areas.find((a) => a.id === activeAreaId)?.name}
                        </Text>
                        <TouchableOpacity onPress={() => setActiveAreaId(undefined)}>
                            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* LISTA */}
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.light} />
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={40} color="rgba(255,255,255,0.25)" />
                        <Text style={styles.emptyText}>{error}</Text>
                    </View>
                ) : incidents.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="document-text-outline" size={40} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyText}>Sin incidencias</Text>
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

            {/* DRAWER FILTRO POR ÁREA */}
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

const cardStyles = StyleSheet.create({
    card: {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        padding: 16,
        marginBottom: 12,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    headerLeft: { flex: 1, marginRight: 12 },
    reportedBy: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.white },
    date: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 2 },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        borderWidth: 1, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4,
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: "Outfit_500Medium", fontSize: 11 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.2)" },
    metaText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "rgba(255,255,255,0.50)" },
    description: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: "rgba(255,255,255,0.70)", lineHeight: 20, marginBottom: 10,
    },
    image: { width: "100%", height: 160, borderRadius: 12, marginBottom: 10 },
    footer: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", paddingTop: 10 },
    costText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "rgba(255,255,255,0.40)" },
    costValue: { fontFamily: "Outfit_600SemiBold", color: "rgba(255,255,255,0.65)" },
});

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
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoCircle: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: "rgba(59,130,246,0.15)",
        borderWidth: 1, borderColor: "rgba(59,130,246,0.3)",
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: Colors.white, letterSpacing: 2 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
    headerIconBtn: { padding: 6 },

    // Status tabs — estilo underline, sin rectángulo
    tabsLoading: { height: 44, alignItems: "center", justifyContent: "center" },
    statusTabsContainer: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 0,
        gap: 4,
    },
    statusTab: {
        paddingHorizontal: 14,
        paddingBottom: 10,
        paddingTop: 6,
        alignItems: "center",
        position: "relative",
    },
    statusTabText: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "rgba(255,255,255,0.38)",
    },
    statusTabTextActive: {
        fontFamily: "Outfit_700Bold",
        color: Colors.white,
    },
    statusTabUnderline: {
        position: "absolute",
        bottom: 0,
        left: 14,
        right: 14,
        height: 2.5,
        borderRadius: 2,
        backgroundColor: Colors.primary.light,
    },

    // Filtro activo
    activeFilterBanner: {
        flexDirection: "row", alignItems: "center", gap: 6,
        marginHorizontal: 16, marginBottom: 8,
        paddingHorizontal: 12, paddingVertical: 7,
        backgroundColor: "rgba(59,130,246,0.12)",
        borderRadius: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.25)",
    },
    activeFilterText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.primary.light, flex: 1 },

    listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    emptyText: { fontFamily: "Outfit_400Regular", fontSize: 14, color: "rgba(255,255,255,0.35)" },

    // Drawer
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
    drawerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.white },
    drawerItem: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
    },
    drawerItemActive: { backgroundColor: "rgba(59,130,246,0.10)" },
    drawerItemText: { fontFamily: "Outfit_400Regular", fontSize: 14, color: "rgba(255,255,255,0.60)" },
    drawerItemTextActive: { fontFamily: "Outfit_600SemiBold", color: Colors.white },
});