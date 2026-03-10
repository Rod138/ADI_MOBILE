import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
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
                    <Ionicons name="notifications" size={18} color={Colors.primary.light} />
                </View>
                <View style={cardStyles.iconLine} />
            </View>
            <View style={cardStyles.content}>
                <View style={cardStyles.topRow}>
                    <Text style={cardStyles.title} numberOfLines={1}>{item.title}</Text>
                    <Text style={cardStyles.time}>{formatDate(item.created_at)}</Text>
                </View>
                <Text style={cardStyles.description} numberOfLines={3}>{item.description}</Text>
                <View style={cardStyles.incRef}>
                    <Ionicons name="link-outline" size={11} color="rgba(255,255,255,0.30)" />
                    <Text style={cardStyles.incRefText}>Incidencia #{item.inc_id}</Text>
                </View>
            </View>
        </View>
    );
}

export default function NotificationsScreen() {
    const { user } = useSession();
    const { notifications, isLoading, error, refetch } = useNotifications(user?.id ?? 0);

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
                            <Ionicons name="notifications" size={16} color={Colors.primary.light} />
                        </View>
                        <Text style={styles.headerTitle}>Notificaciones</Text>
                    </View>
                    <TouchableOpacity onPress={refetch} style={styles.refreshBtn}>
                        <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.55)" />
                    </TouchableOpacity>
                </View>

                {/* Contenido */}
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.light} />
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={44} color="rgba(255,255,255,0.20)" />
                        <Text style={styles.emptyText}>{error}</Text>
                        <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
                            <Text style={styles.retryText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : notifications.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="notifications-off-outline" size={44} color="rgba(255,255,255,0.18)" />
                        <Text style={styles.emptyTitle}>Sin notificaciones</Text>
                        <Text style={styles.emptyText}>Aquí aparecerán las actualizaciones de tus incidencias.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={(n) => String(n.id)}
                        renderItem={({ item }) => <NotificationCard item={item} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onRefresh={refetch}
                        refreshing={isLoading}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        flexDirection: "row",
        gap: 14,
        paddingRight: 4,
        marginBottom: 4,
    },
    iconCol: {
        alignItems: "center",
        width: 40,
    },
    iconCircle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "rgba(59,130,246,0.14)",
        borderWidth: 1, borderColor: "rgba(59,130,246,0.28)",
        alignItems: "center", justifyContent: "center",
    },
    iconLine: {
        flex: 1,
        width: 1.5,
        backgroundColor: "rgba(255,255,255,0.07)",
        marginTop: 6,
    },
    content: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.09)",
        padding: 14,
        marginBottom: 10,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6,
        gap: 8,
    },
    title: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: Colors.white,
        flex: 1,
    },
    time: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: "rgba(255,255,255,0.35)",
    },
    description: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.60)",
        lineHeight: 20,
        marginBottom: 8,
    },
    incRef: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    incRefText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: "rgba(255,255,255,0.28)",
    },
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
        justifyContent: "space-between",
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
    refreshBtn: { padding: 6 },
    listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
    centered: {
        flex: 1, alignItems: "center", justifyContent: "center",
        gap: 10, paddingHorizontal: 40,
    },
    emptyTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 16,
        color: "rgba(255,255,255,0.45)",
    },
    emptyText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.30)",
        textAlign: "center",
        lineHeight: 20,
    },
    retryBtn: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(59,130,246,0.35)",
        backgroundColor: "rgba(59,130,246,0.10)",
    },
    retryText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: Colors.primary.light,
    },
});