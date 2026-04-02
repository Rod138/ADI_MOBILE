import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Module Card ───────────────────────────────────────────────────────────────

function ModuleCard({
    icon,
    title,
    description,
    onPress,
    accentColor,
    accentBg,
    accentBorder,
    soon = false,
    roleTag,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    onPress?: () => void;
    accentColor: string;
    accentBg: string;
    accentBorder: string;
    soon?: boolean;
    roleTag?: string;
}) {
    return (
        <TouchableOpacity
            style={[styles.moduleCard, soon && styles.moduleCardSoon]}
            onPress={onPress}
            activeOpacity={soon ? 1 : 0.82}
            disabled={soon}
        >
            <View style={[styles.moduleAccentBar, { backgroundColor: accentColor }]} />
            <View style={styles.moduleInner}>
                <View style={styles.moduleHeader}>
                    <View style={[styles.moduleIcon, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                        <Ionicons name={icon} size={22} color={accentColor} />
                    </View>
                    <View style={styles.moduleTitles}>
                        <View style={styles.moduleTitleRow}>
                            <Text style={[styles.moduleTitle, soon && styles.moduleTitleMuted]}>{title}</Text>
                            {soon && (
                                <View style={styles.soonBadge}>
                                    <Text style={styles.soonBadgeText}>PRONTO</Text>
                                </View>
                            )}
                            {roleTag && (
                                <View style={styles.roleBadge}>
                                    <Ionicons name="shield-checkmark-outline" size={9} color={Colors.secondary.main} />
                                    <Text style={styles.roleBadgeText}>{roleTag}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.moduleDescription}>{description}</Text>
                    </View>
                    {!soon && (
                        <View style={[styles.moduleArrow, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                            <Ionicons name="arrow-forward" size={15} color={accentColor} />
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ── Pantalla ──────────────────────────────────────────────────────────────────

export default function FinanceScreen() {
    const { user } = useSession();
    const canManage = (user?.rol_id ?? 0) >= 2;

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.push("/(tabs)/home" as any)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={18} color={Colors.screen.textSecondary} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Gestión Financiera</Text>
                        <Text style={styles.headerSubtitle}>Contabilidad y pagos</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── TODOS LOS USUARIOS ───────────────────────────── */}
                    <View style={styles.sectionLabel}>
                        <Text style={styles.sectionLabelText}>DISPONIBLE AHORA</Text>
                        <View style={styles.sectionLabelLine} />
                    </View>

                    {/* Estado de cuenta */}
                    <ModuleCard
                        icon="bar-chart-outline"
                        title="Estado de cuenta"
                        description="Balance general del condominio con ingresos, egresos y saldo disponible."
                        accentColor="#7C3AED"
                        accentBg="#F5F3FF"
                        accentBorder="#DDD6FE"
                        onPress={() => router.push("/(finance)/balance" as any)}
                    />

                    {/* Mis cuotas */}
                    <ModuleCard
                        icon="receipt-outline"
                        title="Mis cuotas"
                        description="Consulta y sube el comprobante de tu cuota de mantenimiento del mes actual."
                        accentColor={Colors.primary.main}
                        accentBg={Colors.primary.soft}
                        accentBorder={Colors.primary.muted}
                        onPress={() => router.push("/(finance)/recipes" as any)}
                    />

                    {/* Gastos del condominio */}
                    <ModuleCard
                        icon="trending-down-outline"
                        title="Gastos del condominio"
                        description={
                            canManage
                                ? "Registra y consulta los egresos del condominio con evidencia fotográfica."
                                : "Consulta los egresos registrados por la administración."
                        }
                        accentColor={Colors.secondary.main}
                        accentBg={Colors.secondary.soft}
                        accentBorder="#FED7AA"
                        roleTag={canManage ? "Admin / Tesorero" : undefined}
                        onPress={() => router.push("/(finance)/expenses" as any)}
                    />

                    {/* ── SOLO ADMIN/TESORERO ──────────────────────────── */}
                    {canManage && (
                        <>
                            <View style={styles.sectionLabel}>
                                <Text style={styles.sectionLabelText}>ADMINISTRACIÓN</Text>
                                <View style={styles.sectionLabelLine} />
                            </View>

                            {/* Tablón de cuotas */}
                            <ModuleCard
                                icon="people-outline"
                                title="Cuotas de residentes"
                                description="Revisa y valida los comprobantes de pago de cuota mensual de todos los departamentos."
                                accentColor={Colors.primary.main}
                                accentBg={Colors.primary.soft}
                                accentBorder={Colors.primary.muted}
                                roleTag="Admin / Tesorero"
                                onPress={() => router.push("/(finance)/admin-recipes" as any)}
                            />

                            {/* Cuota mensual + Fondo inicial */}
                            <ModuleCard
                                icon="calculator-outline"
                                title="Configuración financiera"
                                description="Establece el fondo inicial de la torre y define la cuota de mantenimiento por mes."
                                accentColor="#0891B2"
                                accentBg="#F0F9FF"
                                accentBorder="#BAE6FD"
                                roleTag="Admin / Tesorero"
                                onPress={() => router.push("/(finance)/admin-quota" as any)}
                            />

                            {/* Reportes */}
                            <ModuleCard
                                icon="trending-up-outline"
                                title="Reportes financieros"
                                description="Análisis anual de ingresos, egresos, tasa de cobranza y flujo neto mensual."
                                accentColor="#059669"
                                accentBg="#ECFDF5"
                                accentBorder="#A7F3D0"
                                roleTag="Admin / Tesorero"
                                onPress={() => router.push("/(finance)/reports" as any)}
                            />
                        </>
                    )}

                    <View style={styles.footerNote}>
                        <Ionicons name="information-circle-outline" size={13} color={Colors.screen.textMuted} />
                        <Text style={styles.footerNoteText}>
                            Los datos se actualizan en tiempo real desde la base de datos.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },

    header: {
        flexDirection: "row", alignItems: "center",
        gap: 10, paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: Colors.screen.textPrimary },
    headerSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },

    scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40, gap: 10 },

    sectionLabel: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    sectionLabelText: {
        fontFamily: "Outfit_700Bold", fontSize: 10,
        color: Colors.screen.textMuted, letterSpacing: 1.8,
    },
    sectionLabelLine: { flex: 1, height: 1, backgroundColor: Colors.screen.border },

    moduleCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border, overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    moduleCardSoon: { opacity: 0.55 },
    moduleAccentBar: { height: 3, width: "100%" },
    moduleInner: { padding: 16 },
    moduleHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    moduleIcon: {
        width: 44, height: 44, borderRadius: 13, borderWidth: 1.5,
        alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
    },
    moduleTitles: { flex: 1, gap: 4 },
    moduleTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    moduleTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.screen.textPrimary },
    moduleTitleMuted: { color: Colors.screen.textSecondary },
    moduleDescription: {
        fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.screen.textMuted, lineHeight: 18,
    },
    soonBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
    },
    soonBadgeText: {
        fontFamily: "Outfit_700Bold", fontSize: 8,
        color: Colors.screen.textMuted, letterSpacing: 0.8,
    },
    roleBadge: {
        flexDirection: "row", alignItems: "center", gap: 3,
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
        backgroundColor: Colors.secondary.soft, borderWidth: 1, borderColor: "#FED7AA",
    },
    roleBadgeText: {
        fontFamily: "Outfit_700Bold", fontSize: 8,
        color: Colors.secondary.main, letterSpacing: 0.5,
    },
    moduleArrow: {
        width: 32, height: 32, borderRadius: 9, borderWidth: 1,
        alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
    },

    footerNote: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, marginTop: 8,
    },
    footerNoteText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
});