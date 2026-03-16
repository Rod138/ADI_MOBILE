import IncidentCard, { getStatusStyle } from "@/components/IncidentCard";
import { ScreenHeader } from "@/components/ui";
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
const DRAWER_WIDTH = SCREEN_WIDTH * 0.72;

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
            <StatusBar barStyle="light-content" backgroundColor="#1C1C1C" />

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
                                        style={[styles.tab, isActive && styles.tabStatusActive]}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={ss.icon} size={12} color={isActive ? "#FFFFFF" : Colors.screen.textMuted} style={{ marginRight: 4 }} />
                                        <Text style={[styles.tabText, isActive && styles.tabTextStatusActive]}>
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
                        <Ionicons name="funnel" size={12} color="#FFFFFF" />
                        <Text style={styles.filterText}>Área: {activeAreaName}</Text>
                        <TouchableOpacity onPress={() => setActiveAreaId(undefined)}>
                            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
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
                        <ActivityIndicator size="large" color={Colors.primary.main} />
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
                        renderItem={({ item }) => (
                            <IncidentCard
                                item={item}
                                currentUserId={user?.id}
                                onEdit={(inc) => router.push({ pathname: "/(tabs)/edit-incident", params: { id: inc.id } } as any)}
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
                                            <Ionicons name={item.icon} size={18} color={isActive ? "#FFFFFF" : Colors.screen.textSecondary} />
                                            <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>
                                                {item.name}
                                            </Text>
                                            {isActive && <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginLeft: "auto" }} />}
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
    tabsLoading: { height: 50, alignItems: "center", justifyContent: "center", backgroundColor: Colors.screen.card },
    tabsWrapper: { backgroundColor: Colors.screen.card, borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    tabs: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, alignItems: "center" },
    tab: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1,
        borderColor: Colors.screen.border, backgroundColor: Colors.screen.bg,
    },
    tabAllActive: { borderColor: "#4D7C0F", backgroundColor: "#4D7C0F" },
    tabStatusActive: { borderColor: "#4D7C0F", backgroundColor: "#4D7C0F" },
    tabText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textMuted },
    tabTextAllActive: { fontFamily: "Outfit_700Bold", color: "#FFFFFF" },
    tabTextStatusActive: { fontFamily: "Outfit_700Bold", color: "#FFFFFF" },
    filterBanner: {
        flexDirection: "row", alignItems: "center", gap: 6,
        marginHorizontal: 16, marginTop: 10,
        paddingHorizontal: 12, paddingVertical: 7,
        backgroundColor: "#4D7C0F",
        borderRadius: 10, borderWidth: 1, borderColor: "#4D7C0F",
    },
    filterText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#FFFFFF", flex: 1 },
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
    drawerItemActive: { backgroundColor: "#4D7C0F" },
    drawerItemText: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.screen.textSecondary },
    drawerItemTextActive: { fontFamily: "Outfit_600SemiBold", color: "#FFFFFF" },
});