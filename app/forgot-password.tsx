import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { globalStyles } from "@/utils/globalStyles";
import {
    MAX_EMAIL_LENGTH,
    validateEmail,
} from "@/utils/validators";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
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

// ─────────────────────────────────────────────
// Estados posibles del flujo
// ─────────────────────────────────────────────
type FlowStep = "input" | "success";

export default function ForgotPasswordScreen() {
    const { forgotPassword, isLoading, error: apiError, clearError } = useAuth();

    const [step, setStep] = useState<FlowStep>("input");
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | undefined>();
    const [touched, setTouched] = useState(false);

    // ── Validación en tiempo real ──────────────
    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (touched) setEmailError(validateEmail(text));
        if (apiError) clearError();
    };

    const handleBlur = () => {
        setTouched(true);
        setEmailError(validateEmail(email));
    };

    // ── Envío del formulario ───────────────────
    const handleSubmit = async () => {
        setTouched(true);
        const error = validateEmail(email);
        setEmailError(error);
        if (error) return;

        const success = await forgotPassword(email);
        if (success) setStep("success");
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />

            {/* Blobs decorativos — mismos que login */}
            <View style={styles.blobTR} />
            <View style={styles.blobBL} />
            <View style={styles.blobC} />
            <View style={[styles.accentLine, { right: 48, top: 80, height: 90 }]} />
            <View style={[styles.accentLine, { right: 66, top: 100, height: 56, opacity: 0.04 }]} />

            <KeyboardAvoidingView
                style={globalStyles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <SafeAreaView style={globalStyles.flex1}>
                    <ScrollView
                        contentContainerStyle={globalStyles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ════ BACK BUTTON ════ */}
                        <TouchableOpacity
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                            style={styles.backBtn}
                        >
                            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.65)" />
                            <Text style={styles.backText}>Volver al inicio de sesión</Text>
                        </TouchableOpacity>

                        {/* ════ HEADER ════ */}
                        <View style={styles.headerSection}>
                            {/* Icono central */}
                            <View style={styles.iconRing}>
                                <View style={styles.iconInner}>
                                    <Ionicons
                                        name="lock-open-outline"
                                        size={30}
                                        color={Colors.primary.light}
                                    />
                                </View>
                            </View>

                            <Text style={globalStyles.formTitle}>
                                {step === "input" ? "Recuperar acceso" : "Correo enviado"}
                            </Text>

                            <View style={styles.taglineRow}>
                                <View style={styles.taglineLine} />
                                <Text style={styles.taglineText}>
                                    {step === "input"
                                        ? "Te enviaremos instrucciones"
                                        : "Revisa tu bandeja de entrada"}
                                </Text>
                                <View style={styles.taglineLine} />
                            </View>
                        </View>

                        {/* ════ CARD ════ */}
                        <View style={styles.formSection}>
                            <View style={globalStyles.glassCard}>
                                <View style={styles.cardShimmer} />
                                <View style={styles.cardContent}>

                                    {/* ── PASO 1: Formulario ── */}
                                    {step === "input" && (
                                        <>
                                            <Text style={styles.instructionText}>
                                                Ingresa el correo electrónico asociado a tu cuenta y te
                                                enviaremos un enlace para restablecer tu contraseña.
                                            </Text>

                                            {/* Banner de error de API */}
                                            {apiError && (
                                                <View style={globalStyles.errorBanner}>
                                                    <View style={globalStyles.errorDot} />
                                                    <Text style={globalStyles.errorBannerText}>
                                                        {apiError}
                                                    </Text>
                                                </View>
                                            )}

                                            <InputField
                                                label="Correo electrónico"
                                                placeholder="tucorreo@ejemplo.com"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                returnKeyType="send"
                                                leftIcon="mail-outline"
                                                dark
                                                value={email}
                                                onChangeText={handleEmailChange}
                                                onBlur={handleBlur}
                                                onSubmitEditing={handleSubmit}
                                                error={emailError}
                                                maxLength={MAX_EMAIL_LENGTH}
                                            />

                                            <PrimaryButton
                                                label="Enviar instrucciones"
                                                onPress={handleSubmit}
                                                isLoading={isLoading}
                                                disabled={isLoading}
                                                variant="light"
                                            />
                                        </>
                                    )}

                                    {/* ── PASO 2: Confirmación ── */}
                                    {step === "success" && (
                                        <SuccessContent
                                            email={email}
                                            onResend={handleSubmit}
                                            isLoading={isLoading}
                                        />
                                    )}
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

// ─────────────────────────────────────────────
// Sub-componente: Confirmación de envío
// ─────────────────────────────────────────────
interface SuccessContentProps {
    email: string;
    onResend: () => void;
    isLoading: boolean;
}

function SuccessContent({ email, onResend, isLoading }: SuccessContentProps) {
    return (
        <View style={styles.successContainer}>
            {/* Check animado */}
            <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={32} color={Colors.status.success} />
            </View>

            <Text style={styles.successTitle}>¡Listo!</Text>

            <Text style={styles.successBody}>
                Si existe una cuenta asociada a{" "}
                <Text style={styles.successEmail}>{email}</Text>
                , recibirás un correo con instrucciones para restablecer tu contraseña.
            </Text>

            {/* Recordatorio de bandeja */}
            <View style={styles.reminderCard}>
                <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="rgba(147,197,253,0.85)"
                />
                <Text style={styles.reminderText}>
                    Revisa también tu carpeta de spam o correo no deseado.
                </Text>
            </View>

            {/* Reenviar */}
            <View style={styles.resendRow}>
                <Text style={styles.resendLabel}>¿No recibiste el correo?</Text>
                {isLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary.light} />
                ) : (
                    <TouchableOpacity onPress={onResend} activeOpacity={0.7}>
                        <Text style={styles.resendLink}>Reenviar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Volver al login */}
            <TouchableOpacity
                onPress={() => router.push("/login")}
                activeOpacity={0.7}
                style={styles.returnBtn}
            >
                <Ionicons name="arrow-back-outline" size={14} color={Colors.primary.light} />
                <Text style={styles.returnText}>Volver al inicio de sesión</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#0C1F5C",
    },

    // Blobs — idénticos al login
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
        position: "absolute",
        width: 1.5,
        backgroundColor: "rgba(255,255,255,0.07)",
        transform: [{ rotate: "30deg" }],
    },

    // Back button
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    backText: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "rgba(255,255,255,0.55)",
    },

    // Header
    headerSection: {
        alignItems: "center",
        gap: 12,
    },
    iconRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "rgba(59,130,246,0.12)",
        borderWidth: 1.5,
        borderColor: "rgba(59,130,246,0.28)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    iconInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
    },
    taglineRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
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

    // Form section
    formSection: { gap: 20 },
    cardShimmer: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    cardContent: {
        padding: 24,
        paddingTop: 28,
        gap: 0,
    },

    // Instruction text
    instructionText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "rgba(255,255,255,0.60)",
        lineHeight: 22,
        marginBottom: 24,
    },

    // ── Success state ──
    successContainer: {
        alignItems: "center",
        paddingVertical: 8,
        gap: 16,
    },
    checkCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(5,150,105,0.14)",
        borderWidth: 1.5,
        borderColor: "rgba(5,150,105,0.35)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    successTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 22,
        color: Colors.white,
        letterSpacing: 0.3,
    },
    successBody: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "rgba(255,255,255,0.60)",
        lineHeight: 22,
        textAlign: "center",
    },
    successEmail: {
        fontFamily: "Outfit_600SemiBold",
        color: "#93C5FD",
    },
    reminderCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: "rgba(59,130,246,0.10)",
        borderWidth: 1,
        borderColor: "rgba(59,130,246,0.22)",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        width: "100%",
        marginTop: 4,
    },
    reminderText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(147,197,253,0.85)",
        flex: 1,
        lineHeight: 20,
    },
    resendRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    resendLabel: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.45)",
    },
    resendLink: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: "#93C5FD",
        textDecorationLine: "underline",
    },
    returnBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "rgba(59,130,246,0.08)",
        marginTop: 4,
    },
    returnText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: Colors.primary.light,
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