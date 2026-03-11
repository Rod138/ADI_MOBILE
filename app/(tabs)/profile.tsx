import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import supabase from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <View style={rowStyles.row}>
            <View style={rowStyles.iconCol}>
                <Ionicons name={icon} size={18} color={Colors.primary.light} />
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
        <TouchableOpacity style={rowStyles.actionRow} onPress={onPress} activeOpacity={0.75}>
            <View style={[rowStyles.actionIcon, danger && rowStyles.actionIconDanger]}>
                <Ionicons name={icon} size={18} color={danger ? Colors.status.error : Colors.primary.light} />
            </View>
            <Text style={[rowStyles.actionLabel, danger && rowStyles.actionLabelDanger]}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={danger ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.25)"} />
        </TouchableOpacity>
    );
}

export default function ProfileScreen() {
    const { user, fullName, setUser } = useSession();
    const { logout } = useAuth();
    const [departmentName, setDepartmentName] = useState<string>("");

    useEffect(() => {
        if (user?.dep_id) {
            supabase
                .from("departments")
                .select("name")
                .eq("id", user.dep_id)
                .single()
                .then(({ data }) => {
                    if (data?.name) setDepartmentName(data.name);
                });
        }
    }, [user?.dep_id]);

    const handleLogout = async () => {
        await logout();
        await setUser(null);
        router.replace("/login");
    };

    // Mapeo completo según tabla roles: 1=residente, 2=tesorero, 3=admin, 4=tesorero y admin
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
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />
            <View style={styles.blobTR} />
            <View style={styles.blobBL} />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoCircle}>
                            <Ionicons name="person" size={16} color={Colors.primary.light} />
                        </View>
                        <Text style={styles.headerTitle}>Perfil</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                            <Ionicons name="shield-outline" size={12} color={Colors.primary.light} />
                            <Text style={styles.roleText}>{roleLabel(user?.rol_id ?? 0)}</Text>
                        </View>
                    </View>

                    {/* Info */}
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

                    {/* Acciones */}
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
            </SafeAreaView>
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    iconCol: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: "rgba(59,130,246,0.12)",
        alignItems: "center", justifyContent: "center",
    },
    textCol: { flex: 1 },
    label: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: "rgba(255,255,255,0.38)",
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    value: {
        fontFamily: "Outfit_500Medium",
        fontSize: 14,
        color: Colors.white,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    actionIcon: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: "rgba(59,130,246,0.12)",
        alignItems: "center", justifyContent: "center",
    },
    actionIconDanger: { backgroundColor: "rgba(220,38,38,0.12)" },
    actionLabel: {
        flex: 1,
        fontFamily: "Outfit_500Medium",
        fontSize: 14,
        color: Colors.white,
    },
    actionLabelDanger: { color: Colors.status.error },
});

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0C1F5C" },
    blobTR: {
        position: "absolute", top: -60, right: -70,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: "rgba(59,130,246,0.12)",
    },
    blobBL: {
        position: "absolute", bottom: 80, left: -60,
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: "rgba(109,40,217,0.10)",
    },
    safeArea: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.07)",
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoCircle: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: "rgba(59,130,246,0.15)",
        borderWidth: 1, borderColor: "rgba(59,130,246,0.3)",
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: Colors.white,
    },
    scrollContent: { paddingBottom: 32 },
    avatarSection: {
        alignItems: "center",
        paddingVertical: 28,
        gap: 10,
    },
    avatarRing: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: "rgba(59,130,246,0.14)",
        borderWidth: 2, borderColor: "rgba(59,130,246,0.35)",
        alignItems: "center", justifyContent: "center",
    },
    avatarInner: {
        width: 76, height: 76, borderRadius: 38,
        backgroundColor: Colors.primary.main,
        alignItems: "center", justifyContent: "center",
    },
    avatarInitials: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 28,
        color: Colors.white,
        letterSpacing: 2,
    },
    fullName: {
        fontFamily: "Outfit_700Bold",
        fontSize: 20,
        color: Colors.white,
    },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: "rgba(59,130,246,0.12)",
        borderWidth: 1,
        borderColor: "rgba(59,130,246,0.28)",
    },
    roleText: {
        fontFamily: "Outfit_500Medium",
        fontSize: 12,
        color: Colors.primary.light,
    },
    section: { paddingHorizontal: 16, marginBottom: 16 },
    sectionTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: "rgba(255,255,255,0.35)",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginBottom: 10,
        marginLeft: 4,
    },
    card: {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.09)",
        overflow: "hidden",
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.06)",
        marginHorizontal: 16,
    },
});