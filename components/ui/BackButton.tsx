/**
 * BackButton
 * ----------
 * Botón de navegación hacia atrás con ícono + texto.
 *
 * Uso:
 *   <BackButton onPress={() => router.back()} />
 *   <BackButton label="Volver al perfil" onPress={() => router.back()} />
 */

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface BackButtonProps {
    onPress: () => void;
    label?: string;
}

export default function BackButton({ onPress, label = "Volver" }: BackButtonProps) {
    return (
        <TouchableOpacity onPress={onPress} style={styles.btn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.65)" />
            <Text style={styles.text}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
    },
    text: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "rgba(255,255,255,0.55)",
    },
});