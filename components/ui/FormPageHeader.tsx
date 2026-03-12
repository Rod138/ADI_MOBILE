/**
 * FormPageHeader
 * --------------
 * Cabecera estética para pantallas de formulario secundario.
 * Renderiza:
 *  - Anillo exterior con ícono central
 *  - Título grande
 *  - Subtítulo / texto descriptivo opcional
 *
 * Uso:
 *   <FormPageHeader
 *     icon="key-outline"
 *     title="Cambiar contraseña"
 *   />
 *
 *   <FormPageHeader
 *     icon="phone-portrait-outline"
 *     title="Cambiar teléfono"
 *     subtitle="Actual: 5512345678"
 *   />
 */

import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface FormPageHeaderProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
}

export default function FormPageHeader({ icon, title, subtitle }: FormPageHeaderProps) {
    return (
        <View style={styles.container}>
            {/* Anillo con ícono */}
            <View style={styles.iconRing}>
                <View style={styles.iconInner}>
                    <Ionicons name={icon} size={28} color={Colors.primary.light} />
                </View>
            </View>

            {/* Título */}
            <Text style={styles.title}>{title}</Text>

            {/* Subtítulo opcional */}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        gap: 14,
    },
    iconRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(59,130,246,0.12)",
        borderWidth: 1.5,
        borderColor: "rgba(59,130,246,0.28)",
        alignItems: "center",
        justifyContent: "center",
    },
    iconInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 28,
        color: "#FFFFFF",
        letterSpacing: 0.2,
        textAlign: "center",
    },
    subtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.38)",
    },
});