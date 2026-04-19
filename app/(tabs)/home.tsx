import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef } from "react";
import {
    Animated,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Module Card ───────────────────────────────────────────────────────────────

interface ModuleCardProps {
    title: string;
    subtitle: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    accentColor: string;
    accentBg: string;
    accentBorder: string;
    onPress: () => void;
    badge?: string;
}

function ModuleCard({
    title, subtitle, description, icon,
    accentColor, accentBg, accentBorder,
    onPress, badge,
}: ModuleCardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 60, bounciness: 2 }).start();
    const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={styles.moduleCard}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                activeOpacity={1}
            >
                {/* Accent top bar */}
                <View style={[styles.moduleAccentBar, { backgroundColor: accentColor }]} />

                <View style={styles.moduleInner}>
                    {/* Header */}
                    <View style={styles.moduleHeader}>
                        <View style={[styles.moduleIconWrap, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                            <Ionicons name={icon} size={26} color={accentColor} />
                        </View>
                        <View style={styles.moduleTitles}>
                            <View style={styles.moduleTitleRow}>
                                <Text style={styles.moduleTitle}>{title}</Text>
                                {badge && (
                                    <View style={[styles.moduleBadge, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                                        <Text style={[styles.moduleBadgeText, { color: accentColor }]}>{badge}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.moduleSubtitle}>{subtitle}</Text>
                        </View>
                        <View style={[styles.moduleArrow, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                            <Ionicons name="arrow-forward" size={16} color={accentColor} />
                        </View>
                    </View>

                    {/* Description */}
                    <Text style={styles.moduleDescription}>{description}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Quick Action ──────────────────────────────────────────────────────────────

function QuickAction({ icon, label, onPress, color }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    color: string;
}) {
    return (
        <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.75}>
            <View style={[styles.quickActionIcon, { backgroundColor: color + "18", borderColor: color + "30" }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.quickActionLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function HomeScreen() {
    const { user, fullName } = useSession();

    const greetingHour = new Date().getHours();
    const greeting = greetingHour < 12 ? "Buenos días" : greetingHour < 19 ? "Buenas tardes" : "Buenas noches";

    const roleLabel = (rolId: number) => {
        switch (rolId) {
            case 1: return "Residente";
            case 2: return "Tesorero";
            case 3: return "Administrador";
            case 4: return "Tesorero y Admin";
            default: return "Usuario";
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
            <SafeAreaView style={{ flex: 1 }}>

                {/* Top bar */}
                <View style={styles.topBar}>
                    <View style={styles.topLeft}>
                        <View style={styles.logoCircle}>
                            <Image
                                source={require("@/assets/images/logo.png")}
                                style={styles.logoImg}
                                resizeMode="contain"
                            />
                        </View>
                        <View>
                            <Text style={styles.appName}>ADI</Text>
                            <Text style={styles.appTagline}>Administración de Incidencias</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.avatarBtn}
                        onPress={() => router.push("/(tabs)/profile" as any)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.avatarBtnText}>
                            {user ? `${user.name[0]}${user.ap[0]}`.toUpperCase() : "?"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Greeting */}
                    <View style={styles.greetingSection}>
                        <Text style={styles.greetingName} numberOfLines={1}>
                            {greeting}, {user?.name ?? ""}
                        </Text>
                        <View style={styles.greetingBadge}>
                            <Ionicons name="shield-checkmark-outline" size={11} color={Colors.primary.light} />
                            <Text style={styles.greetingBadgeText}>{roleLabel(user?.rol_id ?? 0)}</Text>
                        </View>
                    </View>

                    {/* Section label */}
                    <View style={styles.sectionLabel}>
                        <Text style={styles.sectionLabelText}>FUNCIONES</Text>
                        <View style={styles.sectionLabelLine} />
                    </View>

                    {/* Module cards */}
                    <ModuleCard
                        title="Incidencias"
                        subtitle="Gestión de reportes"
                        description="Reporta, revisa y da seguimiento a los problemas de la torre. Adjunta imágenes y recibe actualizaciones en tiempo real."
                        icon="warning-outline"
                        accentColor={Colors.primary.main}
                        accentBg={Colors.primary.soft}
                        accentBorder={Colors.primary.muted}
                        onPress={() => router.push("/(incidents)" as any)}
                    />

                    <ModuleCard
                        title="Gestión Financiera"
                        subtitle="Contabilidad y pagos"
                        description="Consulta el estado de cuenta de la torre, cuotas de mantenimiento, gastos y reportes financieros."
                        icon="wallet-outline"
                        accentColor={Colors.secondary.main}
                        accentBg={Colors.secondary.soft}
                        accentBorder="#FED7AA"
                        onPress={() => router.push("/(finance)" as any)}
                    />

                    {(user?.rol_id ?? 0) >= 2 && (
                        <ModuleCard
                            title="Departamentos"
                            subtitle="Gestión de departamentos"
                            description="Consulta el estado de cuenta de la torre, cuotas de mantenimiento, gastos y reportes financieros."
                            icon="home-outline"
                            accentColor={Colors.secondary.main}
                            accentBg={Colors.secondary.soft}
                            accentBorder="#FED7AA"
                            onPress={() => router.push("/(departments)" as any)}
                        />
                    )}

                    {/* Footer info */}
                    <View style={styles.footerInfo}>
                        <Ionicons name="business-outline" size={13} color={Colors.screen.textMuted} />
                        <Text style={styles.footerInfoText}>
                            X-CORP ADI v1.0
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },

    // Top bar
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: "#1A1A1A",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.06)",
    },
    topLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },
    logoImg: { width: 30, height: 30 },
    appName: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 17,
        color: "#FFFFFF",
        letterSpacing: 1.5,
    },
    appTagline: {
        fontFamily: "Outfit_400Regular",
        fontSize: 10,
        color: "rgba(255,255,255,0.35)",
        letterSpacing: 0.3,
    },
    avatarBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: Colors.primary.main,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarBtnText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 14,
        color: "#FFFFFF",
        letterSpacing: 1,
    },

    scroll: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 32,
        gap: 14,
    },

    // Greeting
    greetingSection: {
        paddingVertical: 4,
        gap: 4,
    },
    greetingText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 16,
        color: Colors.screen.textMuted,
    },
    greetingName: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 28,
        color: Colors.screen.textPrimary,
        letterSpacing: 0.2,
    },
    greetingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: Colors.primary.soft,
        borderWidth: 1,
        borderColor: Colors.primary.muted,
        marginTop: 4,
    },
    greetingBadgeText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 11,
        color: Colors.primary.dark,
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

    // Module cards
    moduleCard: {
        backgroundColor: Colors.screen.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
    },
    moduleAccentBar: {
        height: 3,
        width: "100%",
    },
    moduleInner: {
        padding: 18,
        gap: 12,
    },
    moduleHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    moduleIconWrap: {
        width: 54,
        height: 54,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    moduleTitles: { flex: 1, gap: 3 },
    moduleTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    moduleTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: Colors.screen.textPrimary,
    },
    moduleBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    moduleBadgeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 9,
        letterSpacing: 0.5,
    },
    moduleSubtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: Colors.screen.textMuted,
    },
    moduleArrow: {
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    moduleDescription: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: Colors.screen.textSecondary,
        lineHeight: 20,
    },
    moduleStats: {
        flexDirection: "row",
        borderTopWidth: 1,
        paddingTop: 12,
        gap: 0,
    },
    moduleStat: {
        flex: 1,
        alignItems: "center",
        gap: 2,
    },
    moduleStatValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
    },
    moduleStatLabel: {
        fontFamily: "Outfit_400Regular",
        fontSize: 10,
        color: Colors.screen.textMuted,
        letterSpacing: 0.3,
    },

    // Quick actions
    quickActions: {
        flexDirection: "row",
        gap: 10,
    },
    quickAction: {
        flex: 1,
        alignItems: "center",
        gap: 8,
        paddingVertical: 16,
        backgroundColor: Colors.screen.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.screen.border,
    },
    quickActionIcon: {
        width: 44,
        height: 44,
        borderRadius: 13,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    quickActionLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: 11,
        color: Colors.screen.textSecondary,
        textAlign: "center",
    },

    // Footer
    footerInfo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingTop: 8,
    },
    footerInfoText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
    },
});