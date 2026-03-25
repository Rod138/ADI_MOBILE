import { Colors } from "@/constants/colors";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

interface SectionCardProps {
    children: React.ReactNode;
    theme?: "dark" | "light";
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
        borderColor: "rgba(255,255,255,0.10)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.40,
        shadowRadius: 28,
        elevation: 18,
    },
    cardLight: {
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: Colors.screen.card,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    shimmer: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.14)",
    },
    content: {
        gap: 0,
    },
});