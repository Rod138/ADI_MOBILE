import * as bcrypt from "bcryptjs";

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