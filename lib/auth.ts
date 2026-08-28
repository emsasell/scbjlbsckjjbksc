import {cookies} from 'next/headers';
import crypto from 'node:crypto';
import {db,ensureSchema} from './db';
const COOKIE=process.env.ADMIN_COOKIE||'megamine_admin';
const ownerPassword=process.env.ADMIN_PASSWORD||'';
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
export type SessionUser={id?:number;username:string;owner:boolean;sessionVersion:number};
export async function authenticate(username:string,password:string):Promise<SessionUser|null>{
 if(username==='0'&&ownerPassword&&password.length===ownerPassword.length&&crypto.timingSafeEqual(Buffer.from(password),Buffer.from(ownerPassword))) return {username:'0',owner:true,sessionVersion:1};
 if(!db)return null;
 await ensureSchema();
 const rows=await db`SELECT id,username,password_hash,session_version FROM admins WHERE username=${username} LIMIT 1`;
 const row=rows[0];
 if(row&&crypto.timingSafeEqual(Buffer.from(String(row.password_hash)),Buffer.from(hash(password)))) return {id:Number(row.id),username:String(row.username),owner:false,sessionVersion:Number(row.session_version||1)};
 return null;
}
function secret(){return ownerPassword||'megamine'}
function signPayload(payload:string){return crypto.createHmac('sha256',secret()).update(payload).digest('hex')}
function same(a:string,b:string){return a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b))}
function encode(user:SessionUser){const payload=Buffer.from(JSON.stringify({id:user.id||null,u:user.username,sv:user.sessionVersion,o:user.owner})).toString('base64url');return signPayload(payload)+'.'+payload}
export async function currentAdmin():Promise<SessionUser|null>{
 const c=await cookies();const value=c.get(COOKIE)?.value||'';const [sig,payload]=value.split('.');
 if(!sig||!payload||!same(sig,signPayload(payload)))return null;
 let parsed:any;try{parsed=JSON.parse(Buffer.from(payload,'base64url').toString())}catch{return null}
 if(parsed?.u==='0'&&parsed?.o===true)return {username:'0',owner:true,sessionVersion:1};
 if(!parsed?.id||!parsed?.u||!db)return null;
 try{await ensureSchema();const rows=await db`SELECT id,username,session_version FROM admins WHERE id=${Number(parsed.id)} LIMIT 1`;const row=rows[0];if(!row||String(row.username)!==String(parsed.u)||Number(row.session_version||1)!==Number(parsed.sv))return null;return {id:Number(row.id),username:String(row.username),owner:false,sessionVersion:Number(row.session_version||1)}}catch{return null}
}
export async function isAdmin(){return !!(await currentAdmin())}
export function adminCookie(user:SessionUser){return {name:COOKIE,value:encode(user),httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*7}}
export function clearAdminCookie(){return {name:COOKIE,value:'',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:0}}
export async function logAction(action:string,details=''){const user=await currentAdmin();const username=user?.username||'system';if(db){try{await ensureSchema();await db`INSERT INTO action_log(username,action,details) VALUES(${username},${action},${details})`}catch{}}}
export const passwordHash=hash;

// Compatibility helpers for account routes.
export async function validAdminPassword(password:string){
  if(!ownerPassword) return false;
  const a=Buffer.from(String(password)); const b=Buffer.from(ownerPassword);
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
export async function loginUser(login:string,password:string){
  return authenticate(String(login||''),String(password||''));
}
export const userCookie=adminCookie;
