import * as OTPAuth from 'otpauth';

// Standard 32-character Base32 Secret Key for Admin TOTP (Valid Base32: A-Z and 2-7 only)
export const ADMIN_TOTP_SECRET = 'BUNKJEEVANSECURETOTPKEY234567';
export const ISSUER_NAME = 'Bunk Pro Petrol Station';

/**
 * Creates the standard TOTP generator instance
 */
export function getTotpInstance(username: string = 'jeevan') {
  return new OTPAuth.TOTP({
    issuer: ISSUER_NAME,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(ADMIN_TOTP_SECRET)
  });
}

/**
 * Returns the otpauth:// URI used by Google/Microsoft Authenticator QR scanners
 */
export function getTotpUri(username: string = 'jeevan'): string {
  try {
    const totp = getTotpInstance(username);
    return totp.toString();
  } catch (err) {
    console.error('Failed to generate TOTP URI:', err);
    return `otpauth://totp/${encodeURIComponent(ISSUER_NAME)}:${encodeURIComponent(username)}?secret=${ADMIN_TOTP_SECRET}&issuer=${encodeURIComponent(ISSUER_NAME)}&algorithm=SHA1&digits=6&period=30`;
  }
}

/**
 * Verifies a 6-digit token entered by the user
 * Allows a +/- 1 step window (60s grace period for clock drift)
 */
export function verifyTotpCode(token: string, username: string = 'jeevan'): boolean {
  const cleanToken = token.trim();

  if (cleanToken.length !== 6) {
    return false;
  }

  try {
    const totp = getTotpInstance(username);
    const delta = totp.validate({
      token: cleanToken,
      window: 1 // +/- 30 seconds
    });

    return delta !== null;
  } catch (err) {
    console.error('TOTP validation error:', err);
    return false;
  }
}

/**
 * Generates the current live 6-digit code (for demonstration / quick setup)
 */
export function generateCurrentTotp(username: string = 'jeevan'): string {
  try {
    const totp = getTotpInstance(username);
    return totp.generate();
  } catch {
    return '123456';
  }
}
