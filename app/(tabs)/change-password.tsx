import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { globalStyles } from "@/utils/globalStyles";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
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

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 16;

export default function ChangePasswordScreen() {
    const { user } = useSession();
    const { updatePassword, isLoading, error, success, clearMessages } = useProfile();

    const [current, setCurrent] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{
        current?: string; newPass?: string; confirm?: string;
    }>({});

    const validate = (): boolean => {
        const errors: typeof fieldErrors = {};
        if (!current) errors.current = "Ingresa tu contraseña actual.";
        if (!newPass) errors.newPass = "Ingresa la nueva contraseña.";
        else if (newPass.length < MIN_PASSWORD) errors.newPass = `Mínimo ${MIN_PASSWORD} caracteres.`;
        else if (newPass.length > MAX_PASSWORD) errors.newPass = `Máximo ${MAX_PASSWORD} caracteres.`;
        else if (newPass === current) errors.newPass = "La nueva contraseña debe ser diferente.";
        if (!confirm) errors.confirm = "Confirma la nueva contraseña.";
        else if (confirm !== newPass) errors.confirm = "Las contraseñas no coinciden.";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        clearMessages();
        if (!validate()) return;
        // TODO: verificar contraseña actual contra BD antes de actualizar
        const ok = await updatePassword({ userId: user!.id, newPassword: newPass });
        if (ok) {
            setCurrent(""); setNewPass(""); setConfirm("");
            setFieldErrors({});
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />
            <View style={styles.blobTR} />

            <KeyboardAvoidingView style={globalStyles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <SafeAreaView style={globalStyles.flex1}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Back */}
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.65)" />
                            <Text style={styles.backText}>Volver al perfil</Text>
                        </TouchableOpacity>

                        {/* Header */}
                        <View style={styles.headerSection}>
                            <View style={styles.iconRing}>
                                <View style={styles.iconInner}>
                                    <Ionicons name="key-outline" size={28} color={Colors.primary.light} />
                                </View>
                            </View>
                            <Text style={globalStyles.formTitle}>Cambiar contraseña</Text>
                        </View>

                        {/* Card */}
                        <View style={globalStyles.glassCard}>
                            <View style={styles.shimmer} />
                            <View style={styles.cardContent}>
                                {error && (
                                    <View style={globalStyles.errorBanner}>
                                        <View style={globalStyles.errorDot} />
                                        <Text style={globalStyles.errorBannerText}>{error}</Text>
                                    </View>
                                )}
                                {success && (
                                    <View style={styles.successBanner}>
                                        <Ionicons name="checkmark-circle-outline" size={16} color={Colors.status.success} />
                                        <Text style={styles.successText}>{success}</Text>
                                    </View>
                                )}

                                <InputField
                                    label="Contraseña actual"
                                    placeholder="••••••••"
                                    leftIcon="lock-closed-outline"
                                    isPassword dark
                                    value={current}
                                    onChangeText={(t) => { setCurrent(t); if (fieldErrors.current) setFieldErrors((p) => ({ ...p, current: undefined })); }}
                                    error={fieldErrors.current}
                                    maxLength={MAX_PASSWORD}
                                />
                                <InputField
                                    label="Nueva contraseña"
                                    placeholder="••••••••"
                                    leftIcon="lock-open-outline"
                                    isPassword dark
                                    value={newPass}
                                    onChangeText={(t) => { setNewPass(t); if (fieldErrors.newPass) setFieldErrors((p) => ({ ...p, newPass: undefined })); }}
                                    error={fieldErrors.newPass}
                                    maxLength={MAX_PASSWORD}
                                />
                                <InputField
                                    label="Confirmar contraseña"
                                    placeholder="••••••••"
                                    leftIcon="checkmark-circle-outline"
                                    isPassword dark
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit}
                                    value={confirm}
                                    onChangeText={(t) => { setConfirm(t); if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: undefined })); }}
                                    error={fieldErrors.confirm}
                                    maxLength={MAX_PASSWORD}
                                />

                                <PrimaryButton
                                    label="Actualizar contraseña"
                                    onPress={handleSubmit}
                                    isLoading={isLoading}
                                    disabled={isLoading}
                                    variant="light"
                                />
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0C1F5C" },
    blobTR: {
        position: "absolute", top: -60, right: -70,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: "rgba(59,130,246,0.12)",
    },
    scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48, gap: 28 },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
    backText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: "rgba(255,255,255,0.55)" },
    headerSection: { alignItems: "center", gap: 14 },
    iconRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: "rgba(59,130,246,0.12)",
        borderWidth: 1.5, borderColor: "rgba(59,130,246,0.28)",
        alignItems: "center", justifyContent: "center",
    },
    iconInner: {
        width: 58, height: 58, borderRadius: 29,
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center", justifyContent: "center",
    },
    shimmer: { height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
    cardContent: { padding: 24, paddingTop: 28 },
    successBanner: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: "rgba(5,150,105,0.12)",
        borderWidth: 1, borderColor: "rgba(5,150,105,0.30)",
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
    },
    successText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: "#6EE7B7", flex: 1 },
});