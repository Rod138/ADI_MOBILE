import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { useAuth } from "@/hooks/useAuth";
import { isFormValid, MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH, validateLoginForm } from "@/utils/validators";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
    const { login, isLoading, error, clearError } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (touched.email) {
            const errs = validateLoginForm(text, password);
            setFieldErrors((prev) => ({ ...prev, email: errs.email }));
        }
        if (error) clearError();
    };

    const handlePasswordChange = (text: string) => {
        setPassword(text);
        if (touched.password) {
            const errs = validateLoginForm(email, text);
            setFieldErrors((prev) => ({ ...prev, password: errs.password }));
        }
        if (error) clearError();
    };

    const handleBlur = (field: "email" | "password") => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const errs = validateLoginForm(email, password);
        setFieldErrors((prev) => ({ ...prev, [field]: errs[field] }));
    };

    const handleLogin = async () => {
        setTouched({ email: true, password: true });
        const errors = validateLoginForm(email, password);
        setFieldErrors(errors);
        if (!isFormValid(errors)) return;
        const result = await login({ email: email.trim().toLowerCase(), password });
        if (result) router.replace("/(tabs)");
    };

    const handleForgotPassword = () => {
        Alert.alert(
            "Recuperar contraseña",
            "Contacta al administrador de tu condominio para restablecer tu acceso.",
            [{ text: "Entendido" }]
        );
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />

            {/* Blobs decorativos */}
            <View style={styles.blobTR} />
            <View style={styles.blobBL} />
            <View style={styles.blobC} />
            <View style={[styles.accentLine, { right: 48, top: 80, height: 90 }]} />
            <View style={[styles.accentLine, { right: 66, top: 100, height: 56, opacity: 0.04 }]} />

            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <SafeAreaView style={styles.flex1}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ════ BRAND ════ */}
                        <View style={styles.brandSection}>
                            <View style={styles.logoRing}>
                                <Image
                                    source={require("@/assets/images/logo.png")}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View>

                            <View style={styles.taglineRow}>
                                <View style={styles.taglineLine} />
                                <Text style={styles.taglineText}>Administración de Incidencias</Text>
                                <View style={styles.taglineLine} />
                            </View>
                        </View>

                        {/* ════ FORM ════ */}
                        <View style={styles.formSection}>
                            <View style={styles.formHeader}>
                                <Text style={styles.formTitle}>Inicia sesión</Text>
                            </View>

                            {/* Glass card */}
                            <View style={styles.card}>
                                <View style={styles.cardShimmer} />
                                <View style={styles.cardContent}>
                                    {error && (
                                        <View style={styles.errorBanner}>
                                            <View style={styles.errorDot} />
                                            <Text style={styles.errorBannerText}>{error}</Text>
                                        </View>
                                    )}

                                    <InputField
                                        label="Correo electrónico"
                                        placeholder="tucorreo@ejemplo.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="next"
                                        leftIcon="mail-outline"
                                        dark
                                        value={email}
                                        onChangeText={handleEmailChange}
                                        onBlur={() => handleBlur("email")}
                                        error={fieldErrors.email}
                                        maxLength={MAX_EMAIL_LENGTH}
                                    />

                                    <InputField
                                        label="Contraseña"
                                        placeholder="••••••••"
                                        leftIcon="lock-closed-outline"
                                        isPassword
                                        dark
                                        returnKeyType="done"
                                        onSubmitEditing={handleLogin}
                                        value={password}
                                        onChangeText={handlePasswordChange}
                                        onBlur={() => handleBlur("password")}
                                        error={fieldErrors.password}
                                        maxLength={MAX_PASSWORD_LENGTH}
                                    />

                                    <TouchableOpacity
                                        onPress={handleForgotPassword}
                                        activeOpacity={0.7}
                                        style={styles.forgotBtn}
                                    >
                                        <Text style={styles.forgotText}>
                                            ¿Olvidaste tu contraseña?
                                        </Text>
                                    </TouchableOpacity>

                                    <PrimaryButton
                                        label="Iniciar sesión"
                                        onPress={handleLogin}
                                        isLoading={isLoading}
                                        disabled={isLoading}
                                        variant="light"
                                    />
                                </View>
                            </View>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <View style={styles.footerDot} />
                                <Text style={styles.footerText}>Administración de Incidencias</Text>
                                <View style={styles.footerDot} />
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    root: {
        flex: 1,
        backgroundColor: "#0C1F5C",
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 48,
        gap: 40,
    },

    // Blobs
    blobTR: {
        position: "absolute", top: -60, right: -70,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: "rgba(59,130,246,0.15)",
    },
    blobBL: {
        position: "absolute", bottom: 80, left: -80,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: "rgba(109,40,217,0.12)",
    },
    blobC: {
        position: "absolute", top: "40%", right: -40,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: "rgba(30,58,138,0.28)",
    },
    accentLine: {
        position: "absolute", right: 48,
        width: 1.5,
        backgroundColor: "rgba(255,255,255,0.07)",
        transform: [{ rotate: "30deg" }],
    },

    // Brand
    brandSection: {
        alignItems: "center",
        paddingTop: 16,
    },
    logoRing: {
        width: 108, height: 108,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        elevation: 14,
    },
    logo: { width: 150, height: 80 },
    taglineRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    taglineLine: {
        height: 1, width: 28,
        backgroundColor: "rgba(255,255,255,0.18)",
    },
    taglineText: {
        fontFamily: "Outfit_500Medium",
        fontSize: 11,
        color: "rgba(255,255,255,0.38)",
        letterSpacing: 2.5,
    },

    // Form
    formSection: { gap: 20 },
    formHeader: { gap: 2 },
    formTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 28,
        color: "#FFFFFF",
        letterSpacing: 0.2,
        textAlign: "center",
    },

    // Card
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
    cardShimmer: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    cardContent: {
        padding: 24,
        paddingTop: 28,
    },

    // Error banner
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "rgba(220,38,38,0.14)",
        borderWidth: 1,
        borderColor: "rgba(252,165,165,0.28)",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 20,
    },
    errorDot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: "#FCA5A5",
    },
    errorBannerText: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "#FCA5A5",
        flex: 1,
    },

    // Forgot
    forgotBtn: {
        alignSelf: "flex-end",
        marginTop: -4,
        marginBottom: 24,
        paddingVertical: 4,
    },
    forgotText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: "#93C5FD",
    },

    // Footer
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 20,
    },
    footerDot: {
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.18)",
    },
    footerText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: "#aaaaaa",
        letterSpacing: 0.5,
    },
});