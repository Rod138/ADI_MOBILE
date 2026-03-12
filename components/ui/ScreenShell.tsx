/**
 * ScreenShell
 * -----------
 * Wrapper base para todas las pantallas de la app.
 * Incluye:
 *  - Fondo azul institucional (#0C1F5C)
 *  - Blobs decorativos (top-right obligatorio, bottom-left opcional)
 *  - StatusBar con barStyle="light-content"
 *  - KeyboardAvoidingView + SafeAreaView
 *  - ScrollView opcional (para pantallas con formularios)
 *
 * Uso básico (pantalla con scroll):
 *   <ScreenShell scroll>
 *     <Text>Contenido</Text>
 *   </ScreenShell>
 *
 * Uso sin scroll (pantalla con FlatList propio):
 *   <ScreenShell>
 *     <FlatList ... />
 *   </ScreenShell>
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenShellProps {
    children: React.ReactNode;
    /** Activa ScrollView interno con padding estándar */
    scroll?: boolean;
    /** Muestra blob bottom-left (púrpura). Default: false */
    blobBottomLeft?: boolean;
    /** Padding horizontal del ScrollView. Default: 24 */
    scrollPaddingH?: number;
    /** Estilo extra para el ScrollView contentContainer */
    scrollContentStyle?: ViewStyle;
    /** Estilo extra para el root View */
    style?: ViewStyle;
}

export default function ScreenShell({
    children,
    scroll = false,
    blobBottomLeft = false,
    scrollPaddingH = 24,
    scrollContentStyle,
    style,
}: ScreenShellProps) {
    const inner = scroll ? (
        <ScrollView
            contentContainerStyle={[
                styles.scrollContent,
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
        <View style={[styles.root, style]}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />

            {/* Blob top-right (siempre visible) */}
            <View style={styles.blobTR} />

            {/* Blob bottom-left (opcional) */}
            {blobBottomLeft && <View style={styles.blobBL} />}

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

// ── Botón de volver reutilizable que se exporta desde aquí ──────────────────
interface BackButtonProps {
    label?: string;
    onPress: () => void;
}

export function BackButton({ label = "Volver", onPress }: BackButtonProps) {
    return (
        <TouchableOpacity onPress={onPress} style={backStyles.btn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.65)" />
        </TouchableOpacity>
    );
}

const backStyles = StyleSheet.create({
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

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#0C1F5C",
    },
    flex1: { flex: 1 },
    blobTR: {
        position: "absolute",
        top: -60,
        right: -70,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: "rgba(59,130,246,0.12)",
    },
    blobBL: {
        position: "absolute",
        bottom: 80,
        left: -60,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "rgba(109,40,217,0.10)",
    },
    scrollContent: {
        paddingTop: 32,
        paddingBottom: 48,
        gap: 28,
    },
});