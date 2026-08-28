import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { db, ensureSchema } from './db';
import { verifyPassword } from './passwords';

const COOKIE = process.env.ADMIN_COOKIE || 'megamine_admin';
const USER_COOKIE = process.env.USER_COOKIE || 'megamine_user';
const password = process.env.ADMIN_PASSWORD || '';
function sign(value:string){return crypto.createHmac('sha256',password || 'megamine').update(value).digest('hex')}
export function validAdminPassword(input:string){if(!password||input.length!==password.length)return false;return crypto.timingSafeEqual(Buffer.from(input),Buffer.from(password))}
export async function isOwner(){if(!password)return false;const c=await cookies();return c.get(COOKIE)?.value===sign('owner')}
export async function sessionUser(){const c=await cookies();const raw=c.get(USER_COOKIE)?.value;if(!raw)return null;const [id,sig]=raw.split('.');if(!id||sig!==sign('user:'+id)||!db)return null;await ensureSchema();const rows=await db`SELECT id,login,display_name,role,can_admin,district_id FROM users WHERE id=${Number(id)} LIMIT 1`;return rows[0]||null}
export async function isAdmin(){if(await isOwner())return true;const u=await sessionUser();return !!u&&(u.role==='admin'||u.can_admin===true)}
export async function canModerate(){return isAdmin()}
export function adminCookie(){return {name:COOKIE,value:sign('owner'),httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*7}}
export function userCookie(id:number){return {name:USER_COOKIE,value:`${id}.${sign('user:'+id)}`,httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*7}}
export async function loginUser(login:string,pass:string){if(!db)return null;await ensureSchema();const rows=await db`SELECT id,login,password_hash,display_name,role,can_admin,district_id FROM users WHERE login=${login} LIMIT 1`;const u=rows[0];return u&&verifyPassword(pass,u.password_hash)?u:null}
