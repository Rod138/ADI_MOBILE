import { useSession } from "@/context/AuthContext";
import { Redirect, Stack } from "expo-router";

export default function DepartmentsLayout() {
    const { user } = useSession();

    if (!user || user.rol_id < 2) {
        return <Redirect href={"/(tabs)/home"} />;
    }
    return (
        <Stack screenOptions={{ headerShown: false }} />
    );
}