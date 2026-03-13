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
                <Ionicons name={icon} size={17} color={Colors.primary.main} />
            </View>
            <View style={rowStyles.textCol}>
                <Text style={rowStyles.label}>{label}</Text>
                <Text style={rowStyles.value}>{value || "—"}</Text>
            </View>
        </View>
    );
}

function ActionRow({ icon, label, onPress, danger = false }: {
    icon: any; label: string; onPress: () => void; danger?: boolean;
}) {
    return (
        <TouchableOpacity style={rowStyles.actionRow} onPress={onPress} activeOpacity={0.7}>
            <View style={[rowStyles.actionIcon, danger && rowStyles.actionIconDanger]}>
                <Ionicons
                    name={icon}
                    size={17}
                    color={danger ? Colors.status.error : Colors.primary.main}
                />
            </View>
            <Text style={[rowStyles.actionLabel, danger && rowStyles.actionLabelDanger]}>
                {label}
            </Text>
            <Ionicons
                name="chevron-forward"
                size={15}
                color={danger ? "#FECACA" : Colors.screen.border}
            />
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
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarRing}>
                        <View style={styles.avatarInner}>
                            <Text style={styles.avatarInitials}>
                                {user ? `${user.name[0]}${user.ap[0]}`.toUpperCase() : "?"}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.fullName}>{fullName}</Text>
                    <View style={styles.roleBadge}>
                        <Ionicons name="shield-checkmark-outline" size={12} color={Colors.primary.main} />
                        <Text style={styles.roleText}>{roleLabel(user?.rol_id ?? 0)}</Text>
                    </View>
                </View>

                {/* Información */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información</Text>
                    <View style={styles.card}>
                        <InfoRow icon="mail-outline" label="Correo" value={user?.email ?? ""} />
                        <View style={styles.divider} />
                        <InfoRow icon="call-outline" label="Teléfono" value={user?.phone ?? ""} />
                        <View style={styles.divider} />
                        <InfoRow
                            icon="home-outline"
                            label="Departamento"
                            value={departmentName || (user?.dep_id ? `Depto. ${user.dep_id}` : "")}
                        />
                    </View>
                </View>

                {/* Ajustes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ajustes</Text>
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
            </ScrollView>
        </ScreenShell>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: "row", alignItems: "center",
        gap: 12, paddingVertical: 14, paddingHorizontal: 16,
    },
    iconCol: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: Colors.screen.chipBlue,
        alignItems: "center", justifyContent: "center",
    },
    textCol: { flex: 1 },
    label: {
        fontFamily: "Outfit_400Regular", fontSize: 11,
        color: Colors.screen.textMuted, letterSpacing: 0.3, marginBottom: 2,
    },
    value: {
        fontFamily: "Outfit_500Medium", fontSize: 14,
        color: Colors.screen.textPrimary,
    },
    actionRow: {
        flexDirection: "row", alignItems: "center",
        gap: 12, paddingVertical: 14, paddingHorizontal: 16,
    },
    actionIcon: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: Colors.screen.chipBlue,
        alignItems: "center", justifyContent: "center",
    },
    actionIconDanger: { backgroundColor: "#FEF2F2" },
    actionLabel: {
        flex: 1, fontFamily: "Outfit_500Medium",
        fontSize: 14, color: Colors.screen.textPrimary,
    },
    actionLabelDanger: { color: Colors.status.error },
});

const styles = StyleSheet.create({
    scroll: { paddingBottom: 32 },
    avatarSection: {
        alignItems: "center", paddingVertical: 28, gap: 10,
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    avatarRing: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: Colors.screen.chipBlue,
        borderWidth: 2, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    avatarInner: {
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: Colors.primary.main,
        alignItems: "center", justifyContent: "center",
    },
    avatarInitials: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 26, color: Colors.white, letterSpacing: 2,
    },
    fullName: {
        fontFamily: "Outfit_700Bold", fontSize: 20,
        color: Colors.screen.textPrimary,
    },
    roleBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
        backgroundColor: Colors.screen.chipBlue,
        borderWidth: 1, borderColor: Colors.screen.border,
    },
    roleText: {
        fontFamily: "Outfit_500Medium", fontSize: 12,
        color: Colors.screen.chipBlueTxt,
    },
    section: { paddingHorizontal: 16, marginTop: 20 },
    sectionTitle: {
        fontFamily: "Outfit_600SemiBold", fontSize: 11,
        color: Colors.screen.textMuted, letterSpacing: 1.5,
        textTransform: "uppercase", marginBottom: 8, marginLeft: 2,
    },
    card: {
        backgroundColor: Colors.screen.card,
        borderRadius: 16, borderWidth: 1,
        borderColor: Colors.screen.border, overflow: "hidden",
        shadowColor: "#1E2D4A", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    },
    divider: { height: 1, backgroundColor: Colors.screen.border, marginHorizontal: 16 },
});