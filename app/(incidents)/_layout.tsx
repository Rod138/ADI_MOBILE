import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function IncidentsLayout() {
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
                    title: "Crear",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="add-circle-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen name="edit-incident" options={{ href: null }} />
            <Tabs.Screen name="incident-detail" options={{ href: null }} />
        </Tabs>
    );
}