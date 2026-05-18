import * as bcrypt from "bcryptjs";

// Polyfill para React Native (si window.crypto no está disponible)
bcrypt.setRandomFallback((len: number) => {
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        buf[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(buf);
});

const SALT_ROUNDS = 10;

/**
 * Hashea una contraseña en texto plano.
 * Usar al crear/actualizar usuarios.
 */
export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano contra un hash bcrypt.
 * Usar al iniciar sesión.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}