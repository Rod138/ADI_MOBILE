import { Colors } from "@/constants/colors";
import { AuthProvider } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <AuthProvider>
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
                            <Ionicons name="notifications-outline" size={size} color={color} />
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
                {/* Páginas ocultas de la tab bar */}
                <Tabs.Screen name="change-password" options={{ href: null }} />
                <Tabs.Screen name="change-phone" options={{ href: null }} />
            </Tabs>
        </AuthProvider>
    );
}