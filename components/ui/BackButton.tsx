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
    const color = isLight ? Colors.primary.main : "rgba(255,255,255,0.65)";

    return (
        <TouchableOpacity onPress={onPress} style={styles.btn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={color} />
            <Text style={[styles.text, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
    },
    text: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
    },
});