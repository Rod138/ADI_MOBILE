import { ScreenHeader, ScreenShell } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import supabase from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <View style={rowStyles.row}>
            <View style={rowStyles.iconCol}>
                <Ionicons name={icon} size={16} color={Colors.primary.main} />
            </View>
            <View style={rowStyles.textCol}>
                <Text style={rowStyles.label}>{label}</Text>
                <Text style={rowStyles.value}>{value || "—"}</Text>
            </View>
        </View>
    );
}

function ActionRow({ icon, label, onPress, danger = false, chevron = true }: {
    icon: any; label: string; onPress: () => void; danger?: boolean; chevron?: boolean;
}) {
    return (
        <TouchableOpacity style={rowStyles.actionRow} onPress={onPress} activeOpacity={0.7}>
            <View style={[rowStyles.actionIcon, danger && rowStyles.actionIconDanger]}>
                <Ionicons
                    name={icon}
                    size={16}
                    color={danger ? Colors.status.error : Colors.primary.main}
                />
            </View>
            <Text style={[rowStyles.actionLabel, danger && rowStyles.actionLabelDanger]}>
                {label}
            </Text>
            {chevron && (
                <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={danger ? "#FECACA" : Colors.screen.border}
                />
            )}
        </TouchableOpacity>
    );
}

export default function ProfileScreen() {
    const { user, fullName, setUser } = useSession();
    const { logout } = useAuth();
    const [departmentName, setDepartmentName] = useState("");

    useEffect(() => {
        if (user?.dep_id) {
            supabase
                .from("departments").select("name")
                .eq("id", user.dep_id).single()
                .then(({ data }) => { if (data?.name) setDepartmentName(data.name); });
        }
    }, [user?.dep_id]);

    const handleLogout = async () => {
        await logout();
        await setUser(null);
        router.replace("/login");
    };

    const roleLabel = (rolId: number) => {
        switch (rolId) {
            case 1: return "Residente";
            case 2: return "Tesorero";
            case 3: return "Administrador";
            case 4: return "Tesorero y Admin";
            default: return "Sin rol";
        }
    };

    return (
        <ScreenShell theme="light">
            <ScreenHeader theme="light" title="Perfil" logoIcon="person" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Avatar section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarRing}>
                            <Text style={styles.avatarInitials}>
                                {user ? `${user.name[0]}${user.ap[0]}`.toUpperCase() : "?"}
                            </Text>
                        </View>
                        {/* Online dot */}
                        <View style={styles.onlineDot} />
                    </View>
                    <Text style={styles.fullName}>{fullName}</Text>
                    <View style={styles.roleBadge}>
                        <Ionicons name="shield-checkmark-outline" size={12} color={Colors.primary.dark} />
                        <Text style={styles.roleText}>{roleLabel(user?.rol_id ?? 0)}</Text>
                    </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>Depto.</Text>
                        <Text style={styles.statLabel}>{departmentName || (user?.dep_id ? `#${user.dep_id}` : "—")}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{roleLabel(user?.rol_id ?? 0)}</Text>
                        <Text style={styles.statLabel}>Rol</Text>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información de cuenta</Text>
                    <View style={styles.card}>
                        <InfoRow icon="mail-outline" label="Correo electrónico" value={user?.email ?? ""} />
                        <View style={styles.divider} />
                        <InfoRow icon="call-outline" label="Teléfono" value={user?.phone ?? ""} />
                    </View>
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Configuración</Text>
                    <View style={styles.card}>
                        <ActionRow
                            icon="key-outline"
                            label="Cambiar contraseña"
                            onPress={() => router.push("/(tabs)/change-password" as any)}
                        />
                        <View style={styles.divider} />
                        <ActionRow
                            icon="phone-portrait-outline"
                            label="Cambiar teléfono"
                            onPress={() => router.push("/(tabs)/change-phone" as any)}
                        />
                    </View>
                </View>

                {/* Logout */}
                <View style={styles.section}>
                    <View style={styles.card}>
                        <ActionRow
                            icon="log-out-outline"
                            label="Cerrar sesión"
                            onPress={handleLogout}
                            danger
                        />
                    </View>
                </View>

                <Text style={styles.version}>ADI v1.0.0 · X-CORP</Text>
            </ScrollView>
        </ScreenShell>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    iconCol: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary.soft,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.primary.muted,
    },
    textCol: { flex: 1 },
    label: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
        marginBottom: 2,
    },
    value: {
        fontFamily: "Outfit_500Medium",
        fontSize: 14,
        color: Colors.screen.textPrimary,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary.soft,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.primary.muted,
    },
    actionIconDanger: {
        backgroundColor: Colors.status.errorBg,
        borderColor: Colors.status.errorBorder,
    },
    actionLabel: {
        flex: 1,
        fontFamily: "Outfit_500Medium",
        fontSize: 14,
        color: Colors.screen.textPrimary,
    },
    actionLabelDanger: { color: Colors.status.error },
});

const styles = StyleSheet.create({
    scroll: { paddingBottom: 40 },

    // Avatar
    avatarSection: {
        alignItems: "center",
        paddingVertical: 28,
        paddingHorizontal: 20,
        gap: 10,
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.screen.border,
    },
    avatarWrapper: {
        position: "relative",
    },
    avatarRing: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: Colors.primary.main,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: Colors.primary.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    avatarInitials: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 28,
        color: Colors.white,
        letterSpacing: 2,
    },
    onlineDot: {
        position: "absolute",
        bottom: 4,
        right: 4,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: Colors.status.success,
        borderWidth: 2.5,
        borderColor: Colors.screen.card,
    },
    fullName: {
        fontFamily: "Outfit_700Bold",
        fontSize: 20,
        color: Colors.screen.textPrimary,
    },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: Colors.primary.soft,
        borderWidth: 1,
        borderColor: Colors.primary.muted,
    },
    roleText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: Colors.primary.dark,
    },

    // Stats
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
    statCard: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 14,
    },
    statValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: 14,
        color: Colors.screen.textPrimary,
    },
    statLabel: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.screen.border,
        marginVertical: 10,
    },

    // Sections
    section: { paddingHorizontal: 16, marginTop: 18 },
    sectionTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 11,
        color: Colors.screen.textMuted,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        marginBottom: 8,
        marginLeft: 2,
    },
    card: {
        backgroundColor: Colors.screen.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.screen.border,
        marginHorizontal: 16,
    },

    version: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
        textAlign: "center",
        marginTop: 24,
    },
});