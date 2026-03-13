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
        <ScreenShell theme="light" scroll>
            <BackButton theme="light" label="Volver al perfil" onPress={() => router.back()} />

            <FormPageHeader theme="light" icon="key-outline" title="Cambiar contraseña" />

            <SectionCard theme="light">
                {error && <StatusBanner theme="light" type="error" message={error} />}
                {success && <StatusBanner theme="light" type="success" message={success} />}

                <InputField
                    theme="light"
                    label="Contraseña actual"
                    placeholder="••••••••"
                    leftIcon="lock-closed-outline"
                    isPassword
                    value={current}
                    onChangeText={(t) => { setCurrent(t); clearFieldError("current"); }}
                    error={fieldErrors.current}
                    maxLength={MAX_CHANGE_PASSWORD_LENGTH}
                />
                <InputField
                    theme="light"
                    label="Nueva contraseña"
                    placeholder="••••••••"
                    leftIcon="lock-open-outline"
                    isPassword
                    value={newPass}
                    onChangeText={(t) => { setNewPass(t); clearFieldError("newPass"); }}
                    error={fieldErrors.newPass}
                    maxLength={MAX_CHANGE_PASSWORD_LENGTH}
                />
                <InputField
                    theme="light"
                    label="Confirmar contraseña"
                    placeholder="••••••••"
                    leftIcon="checkmark-circle-outline"
                    isPassword
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
                />
            </SectionCard>
        </ScreenShell>
    );
}