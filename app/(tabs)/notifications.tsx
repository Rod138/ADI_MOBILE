import { ScreenHeader, ScreenShell } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator, FlatList, StyleSheet,
    Text, TouchableOpacity, View,
} from "react-native";

function formatDate(iso: string) {
    const d = new Date(iso);
    const diffHrs = (Date.now() - d.getTime()) / 3600000;
    if (diffHrs < 1) return "Hace unos minutos";
    if (diffHrs < 24) return `Hace ${Math.floor(diffHrs)}h`;
    if (diffHrs < 48) return "Ayer";
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function NotificationCard({ item }: { item: any }) {
    return (
        <View style={cardStyles.card}>
            <View style={cardStyles.iconCol}>
                <View style={cardStyles.iconCircle}>
                    <Ionicons name="notifications" size={16} color={Colors.primary.main} />
                </View>
                <View style={cardStyles.line} />
            </View>
            <View style={cardStyles.content}>
                <View style={cardStyles.topRow}>
                    <Text style={cardStyles.title} numberOfLines={1}>{item.title}</Text>
                    <Text style={cardStyles.time}>{formatDate(item.created_at)}</Text>
                </View>
                <Text style={cardStyles.description} numberOfLines={3}>{item.description}</Text>
                <View style={cardStyles.ref}>
                    <Ionicons name="link-outline" size={11} color={Colors.screen.textMuted} />
                    <Text style={cardStyles.refText}>Incidencia #{item.inc_id}</Text>
                </View>
            </View>
        </View>
    );
}

export default function NotificationsScreen() {
    const { user } = useSession();
    const { notifications, isLoading, error, refetch } = useNotifications(user?.id ?? 0);

    return (
        <ScreenShell theme="light">
            <ScreenHeader
                theme="light"
                title="Notificaciones"
                logoIcon="notifications"
                rightActions={[{ icon: "refresh-outline", onPress: refetch }]}
            />

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary.light} />
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="cloud-offline-outline" size={44} color={Colors.screen.textMuted} />
                    <Text style={styles.emptyText}>{error}</Text>
                    <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="notifications-off-outline" size={44} color={Colors.screen.textMuted} />
                    <Text style={styles.emptyTitle}>Sin notificaciones</Text>
                    <Text style={styles.emptyText}>Aquí aparecerán las actualizaciones de tus incidencias.</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(n) => String(n.id)}
                    renderItem={({ item }) => <NotificationCard item={item} />}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onRefresh={refetch}
                    refreshing={isLoading}
                />
            )}
        </ScreenShell>
    );
}

const cardStyles = StyleSheet.create({
    card: { flexDirection: "row", gap: 12, paddingRight: 4, marginBottom: 2 },
    iconCol: { alignItems: "center", width: 38 },
    iconCircle: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: Colors.screen.chipBlue,
        borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    line: { flex: 1, width: 1, backgroundColor: Colors.screen.border, marginTop: 4 },
    content: {
        flex: 1, backgroundColor: Colors.screen.card,
        borderRadius: 14, borderWidth: 1, borderColor: Colors.screen.border,
        padding: 14, marginBottom: 10,
        shadowColor: "#1E2D4A", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    topRow: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 6, gap: 8,
    },
    title: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textPrimary, flex: 1 },
    time: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    description: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: Colors.screen.textSecondary, lineHeight: 20, marginBottom: 8,
    },
    ref: { flexDirection: "row", alignItems: "center", gap: 4 },
    refText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
});

const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
    emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.screen.textSecondary },
    emptyText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20 },
    retryBtn: {
        marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
        borderWidth: 1, borderColor: Colors.screen.border, backgroundColor: Colors.screen.chipBlue,
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.main },
    list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
});