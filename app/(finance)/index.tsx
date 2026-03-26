import { Colors } from "@/constants/colors";
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

// ── Feature preview card ──────────────────────────────────────────────────────

function FeatureCard({ icon, title, description, soon = false }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    soon?: boolean;
}) {
    return (
        <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
                <Ionicons name={icon} size={22} color={Colors.secondary.main} />
            </View>
            <View style={styles.featureTexts}>
                <View style={styles.featureTitleRow}>
                    <Text style={styles.featureTitle}>{title}</Text>
                    {soon && (
                        <View style={styles.soonBadge}>
                            <Text style={styles.soonBadgeText}>PRONTO</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.featureDescription}>{description}</Text>
            </View>
        </View>
    );
}

// ── Pantalla ──────────────────────────────────────────────────────────────────

export default function FinanceScreen() {
    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
            <SafeAreaView style={{ flex: 1 }}>

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
                            <Text style={styles.headerTitle}>Gestión Financiera</Text>
                            <Text style={styles.headerSubtitle}>Contabilidad y pagos</Text>
                        </View>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero */}
                    <View style={styles.heroCard}>
                        <View style={styles.heroIconBg}>
                            <Ionicons name="wallet" size={40} color={Colors.secondary.main} />
                        </View>
                        <Text style={styles.heroTitle}>Módulo Financiero</Text>
                        <Text style={styles.heroSubtitle}>En desarrollo</Text>
                        <Text style={styles.heroDescription}>
                            Este módulo está siendo construido. Pronto podrás gestionar las finanzas del condominio desde aquí.
                        </Text>
                        <View style={styles.heroBadge}>
                            <View style={styles.heroBadgeDot} />
                            <Text style={styles.heroBadgeText}>Desarrollo activo · X-CORP</Text>
                        </View>
                    </View>

                    {/* Upcoming features */}
                    <View style={styles.sectionLabel}>
                        <Text style={styles.sectionLabelText}>CARACTERÍSTICAS PLANIFICADAS</Text>
                        <View style={styles.sectionLabelLine} />
                    </View>

                    <View style={styles.featuresList}>
                        <FeatureCard
                            icon="receipt-outline"
                            title="Estado de cuenta"
                            description="Consulta el balance general del condominio con historial de movimientos."
                            soon
                        />
                        <FeatureCard
                            icon="card-outline"
                            title="Cuotas de mantenimiento"
                            description="Visualiza y registra el pago de cuotas mensuales de cada departamento."
                            soon
                        />
                        <FeatureCard
                            icon="trending-up-outline"
                            title="Reportes financieros"
                            description="Genera reportes de ingresos, egresos y presupuesto por período."
                            soon
                        />
                        <FeatureCard
                            icon="construct-outline"
                            title="Gastos de incidencias"
                            description="Seguimiento automático de costos relacionados a incidencias resueltas."
                            soon
                        />
                        <FeatureCard
                            icon="document-text-outline"
                            title="Comprobantes"
                            description="Adjunta y gestiona comprobantes de pago y facturas del condominio."
                            soon
                        />
                    </View>

                    <View style={styles.footerNote}>
                        <Ionicons name="information-circle-outline" size={14} color={Colors.screen.textMuted} />
                        <Text style={styles.footerNoteText}>
                            Las funcionalidades se habilitarán progresivamente.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },

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
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: "#FFFFFF" },
    headerSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.35)" },

    scroll: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 40,
        gap: 14,
    },

    // Hero card
    heroCard: {
        backgroundColor: Colors.screen.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        padding: 28,
        alignItems: "center",
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
    },
    heroIconBg: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: Colors.secondary.soft,
        borderWidth: 2,
        borderColor: "#FED7AA",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    heroTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 22,
        color: Colors.screen.textPrimary,
        textAlign: "center",
    },
    heroSubtitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: Colors.secondary.main,
    },
    heroDescription: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: Colors.screen.textSecondary,
        textAlign: "center",
        lineHeight: 22,
    },
    heroBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Colors.status.successBg,
        borderWidth: 1,
        borderColor: Colors.status.successBorder,
    },
    heroBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.status.success,
    },
    heroBadgeText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 11,
        color: Colors.status.success,
    },

    // Section label
    sectionLabel: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
    },
    sectionLabelText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 10,
        color: Colors.screen.textMuted,
        letterSpacing: 1.8,
    },
    sectionLabelLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.screen.border,
    },

    // Features list
    featuresList: {
        backgroundColor: Colors.screen.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        overflow: "hidden",
    },
    featureCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.screen.border,
    },
    featureIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: Colors.secondary.soft,
        borderWidth: 1,
        borderColor: "#FED7AA",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    featureTexts: { flex: 1, gap: 4 },
    featureTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    featureTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: Colors.screen.textPrimary,
    },
    soonBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
        backgroundColor: Colors.secondary.soft,
        borderWidth: 1,
        borderColor: "#FED7AA",
    },
    soonBadgeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 8,
        color: Colors.secondary.main,
        letterSpacing: 0.8,
    },
    featureDescription: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: Colors.screen.textMuted,
        lineHeight: 18,
    },

    // Footer note
    footerNote: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingTop: 4,
    },
    footerNoteText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
    },
});