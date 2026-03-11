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
                        backgroundColor: "#0C1F5C",
                        borderTopColor: "rgba(255,255,255,0.08)",
                        borderTopWidth: 1,
                        height: 64,
                        paddingBottom: 10,
                        paddingTop: 8,
                    },
                    tabBarActiveTintColor: Colors.primary.light,
                    tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
                    tabBarLabelStyle: {
                        fontFamily: "Outfit_500Medium",
                        fontSize: 10,
                        letterSpacing: 0.5,
                    },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Incidencias",
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="list-outline" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="create"
                    options={{
                        title: "Reportar",
                        tabBarIcon: ({ color }) => (
                            <Ionicons name="add-circle-outline" size={28} color={color} />
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
                {/* Ocultas de la tab bar — solo accesibles por navegación */}
                <Tabs.Screen
                    name="notifications"
                    options={{ href: null }}
                />
                <Tabs.Screen
                    name="change-password"
                    options={{ href: null }}
                />
                <Tabs.Screen
                    name="change-phone"
                    options={{ href: null }}
                />
            </Tabs>
        </AuthProvider>
    );
}