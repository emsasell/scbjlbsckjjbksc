import {cookies} from 'next/headers';
import crypto from 'node:crypto';
import {db,ensureSchema} from './db';

const COOKIE=process.env.ADMIN_COOKIE||'megamine_admin';
const envPassword=process.env.ADMIN_PASSWORD||'';
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const same=(a:string,b:string)=>a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
export type SessionUser={username:string;owner:boolean;sessionVersion:number;role:'admin';is_admin:true;is_creator:false;};

async function adminConfig(){
  if(!db)return {passwordHash:envPassword?hash(envPassword):'',version:1};
  await ensureSchema();
  const rows=await db`SELECT key,value FROM settings WHERE key IN ('admin_password_hash','admin_session_version')`;
  const map=Object.fromEntries(rows.map((r:any)=>[String(r.key),String(r.value)])) as Record<string,string>;
  return {passwordHash:map.admin_password_hash|| (envPassword?hash(envPassword):''),version:Number(map.admin_session_version||1)||1};
}
export async function authenticate(passwordOrUsername:string,passwordMaybe?:string):Promise<SessionUser|null>{
  // Совместимость со старыми вызовами authenticate(username,password): логин больше не используется.
  const password=passwordMaybe===undefined?String(passwordOrUsername||''):String(passwordMaybe||'');
  const cfg=await adminConfig();
  if(!cfg.passwordHash)return null;
  const supplied=hash(password);
  if(!same(cfg.passwordHash,supplied))return null;
  return {username:'admin',owner:true,sessionVersion:cfg.version,role:'admin',is_admin:true,is_creator:false};
}
function secret(){return process.env.ADMIN_SESSION_SECRET||envPassword||'megamine-session'}
function sign(payload:string){return crypto.createHmac('sha256',secret()).update(payload).digest('hex')}
function encode(user:SessionUser){const payload=Buffer.from(JSON.stringify({u:'admin',sv:user.sessionVersion})).toString('base64url');return sign(payload)+'.'+payload}
export async function currentAdmin():Promise<SessionUser|null>{
  const c=await cookies();const value=c.get(COOKIE)?.value||'';const [sig,payload]=value.split('.');
  if(!sig||!payload||!same(sig,sign(payload)))return null;
  try{const p=JSON.parse(Buffer.from(payload,'base64url').toString());if(p?.u!=='admin')return null;const cfg=await adminConfig();if(Number(p.sv)!==cfg.version)return null;return {username:'admin',owner:true,sessionVersion:cfg.version,role:'admin',is_admin:true,is_creator:false}}catch{return null}
}
export async function isAdmin(){return !!(await currentAdmin())}
export function adminCookie(user:SessionUser){return {name:COOKIE,value:encode(user),httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*7}}
export function clearAdminCookie(){return {name:COOKIE,value:'',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:0}}
export async function logAction(action:string,details=''){
  // Журнал является постоянной частью БД: успешное действие не должно
  // молча исчезать из истории.
  if(!db)return;
  await ensureSchema();
  // Явно записываем каждое успешное действие. Схема мигрируется в ensureSchema().
  await db`INSERT INTO action_log(username,action,details,created_at) VALUES('admin',${String(action)},${String(details)},NOW())`;
}
export const passwordHash=hash;
export async function setAdminPassword(password:string){if(!db)throw new Error('Для смены пароля нужен DATABASE_URL');if(String(password).length<4)throw new Error('Пароль должен содержать минимум 4 символа');await ensureSchema();const cfg=await adminConfig();const next=cfg.version+1;await db`INSERT INTO settings(key,value,updated_at) VALUES('admin_password_hash',${hash(password)},NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`;await db`INSERT INTO settings(key,value,updated_at) VALUES('admin_session_version',${String(next)},NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`;return next}
export async function validAdminPassword(password:string=''){return !!(await authenticate(password))}
