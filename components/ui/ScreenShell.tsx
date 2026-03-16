import { Colors } from "@/constants/colors";
import React from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenShellProps {
    children: React.ReactNode;
    theme?: "dark" | "light";
    /** Activa ScrollView interno con padding estándar */
    scroll?: boolean;
    /** Solo aplica en theme="dark": muestra blob bottom-left naranja */
    blobBottomLeft?: boolean;
    scrollPaddingH?: number;
    scrollContentStyle?: ViewStyle;
    style?: ViewStyle;
}

export default function ScreenShell({
    children,
    theme = "dark",
    scroll = false,
    blobBottomLeft = false,
    scrollPaddingH = 24,
    scrollContentStyle,
    style,
}: ScreenShellProps) {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#1C1C1C" : Colors.screen.bg;

    const inner = scroll ? (
        <ScrollView
            contentContainerStyle={[
                isDark ? styles.scrollDark : styles.scrollLight,
                { paddingHorizontal: scrollPaddingH },
                scrollContentStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
    ) : (
        <>{children}</>
    );

    return (
        <View style={[styles.root, { backgroundColor: bgColor }, style]}>
            <StatusBar
                barStyle="light-content"
                backgroundColor="#1C1C1C"
            />

            {/* Blobs — solo en modo dark, verde lima */}
            {isDark && <View style={styles.blobTR} />}
            {isDark && blobBottomLeft && <View style={styles.blobBL} />}

            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <SafeAreaView style={styles.flex1}>
                    {inner}
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    flex1: { flex: 1 },
    scrollDark: {
        paddingTop: 32,
        paddingBottom: 48,
        gap: 28,
    },
    scrollLight: {
        paddingTop: 20,
        paddingBottom: 32,
        gap: 20,
    },
    blobTR: {
        position: "absolute",
        top: -60, right: -70,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: "rgba(132,204,22,0.12)",
    },
    blobBL: {
        position: "absolute",
        bottom: 80, left: -60,
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: "rgba(249,115,22,0.10)",
    },
});