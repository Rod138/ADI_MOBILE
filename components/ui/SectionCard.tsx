/**
 * SectionCard
 * -----------
 * Glass card reutilizable que envuelve secciones de formularios y contenido.
 * Incluye:
 *  - Efecto "glass" (fondo semi-transparente + borde sutil)
 *  - Línea shimmer opcional en la parte superior
 *  - Padding interno estándar configurable
 *
 * Uso:
 *   <SectionCard>
 *     <InputField ... />
 *     <PrimaryButton ... />
 *   </SectionCard>
 *
 *   <SectionCard shimmer={false} padding={16}>
 *     <InfoRow ... />
 *   </SectionCard>
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

interface SectionCardProps {
    children: React.ReactNode;
    /** Muestra la línea shimmer en el top. Default: true */
    shimmer?: boolean;
    /** Padding interno horizontal y vertical. Default: 24 */
    padding?: number;
    /** Padding-top interno (por si se necesita diferente al horizontal). Default: 28 */
    paddingTop?: number;
    /** Estilo extra para el contenedor externo */
    style?: ViewStyle;
    /** Estilo extra para el contenedor interno (después del shimmer) */
    contentStyle?: ViewStyle;
}

export default function SectionCard({
    children,
    shimmer = true,
    padding = 24,
    paddingTop = 28,
    style,
    contentStyle,
}: SectionCardProps) {
    return (
        <View style={[styles.card, style]}>
            {shimmer && <View style={styles.shimmer} />}
            <View
                style={[
                    styles.content,
                    { padding, paddingTop },
                    contentStyle,
                ]}
            >
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.11)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.45,
        shadowRadius: 32,
        elevation: 20,
    },
    shimmer: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    content: {
        gap: 0,
    },
});