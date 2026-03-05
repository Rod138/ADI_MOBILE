export interface LoginFormErrors {
    email?: string;
    password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_PASSWORD_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 8;
const MIN_EMAIL_LENGTH = 6;
export const MAX_EMAIL_LENGTH = 100;

export function validateEmail(email: string): string | undefined {
    if (!email.trim()) return "El correo es obligatorio.";
    if (email.length < MIN_EMAIL_LENGTH) return `El correo debe tener al menos ${MIN_EMAIL_LENGTH} caracteres.`;
    if (email.length > MAX_EMAIL_LENGTH) return `El correo debe tener menos de ${MAX_EMAIL_LENGTH} caracteres.`;
    if (!EMAIL_REGEX.test(email)) return "Ingresa un correo electrónico válido.";
    return undefined;
}

export function validatePassword(password: string): string | undefined {
    if (!password) return "La contraseña es obligatoria.";
    if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    if (password.length > MAX_PASSWORD_LENGTH) return `La contraseña debe tener menos de ${MAX_PASSWORD_LENGTH} caracteres.`;
    return undefined;
}

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

export function isFormValid(errors: LoginFormErrors): boolean {
    return Object.keys(errors).length === 0;
}