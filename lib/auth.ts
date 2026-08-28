import { cookies } from 'next/headers';
import crypto from 'node:crypto';

const COOKIE = process.env.ADMIN_COOKIE || 'megamine_admin';
const password = process.env.ADMIN_PASSWORD || '';
function sign(value: string) { return crypto.createHmac('sha256', password).update(value).digest('hex'); }
export function validPassword(input: string) {
  if (!password || input.length !== password.length) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(password));
}
export async function isAdmin() {
  if (!password) return false;
  const c = await cookies();
  return c.get(COOKIE)?.value === sign('admin');
}
export function adminCookie() { return { name: COOKIE, value: sign('admin'), httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 7 }; }
