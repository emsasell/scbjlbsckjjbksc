import {NextResponse} from 'next/server';
import {db,ensureSchema} from '../../../../lib/db';
import {isAdmin,logAction,passwordHash} from '../../../../lib/auth';
const bad=()=>NextResponse.json({error:'Unauthorized'},{status:401});
const asBool=(v:any)=>v===true||v==='true'||v===1||v==='1';

export async function GET(){
 if(!(await isAdmin()))return bad(); if(!db)return NextResponse.json({admins:[],logs:[],settings:{},broadcasts:[]}); await ensureSchema();
 const [admins,logs,settingsRows,broadcasts]=await Promise.all([
  db`SELECT id,username,display_name,minecraft_nick,profile_description,avatar_url,url,district_id,is_admin,is_creator,role,session_version,created_at FROM admins ORDER BY id DESC`,
  db`SELECT * FROM action_log ORDER BY created_at DESC LIMIT 10`,
  db`SELECT key,value FROM settings ORDER BY key`,
  db`SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 30`
 ]);
 return NextResponse.json({admins,logs,settings:Object.fromEntries(settingsRows.map((x:any)=>[String(x.key),String(x.value)])),broadcasts});
}
async function validateAccount(x:any,excludeId?:number){
 const username=String(x.username||'').trim(); if(!username)return 'Введите логин'; if(username==='0')return 'Логин 0 зарезервирован владельцем';
 const creator=asBool(x.is_creator); if(creator&&!String(x.minecraft_nick||'').trim())return 'Для создателя района укажите ник в Minecraft'; if(creator&&(x.district_id==null||x.district_id===''))return 'Для создателя района выберите район'; if(!asBool(x.is_admin)&&!creator)return 'Выберите хотя бы одну роль';
 const rows=excludeId?await db!`SELECT id FROM admins WHERE username=${username} AND id<>${excludeId} LIMIT 1`:await db!`SELECT id FROM admins WHERE username=${username} LIMIT 1`; if(rows.length)return 'Такой логин уже существует'; return null;
}
async function setSettings(values:Record<string,string>){for(const [key,value] of Object.entries(values)){await db!`INSERT INTO settings(key,value,updated_at) VALUES(${key},${value},NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`}}

export async function POST(req:Request){
 if(!(await isAdmin()))return bad(); if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503}); await ensureSchema(); const x=await req.json();
 try{
  if(x.type==='admin'){
   if(!x.password)return NextResponse.json({error:'Введите пароль'},{status:400}); const er=await validateAccount(x);if(er)return NextResponse.json({error:er},{status:400}); const ia=asBool(x.is_admin),ic=asBool(x.is_creator),role=ia?'admin':ic?'creator':'user';
   await db`INSERT INTO admins(username,password_hash,display_name,minecraft_nick,profile_description,avatar_url,url,district_id,is_admin,is_creator,role) VALUES(${String(x.username).trim()},${passwordHash(String(x.password))},${String(x.display_name||'')},${String(x.minecraft_nick||'').trim()||null},${String(x.profile_description||'')},${x.avatar_url||null},${x.url||null},${x.district_id===''||x.district_id==null?null:Number(x.district_id)},${ia},${ic},${role})`;
   await logAction('Добавлен аккаунт',String(x.username).trim()); return NextResponse.json({ok:true});
  }
  if(x.type==='settings'){
   const v={app_version:String(x.app_version||'').trim(),app_description:String(x.app_description||'').trim(),megamine_date:String(x.megamine_date||'').trim()}; if(!v.app_version)return NextResponse.json({error:'Введите версию сайта'},{status:400}); await setSettings(v); await logAction('Изменены настройки сайта',`Версия ${v.app_version}; дата ${v.megamine_date||'автоматическая'}`); return NextResponse.json({ok:true});
  }
  if(x.type==='broadcast'){
   const title=String(x.title||'').trim(),body=String(x.body||'').trim();if(!title)return NextResponse.json({error:'Введите заголовок рассылки'},{status:400}); await db`INSERT INTO broadcasts(title,body,active) VALUES(${title},${body},${asBool(x.active)})`; await logAction('Создана рассылка',title);return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:'Неизвестный тип'},{status:400});
 }catch(e:any){return NextResponse.json({error:e?.message||'Ошибка сохранения'},{status:400})}
}
export async function PUT(req:Request){
 if(!(await isAdmin()))return bad();if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});await ensureSchema();const x=await req.json();
 try{
  if(x.type==='admin'){
   const id=Number(x.id);const er=await validateAccount(x,id);if(er)return NextResponse.json({error:er},{status:400});const ia=asBool(x.is_admin),ic=asBool(x.is_creator),role=ia?'admin':ic?'creator':'user';
   if(String(x.password||'')){await db`UPDATE admins SET username=${String(x.username).trim()},display_name=${String(x.display_name||'')},minecraft_nick=${String(x.minecraft_nick||'').trim()||null},profile_description=${String(x.profile_description||'')},avatar_url=${x.avatar_url||null},url=${x.url||null},district_id=${x.district_id===''||x.district_id==null?null:Number(x.district_id)},is_admin=${ia},is_creator=${ic},role=${role},password_hash=${passwordHash(String(x.password))},session_version=session_version+1 WHERE id=${id}`;await logAction('Изменён пароль аккаунта',`${x.username} — старые сессии завершены`)}else{await db`UPDATE admins SET username=${String(x.username).trim()},display_name=${String(x.display_name||'')},minecraft_nick=${String(x.minecraft_nick||'').trim()||null},profile_description=${String(x.profile_description||'')},avatar_url=${x.avatar_url||null},url=${x.url||null},district_id=${x.district_id===''||x.district_id==null?null:Number(x.district_id)},is_admin=${ia},is_creator=${ic},role=${role} WHERE id=${id}`;await logAction('Изменён аккаунт',String(x.username))} return NextResponse.json({ok:true});
  }
  if(x.type==='broadcast'){const id=Number(x.id);await db`UPDATE broadcasts SET title=${String(x.title||'').trim()},body=${String(x.body||'')},active=${asBool(x.active)},updated_at=NOW() WHERE id=${id}`;await logAction('Изменена рассылка',String(x.title||''));return NextResponse.json({ok:true})}
  return NextResponse.json({error:'Неизвестный тип'},{status:400});
 }catch(e:any){return NextResponse.json({error:e?.message||'Ошибка сохранения'},{status:400})}
}
export async function DELETE(req:Request){if(!(await isAdmin()))return bad();if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});await ensureSchema();const x=await req.json();if(x.type==='admin'){await db`DELETE FROM admins WHERE id=${Number(x.id)}`;await logAction('Удалён аккаунт',String(x.id));return NextResponse.json({ok:true})}if(x.type==='broadcast'){await db`DELETE FROM broadcasts WHERE id=${Number(x.id)}`;await logAction('Удалена рассылка',String(x.id));return NextResponse.json({ok:true})}return NextResponse.json({error:'Неизвестный тип'},{status:400})}
