import { Stack } from "expo-router";

export default function IncidentsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="create" />
            <Stack.Screen name="edit-incident" />
            <Stack.Screen name="incident-detail" />
        </Stack>
    );
}