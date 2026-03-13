import { Colors } from "@/constants/colors";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

interface SectionCardProps {
    children: React.ReactNode;
    theme?: "dark" | "light";
    /** Línea shimmer en el top — solo relevante en dark. Default: true */
    shimmer?: boolean;
    padding?: number;
    paddingTop?: number;
    style?: ViewStyle;
    contentStyle?: ViewStyle;
}

export default function SectionCard({
    children,
    theme = "dark",
    shimmer = true,
    padding = 20,
    paddingTop = 24,
    style,
    contentStyle,
}: SectionCardProps) {
    const isLight = theme === "light";

    return (
        <View style={[isLight ? styles.cardLight : styles.cardDark, style]}>
            {!isLight && shimmer && <View style={styles.shimmer} />}
            <View style={[styles.content, { padding, paddingTop }, contentStyle]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardDark: {
        borderRadius: 24,
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
    cardLight: {
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: Colors.screen.card,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        shadowColor: "#1E2D4A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    shimmer: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    content: {
        gap: 0,
    },
});