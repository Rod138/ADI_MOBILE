import IncidentCard, { getStatusStyle } from "@/components/IncidentCard";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useCatalogs, useIncidents } from "@/hooks/useIncidents";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator, Animated, Dimensions, FlatList,
    Platform, Pressable, ScrollView, StatusBar, StyleSheet,
    Text, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export default function IncidentsScreen() {
    const { user } = useSession();
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
            <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
            <SafeAreaView style={styles.safeArea}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.push("/(tabs)/home" as any)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.80)" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Incidencias</Text>
                            <Text style={styles.headerSubtitle}>Gestión de reportes</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.headerBtn}
                            onPress={() => router.push("/(incidents)/create" as any)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add" size={20} color="rgba(255,255,255,0.85)" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.headerBtn, activeAreaId !== undefined && styles.headerBtnActive]}
                            onPress={openDrawer}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="options-outline"
                                size={20}
                                color={activeAreaId !== undefined ? Colors.primary.light : "rgba(255,255,255,0.85)"}
                            />
                            {activeAreaId !== undefined && <View style={styles.badgeDot} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Status tabs */}
                <View style={styles.tabsContainer}>
                    {catalogsLoading ? (
                        <View style={styles.tabsLoading}>
                            <ActivityIndicator size="small" color={Colors.screen.textMuted} />
                        </View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                            <TouchableOpacity
                                onPress={() => setActiveStatusId(undefined)}
                                style={[styles.tab, activeStatusId === undefined && styles.tabActive]}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="apps" size={12} color={activeStatusId === undefined ? "#fff" : Colors.screen.textMuted} />
                                <Text style={[styles.tabText, activeStatusId === undefined && styles.tabTextActive]}>Todas</Text>
                            </TouchableOpacity>
                            {statuses.map((s) => {
                                const ss = getStatusStyle(s.name);
                                const isActive = activeStatusId === s.id;
                                return (
                                    <TouchableOpacity
                                        key={s.id}
                                        onPress={() => setActiveStatusId(s.id)}
                                        style={[styles.tab, isActive && { borderColor: ss.color, backgroundColor: ss.color + "20" }]}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={ss.icon} size={12} color={isActive ? ss.color : Colors.screen.textMuted} />
                                        <Text style={[styles.tabText, isActive && { color: ss.color, fontFamily: "Outfit_600SemiBold" }]}>
                                            {s.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>

                {/* Active filters */}
                {activeAreaId !== undefined && (
                    <View style={styles.filterBannerRow}>
                        <TouchableOpacity
                            style={styles.filterChip}
                            onPress={() => setActiveAreaId(undefined)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="location" size={11} color={Colors.primary.dark} />
                            <Text style={styles.filterChipText}>{activeAreaName}</Text>
                            <Ionicons name="close" size={12} color={Colors.primary.dark} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Results count */}
                {!isLoading && !error && (
                    <View style={styles.resultsBar}>
                        <Text style={styles.resultsText}>
                            <Text style={styles.resultsCount}>{incidents.length}</Text>
                            {" "}{incidents.length === 1 ? "incidencia" : "incidencias"}
                        </Text>
                    </View>
                )}

                {/* Content */}
                {isLoading ? (
                    <View style={styles.centered}>
                        <View style={styles.stateCard}>
                            <ActivityIndicator size="large" color={Colors.primary.main} />
                            <Text style={styles.stateText}>Cargando incidencias...</Text>
                        </View>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <View style={styles.stateCard}>
                            <View style={styles.stateIcon}>
                                <Ionicons name="cloud-offline-outline" size={28} color={Colors.screen.textMuted} />
                            </View>
                            <Text style={styles.stateTitle}>Sin conexión</Text>
                            <Text style={styles.stateText}>{error}</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchIncidents(activeStatusId, activeAreaId)}>
                                <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
                                <Text style={styles.retryText}>Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : incidents.length === 0 ? (
                    <View style={styles.centered}>
                        <View style={styles.stateCard}>
                            <View style={styles.stateIcon}>
                                <Ionicons name="document-text-outline" size={28} color={Colors.screen.textMuted} />
                            </View>
                            <Text style={styles.stateTitle}>Sin incidencias</Text>
                            <Text style={styles.stateText}>No hay registros con los filtros actuales.</Text>
                        </View>
                    </View>
                ) : (
                    <FlatList
                        data={incidents}
                        keyExtractor={(i) => String(i.id)}
                        renderItem={({ item }) => (
                            <IncidentCard
                                item={item}
                                currentUserId={user?.id}
                                onPress={(inc) => router.push({
                                    pathname: "/(incidents)/incident-detail",
                                    params: { data: JSON.stringify(inc) },
                                } as any)}
                                onEdit={(inc) => router.push({ pathname: "/(incidents)/edit-incident", params: { id: inc.id } } as any)}
                            />
                        )}
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
                                <View>
                                    <Text style={styles.drawerTitle}>Filtrar área</Text>
                                    <Text style={styles.drawerSubtitle}>Selecciona una zona</Text>
                                </View>
                                <TouchableOpacity style={styles.drawerClose} onPress={closeDrawer}>
                                    <Ionicons name="close" size={18} color={Colors.screen.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerList}>
                                {[
                                    { id: undefined as number | undefined, name: "Todas las áreas", icon: "apps-outline" as const },
                                    ...areas.map(a => ({ ...a, icon: "grid-outline" as const }))
                                ].map((item) => {
                                    const isActive = activeAreaId === item.id;
                                    return (
                                        <TouchableOpacity
                                            key={item.id ?? "all"}
                                            style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                                            onPress={() => selectArea(item.id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.drawerItemIcon, isActive && styles.drawerItemIconActive]}>
                                                <Ionicons name={item.icon} size={16} color={isActive ? Colors.primary.dark : Colors.screen.textSecondary} />
                                            </View>
                                            <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>
                                                {item.name}
                                            </Text>
                                            {isActive && <Ionicons name="checkmark-circle" size={16} color={Colors.primary.main} />}
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

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },
    safeArea: { flex: 1 },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#1A1A1A",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.06)",
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 17,
        color: "#FFFFFF",
    },
    headerSubtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: "rgba(255,255,255,0.35)",
    },
    headerRight: { flexDirection: "row", gap: 8 },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    headerBtnActive: {
        borderColor: Colors.primary.light + "50",
        backgroundColor: Colors.primary.main + "20",
    },
    badgeDot: {
        position: "absolute",
        top: 5,
        right: 5,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: Colors.primary.light,
        borderWidth: 1.5,
        borderColor: "#1A1A1A",
    },

    // Tabs
    tabsContainer: {
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.screen.border,
    },
    tabsLoading: { height: 52, alignItems: "center", justifyContent: "center" },
    tabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 6, alignItems: "center" },
    tab: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: Colors.screen.border, backgroundColor: Colors.screen.bg,
    },
    tabActive: { borderColor: Colors.primary.main, backgroundColor: Colors.primary.main },
    tabText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textMuted },
    tabTextActive: { fontFamily: "Outfit_600SemiBold", color: "#FFFFFF" },

    // Filters
    filterBannerRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingTop: 10, gap: 6 },
    filterChip: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 10, paddingVertical: 5,
        backgroundColor: Colors.primary.muted, borderRadius: 20,
        borderWidth: 1, borderColor: Colors.primary.muted,
    },
    filterChipText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.primary.dark },

    // Results bar
    resultsBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
    resultsText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted },
    resultsCount: { fontFamily: "Outfit_700Bold", color: Colors.screen.textSecondary },

    list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },

    // States
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
    stateCard: {
        backgroundColor: Colors.screen.card, borderRadius: 20, padding: 28,
        alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.screen.border,
        width: "100%", maxWidth: 280,
    },
    stateIcon: {
        width: 60, height: 60, borderRadius: 18,
        backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    stateTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.screen.textSecondary },
    stateText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center", lineHeight: 19 },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8,
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },

    // Overlay
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.40)" },

    // Drawer
    drawer: {
        position: "absolute", top: 0, bottom: 0, right: 0, width: DRAWER_WIDTH,
        backgroundColor: Colors.screen.card, borderLeftWidth: 1, borderLeftColor: Colors.screen.border,
        shadowColor: "#000", shadowOffset: { width: -6, height: 0 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 20,
    },
    drawerSafe: { flex: 1, paddingTop: Platform.OS === "android" ? 40 : 0 },
    drawerHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 18,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    drawerTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: Colors.screen.textPrimary },
    drawerSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted, marginTop: 2 },
    drawerClose: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: Colors.screen.border,
    },
    drawerList: { padding: 12, gap: 4 },
    drawerItem: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 14, paddingVertical: 13,
        borderRadius: 12, borderWidth: 1, borderColor: "transparent",
    },
    drawerItemActive: { backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted },
    drawerItemIcon: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: Colors.screen.border,
    },
    drawerItemIconActive: { backgroundColor: Colors.primary.muted, borderColor: Colors.primary.muted },
    drawerItemText: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.screen.textSecondary },
    drawerItemTextActive: { fontFamily: "Outfit_600SemiBold", color: Colors.primary.dark },
});