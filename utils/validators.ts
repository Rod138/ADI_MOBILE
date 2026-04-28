export interface LoginFormErrors {
    email?: string;
    password?: string;
}

export interface ChangePasswordErrors {
    current?: string;
    newPass?: string;
    confirm?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PASSWORD_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9!@#$%^&*()_\-+=\[\]{};:'",.<>?/\\|`~]+$/;

export const MAX_PASSWORD_LENGTH = 32;
export const MAX_CHANGE_PASSWORD_LENGTH = 16;

const MIN_PASSWORD_LENGTH = 8;
const MIN_EMAIL_LENGTH = 6;
export const MAX_EMAIL_LENGTH = 320;

// ── Email ────────────────────────────────────────────────────────────────────
export function validateEmail(email: string): string | undefined {
    if (!email.trim()) return "El correo es obligatorio.";
    if (email.length < MIN_EMAIL_LENGTH) return `El correo debe tener al menos ${MIN_EMAIL_LENGTH} caracteres.`;
    if (email.length > MAX_EMAIL_LENGTH) return `El correo debe tener menos de ${MAX_EMAIL_LENGTH} caracteres.`;
    if (!EMAIL_REGEX.test(email)) return "Ingresa un correo electrónico válido.";
    return undefined;
}

// ── Contraseña (login) ───────────────────────────────────────────────────────
export function validatePassword(password: string): string | undefined {
    if (!password) return "La contraseña es obligatoria.";
    if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    if (password.length > MAX_PASSWORD_LENGTH) return `La contraseña debe tener menos de ${MAX_PASSWORD_LENGTH} caracteres.`;
    return undefined;
}

// ── Contraseña nueva (change-password) ──────────────────────────────────────
/**
 * Valida la nueva contraseña en el flujo de cambio de contraseña.
 * Reglas adicionales respecto al login:
 *  - Máximo 16 caracteres (más restrictivo que el login)
 *  - No puede ser igual a la contraseña actual
 */
export function validateNewPassword(
    newPassword: string,
    currentPassword: string
): string | undefined {
    if (!newPassword) return "Ingresa la nueva contraseña.";
    if (newPassword.length < MIN_PASSWORD_LENGTH) return `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    if (newPassword.length > MAX_CHANGE_PASSWORD_LENGTH) return `Máximo ${MAX_CHANGE_PASSWORD_LENGTH} caracteres.`;
    if (!VALID_PASSWORD_REGEX.test(newPassword)) return "La contraseña solo puede contener letras, números y símbolos del teclado estándar.";
    if (newPassword === currentPassword) return "La nueva contraseña debe ser diferente a la actual.";
    return undefined;
}

// ── Formulario completo de cambio de contraseña ──────────────────────────────
export function validateChangePasswordForm(
    current: string,
    newPass: string,
    confirm: string
): ChangePasswordErrors {
    const errors: ChangePasswordErrors = {};

    if (!current) errors.current = "Ingresa tu contraseña actual.";

    const newPassError = validateNewPassword(newPass, current);
    if (newPassError) errors.newPass = newPassError;

    if (!confirm) errors.confirm = "Confirma la nueva contraseña.";
    else if (confirm !== newPass) errors.confirm = "Las contraseñas no coinciden.";

    return errors;
}

// ── Formulario de login ──────────────────────────────────────────────────────
export function validateLoginForm(
    email: string,
    password: string
): LoginFormErrors {
    const errors: LoginFormErrors = {};

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    return errors;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function isFormValid(errors: LoginFormErrors): boolean {
    return Object.values(errors).every((v) => v === undefined);
}

export function isChangePasswordFormValid(errors: ChangePasswordErrors): boolean {
    return Object.values(errors).every((v) => v === undefined);
}