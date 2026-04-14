import { ScreenHeader, ScreenShell, StatusBanner } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useDepartments, type Department } from "@/hooks/useDepartments";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ── Tarjeta de departamento ───────────────────────────────────────────────────

interface DeptCardProps {
    item: Department;
    onToggle: (id: number, val: boolean) => void;
    onPress: (item: Department) => void;
    toggling: number | null;
}

function DeptCard({ item, onToggle, onPress, toggling }: DeptCardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 60, bounciness: 2 }).start();
    const handlePressOut = () =>
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

    const isToggling = toggling === item.id;

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={styles.card}
                onPress={() => onPress(item)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                {/* Accent */}
                <View style={[
                    styles.cardAccent,
                    { backgroundColor: item.is_in_use ? Colors.primary.main : Colors.neutral[300] }
                ]} />

                <View style={styles.cardInner}>
                    {/* Ícono + nombre */}
                    <View style={styles.cardLeft}>
                        <View style={[
                            styles.deptIcon,
                            {
                                backgroundColor: item.is_in_use ? Colors.primary.soft : Colors.neutral[100],
                                borderColor: item.is_in_use ? Colors.primary.muted : Colors.screen.border,
                            }
                        ]}>
                            <Ionicons
                                name="home-outline"
                                size={20}
                                color={item.is_in_use ? Colors.primary.main : Colors.neutral[400]}
                            />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.deptName}>{item.name}</Text>
                            <View style={[
                                styles.statusPill,
                                {
                                    backgroundColor: item.is_in_use ? Colors.primary.soft : Colors.neutral[100],
                                    borderColor: item.is_in_use ? Colors.primary.muted : Colors.screen.border,
                                }
                            ]}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: item.is_in_use ? Colors.primary.main : Colors.neutral[400] }
                                ]} />
                                <Text style={[
                                    styles.statusText,
                                    { color: item.is_in_use ? Colors.primary.dark : Colors.screen.textMuted }
                                ]}>
                                    {item.is_in_use ? "En uso" : "Desocupado"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Switch + chevron */}
                    <View style={styles.cardRight}>
                        {isToggling ? (
                            <ActivityIndicator size="small" color={Colors.primary.main} style={{ width: 51 }} />
                        ) : (
                            <Switch
                                value={item.is_in_use}
                                onValueChange={(val) => onToggle(item.id, val)}
                                trackColor={{ false: Colors.neutral[200], true: Colors.primary.muted }}
                                thumbColor={item.is_in_use ? Colors.primary.main : Colors.neutral[400]}
                                ios_backgroundColor={Colors.neutral[200]}
                            />
                        )}
                        <View style={styles.chevronBtn}>
                            <Ionicons name="chevron-forward" size={16} color={Colors.primary.main} />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function DepartmentsScreen() {
    const {
        departments,
        isLoading,
        error,
        fetchDepartments,
        toggleDeptInUse,
    } = useDepartments();

    const [search, setSearch] = useState("");
    const [filterInUse, setFilterInUse] = useState<"all" | "inUse" | "free">("all");
    const [toggling, setToggling] = useState<number | null>(null);
    const [toastMsg, setToastMsg] = useState<{ type: "error" | "warning"; text: string } | null>(null);

    useEffect(() => { fetchDepartments(); }, []);

    const filtered = useMemo(() => {
        return departments.filter(d => {
            const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
            const matchFilter =
                filterInUse === "all" ||
                (filterInUse === "inUse" && d.is_in_use) ||
                (filterInUse === "free" && !d.is_in_use);
            return matchSearch && matchFilter;
        });
    }, [departments, search, filterInUse]);

    const inUseCount = departments.filter(d => d.is_in_use).length;
    const freeCount = departments.length - inUseCount;

    const showToast = (type: "error" | "warning", text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3500);
    };

    const handleToggle = useCallback(async (id: number, val: boolean) => {
        setToggling(id);
        const result = await toggleDeptInUse(id, val);
        setToggling(null);
        if (!result.ok && result.noResidents) {
            showToast("warning", "Agrega al menos un residente antes de activar el departamento.");
        }
    }, [toggleDeptInUse]);

    // Corrección clave: ruta usando el grupo (departments)
    const handlePress = useCallback((item: Department) => {
        router.push({
            pathname: "/(departments)/[id]",
            params: { id: String(item.id), name: item.name },
        });
    }, []);

    return (
        <ScreenShell theme="light">
            <ScreenHeader
                theme="light"
                title="Departamentos"
                logoIcon="business-outline"
                rightActions={[{ icon: "refresh-outline", onPress: fetchDepartments }]}
            />

            {/* Toast inline */}
            {toastMsg && (
                <View style={styles.toastWrap}>
                    <StatusBanner theme="light" type={toastMsg.type} message={toastMsg.text} />
                </View>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statNum}>{departments.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNum, { color: Colors.primary.main }]}>{inUseCount}</Text>
                    <Text style={styles.statLabel}>En uso</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNum, { color: Colors.screen.textMuted }]}>{freeCount}</Text>
                    <Text style={styles.statLabel}>Libres</Text>
                </View>
            </View>

            {/* Buscador */}
            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={16} color={Colors.screen.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar departamento..."
                        placeholderTextColor={Colors.screen.textMuted}
                        value={search}
                        onChangeText={setSearch}
                        maxLength={4}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch("")}>
                            <Ionicons name="close-circle" size={16} color={Colors.screen.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filtros */}
            <View style={styles.filterRow}>
                {(["all", "inUse", "free"] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filterInUse === f && styles.filterChipActive]}
                        onPress={() => setFilterInUse(f)}
                    >
                        <Text style={[styles.filterChipText, filterInUse === f && styles.filterChipTextActive]}>
                            {f === "all" ? "Todos" : f === "inUse" ? "En uso" : "Libres"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Lista */}
            {isLoading && departments.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary.main} />
                    <Text style={styles.loadingText}>Cargando departamentos...</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="cloud-offline-outline" size={44} color={Colors.screen.textMuted} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchDepartments}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : filtered.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="home-outline" size={44} color={Colors.screen.textMuted} />
                    <Text style={styles.emptyTitle}>Sin resultados</Text>
                    <Text style={styles.emptyText}>No hay departamentos con ese filtro.</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={d => String(d.id)}
                    renderItem={({ item }) => (
                        <DeptCard
                            item={item}
                            onToggle={handleToggle}
                            onPress={handlePress}
                            toggling={toggling}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onRefresh={fetchDepartments}
                    refreshing={isLoading}
                />
            )}
        </ScreenShell>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    toastWrap: { paddingHorizontal: 16, paddingTop: 10 },

    statsRow: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 14,
        backgroundColor: Colors.screen.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        overflow: "hidden",
    },
    statItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
    statNum: { fontFamily: "Outfit_700Bold", fontSize: 22, color: Colors.screen.textPrimary },
    statLabel: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: Colors.screen.border, marginVertical: 10 },

    searchRow: { paddingHorizontal: 16, marginTop: 14 },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.screen.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: Colors.screen.textPrimary,
    },

    filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 10 },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Colors.screen.card,
        borderWidth: 1,
        borderColor: Colors.screen.border,
    },
    filterChipActive: { backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted },
    filterChipText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textMuted },
    filterChipTextActive: { color: Colors.primary.dark, fontFamily: "Outfit_600SemiBold" },

    list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 10 },

    card: {
        backgroundColor: Colors.screen.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardAccent: { height: 3, width: "100%" },
    cardInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
    cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    deptIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    cardText: { gap: 5, flex: 1 },
    deptName: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.screen.textPrimary },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: "Outfit_500Medium", fontSize: 11 },
    cardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    chevronBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: Colors.primary.soft,
        alignItems: "center",
        justifyContent: "center",
    },

    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
    loadingText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted },
    errorText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center" },
    emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.screen.textSecondary },
    emptyText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20 },
    retryBtn: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        backgroundColor: Colors.primary.soft,
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.main },
});