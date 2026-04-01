import { Stack } from "expo-router";

export default function FinanceLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="recipes" />
            <Stack.Screen name="expenses" />
            <Stack.Screen name="admin-recipes" />
            <Stack.Screen name="balance" />
            <Stack.Screen name="admin-quota" />
        </Stack>
    );
}