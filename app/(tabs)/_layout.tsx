import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import {
    NotificationsProvider,
    useNotificationsContext,
} from "@/context/NotificationsContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

// ── Badge numérico sobre el ícono ─────────────────────────────────────────────

function UnreadBadge({ count }: { count: number }) {
    if (count === 0) return null;
    return (
        <View style={badge.wrap}>
            <Text style={badge.text}>{count > 99 ? "99+" : String(count)}</Text>
        </View>
    );
}

// ── Ícono de la pestaña Avisos — consume el contexto compartido ───────────────

function NotificationsTabIcon({ color, size }: { color: string; size: number }) {
    const { unreadCount } = useNotificationsContext();
    return (
        <View>
            <Ionicons
                name={unreadCount > 0 ? "notifications" : "notifications-outline"}
                size={size}
                color={color}
            />
            <UnreadBadge count={unreadCount} />
        </View>
    );
}

// ── Navegador de tabs (debe vivir DENTRO del Provider) ────────────────────────

function TabsNavigator() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.screen.card,
                    borderTopColor: Colors.screen.border,
                    borderTopWidth: 1,
                    height: 68,
                    paddingBottom: 12,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: Colors.primary.main,
                tabBarInactiveTintColor: Colors.screen.textMuted,
                tabBarLabelStyle: {
                    fontFamily: "Outfit_500Medium",
                    fontSize: 10,
                    letterSpacing: 0.4,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Inicio",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Avisos",
                    tabBarIcon: ({ color, size }) => (
                        <NotificationsTabIcon color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Perfil",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen name="change-password" options={{ href: null }} />
            <Tabs.Screen name="change-phone" options={{ href: null }} />
        </Tabs>
    );
}

// ── Layout raíz ───────────────────────────────────────────────────────────────

export default function TabsLayout() {
    const { user } = useSession();

    // El Provider envuelve TODO el árbol de tabs.
    // Así NotificationsTabIcon y notifications.tsx comparten el mismo estado.
    return (
        <NotificationsProvider userId={user?.id}>
            <TabsNavigator />
        </NotificationsProvider>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const badge = StyleSheet.create({
    wrap: {
        position: "absolute",
        top: -4,
        right: -8,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.status.error,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: Colors.screen.card,
    },
    text: {
        fontFamily: "Outfit_700Bold",
        fontSize: 8,
        color: "#fff",
        lineHeight: 11,
    },
});