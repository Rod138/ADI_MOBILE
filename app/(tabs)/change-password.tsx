import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { BackButton, FormPageHeader, ScreenShell, SectionCard, StatusBanner } from "@/components/ui";
import { useSession } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import {
    isChangePasswordFormValid,
    MAX_CHANGE_PASSWORD_LENGTH,
    validateChangePasswordForm,
} from "@/utils/validators";
import { router } from "expo-router";
import { useState } from "react";

export default function ChangePasswordScreen() {
    const { user } = useSession();
    const { updatePassword, isLoading, error, success, clearMessages } = useProfile();

    const [current, setCurrent] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{
        current?: string; newPass?: string; confirm?: string;
    }>({});

    const clearFieldError = (field: keyof typeof fieldErrors) =>
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

    const handleSubmit = async () => {
        clearMessages();
        const errors = validateChangePasswordForm(current, newPass, confirm);
        setFieldErrors(errors);
        if (!isChangePasswordFormValid(errors)) return;

        const ok = await updatePassword({ userId: user!.id, newPassword: newPass });
        if (ok) {
            setCurrent(""); setNewPass(""); setConfirm("");
            setFieldErrors({});
        }
    };

    return (
        <ScreenShell scroll>
            <BackButton label="Volver al perfil" onPress={() => router.back()} />

            <FormPageHeader icon="key-outline" title="Cambiar contraseña" />

            <SectionCard>
                {error && <StatusBanner type="error" message={error} />}
                {success && <StatusBanner type="success" message={success} />}

                <InputField
                    label="Contraseña actual"
                    placeholder="••••••••"
                    leftIcon="lock-closed-outline"
                    isPassword dark
                    value={current}
                    onChangeText={(t) => { setCurrent(t); clearFieldError("current"); }}
                    error={fieldErrors.current}
                    maxLength={MAX_CHANGE_PASSWORD_LENGTH}
                />
                <InputField
                    label="Nueva contraseña"
                    placeholder="••••••••"
                    leftIcon="lock-open-outline"
                    isPassword dark
                    value={newPass}
                    onChangeText={(t) => { setNewPass(t); clearFieldError("newPass"); }}
                    error={fieldErrors.newPass}
                    maxLength={MAX_CHANGE_PASSWORD_LENGTH}
                />
                <InputField
                    label="Confirmar contraseña"
                    placeholder="••••••••"
                    leftIcon="checkmark-circle-outline"
                    isPassword dark
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    value={confirm}
                    onChangeText={(t) => { setConfirm(t); clearFieldError("confirm"); }}
                    error={fieldErrors.confirm}
                    maxLength={MAX_CHANGE_PASSWORD_LENGTH}
                />

                <PrimaryButton
                    label="Actualizar contraseña"
                    onPress={handleSubmit}
                    isLoading={isLoading}
                    disabled={isLoading}
                    variant="light"
                />
            </SectionCard>
        </ScreenShell>
    );
}