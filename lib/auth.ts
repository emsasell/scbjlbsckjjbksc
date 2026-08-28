import {cookies} from 'next/headers';
import crypto from 'node:crypto';
import {db,ensureSchema} from './db';

const COOKIE=process.env.ADMIN_COOKIE||'megamine_admin';
const ownerPassword=process.env.ADMIN_PASSWORD||'';
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');

export type SessionUser={
  id?:number;
  username:string;
  /** Compatibility aliases used by older routes. */
  login?:string;
  owner:boolean;
  sessionVersion:number;
  role?:'admin'|'creator'|'user'|'owner';
  district_id?:number|null;
  is_admin?:boolean;
  is_creator?:boolean;
};

export async function authenticate(username:string,password:string):Promise<SessionUser|null>{
  if(username==='0'&&ownerPassword&&password.length===ownerPassword.length&&crypto.timingSafeEqual(Buffer.from(password),Buffer.from(ownerPassword))) {
    return {username:'0',login:'0',owner:true,sessionVersion:1,role:'owner',is_admin:true,is_creator:false,district_id:null};
  }
  if(!db)return null;
  await ensureSchema();
  const rows=await db`SELECT id,username,password_hash,session_version,role,district_id,is_admin,is_creator FROM admins WHERE username=${username} LIMIT 1`;
  const row=rows[0];
  if(!row)return null;
  const expected=String(row.password_hash||'');
  const supplied=hash(password);
  if(!same(expected,supplied))return null;
  const isAdminFlag=Boolean(row.is_admin) || String(row.role||'')==='admin';
  const isCreatorFlag=Boolean(row.is_creator) || String(row.role||'')==='creator';
  return {id:Number(row.id),username:String(row.username),login:String(row.username),owner:false,sessionVersion:Number(row.session_version||1),role:isAdminFlag?'admin':isCreatorFlag?'creator':'user',district_id:row.district_id==null?null:Number(row.district_id),is_admin:isAdminFlag,is_creator:isCreatorFlag};
}

function secret(){return ownerPassword||'megamine'}
function signPayload(payload:string){return crypto.createHmac('sha256',secret()).update(payload).digest('hex')}
function same(a:string,b:string){return a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b))}
function encode(user:SessionUser){
  const payload=Buffer.from(JSON.stringify({id:user.id||null,u:user.username,sv:user.sessionVersion,o:user.owner,r:user.role||null,d:user.district_id??null,a:!!user.is_admin,c:!!user.is_creator})).toString('base64url');
  return signPayload(payload)+'.'+payload;
}

export async function currentAdmin():Promise<SessionUser|null>{
  const c=await cookies();const value=c.get(COOKIE)?.value||'';const [sig,payload]=value.split('.');
  if(!sig||!payload||!same(sig,signPayload(payload)))return null;
  let parsed:any;try{parsed=JSON.parse(Buffer.from(payload,'base64url').toString())}catch{return null}
  if(parsed?.u==='0'&&parsed?.o===true)return {username:'0',login:'0',owner:true,sessionVersion:1,role:'owner',is_admin:true,is_creator:false,district_id:null};
  if(!parsed?.id||!parsed?.u||!db)return null;
  try{
    await ensureSchema();
    const rows=await db`SELECT id,username,session_version,role,district_id,is_admin,is_creator FROM admins WHERE id=${Number(parsed.id)} LIMIT 1`;
    const row=rows[0];
    if(!row||String(row.username)!==String(parsed.u)||Number(row.session_version||1)!==Number(parsed.sv))return null;
    const isAdminFlag=Boolean(row.is_admin)||String(row.role||'')==='admin';
    const isCreatorFlag=Boolean(row.is_creator)||String(row.role||'')==='creator';
    return {id:Number(row.id),username:String(row.username),login:String(row.username),owner:false,sessionVersion:Number(row.session_version||1),role:isAdminFlag?'admin':isCreatorFlag?'creator':'user',district_id:row.district_id==null?null:Number(row.district_id),is_admin:isAdminFlag,is_creator:isCreatorFlag};
  }catch{return null}
}

export async function isAdmin(){const u=await currentAdmin();return !!u&&(u.owner||u.is_admin||u.role==='admin')}
export function adminCookie(user:SessionUser){return {name:COOKIE,value:encode(user),httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*7}}
export function clearAdminCookie(){return {name:COOKIE,value:'',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:0}}
export async function logAction(action:string,details=''){const user=await currentAdmin();const username=user?.username||'system';if(db){try{await ensureSchema();await db`INSERT INTO action_log(username,action,details) VALUES(${username},${action},${details})`}catch{}}}
export const passwordHash=hash;

/** Synchronous on purpose: legacy routes call it without await. */
export function validAdminPassword(password:string=''){if(!ownerPassword)return false;return same(String(password),ownerPassword)}
export async function loginUser(login:string,password:string){return authenticate(String(login||''),String(password||''))}
/** Legacy helper: with a user returns the cookie options; without arguments returns the cookie name. */
export function userCookie(user?:SessionUser){return user?adminCookie(user):COOKIE}
export async function sessionUser():Promise<SessionUser|null>{return currentAdmin()}
