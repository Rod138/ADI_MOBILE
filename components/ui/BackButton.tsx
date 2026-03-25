import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface BackButtonProps {
    onPress: () => void;
    label?: string;
    theme?: "dark" | "light";
}

export default function BackButton({
    onPress,
    label = "Volver",
    theme = "dark",
}: BackButtonProps) {
    const isLight = theme === "light";
    const color = isLight ? Colors.primary.dark : "rgba(255,255,255,0.75)";
    const bg = isLight ? Colors.primary.soft : "rgba(255,255,255,0.08)";
    const border = isLight ? Colors.primary.muted : "rgba(255,255,255,0.10)";

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.btn, { backgroundColor: bg, borderColor: border }]}
            activeOpacity={0.7}
        >
            <Ionicons name="chevron-back" size={16} color={color} />
            <Text style={[styles.text, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
    },
    text: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
    },
});