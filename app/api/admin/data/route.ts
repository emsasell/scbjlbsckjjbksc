import {NextResponse} from 'next/server';
import {db,ensureSchema} from '../../../../lib/db';
import {isAdmin,logAction,setAdminPassword} from '../../../../lib/auth';
const bad=()=>NextResponse.json({error:'Unauthorized'},{status:401});
const asBool=(v:any)=>v===true||v==='true'||v===1||v==='1';
async function setSettings(values:Record<string,string>){for(const [key,value] of Object.entries(values)){await db!`INSERT INTO settings(key,value,updated_at) VALUES(${key},${value},NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`}}
export async function GET(){
 if(!(await isAdmin()))return bad();
 if(!db)return NextResponse.json({logs:[],settings:{},broadcasts:[]});
 await ensureSchema();
 const [logs,settingsRows,broadcasts]=await Promise.all([
  db`SELECT * FROM action_log ORDER BY created_at DESC LIMIT 10`,
  db`SELECT key,value FROM settings WHERE key IN ('app_version','app_description','megamine_date') ORDER BY key`,
  db`SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 50`
 ]);
 return NextResponse.json({logs,settings:Object.fromEntries(settingsRows.map((x:any)=>[String(x.key),String(x.value)])),broadcasts});
}
export async function POST(req:Request){
 if(!(await isAdmin()))return bad();if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});await ensureSchema();
 const x=await req.json().catch(()=>({}));
 try{
  if(x.type==='settings'){
   const v={app_version:String(x.app_version||'').trim(),app_description:String(x.app_description||'').trim(),megamine_date:String(x.megamine_date||'').trim()};
   if(!v.app_version)return NextResponse.json({error:'Введите версию сайта'},{status:400});
   if(v.megamine_date&&!/^\d{4}-\d{2}-\d{2}$/.test(v.megamine_date))return NextResponse.json({error:'Некорректная дата'},{status:400});
   await setSettings(v);
   if(String(x.new_password||'')){await setAdminPassword(String(x.new_password));await logAction('Изменён пароль админ-панели','Все старые сессии завершены')}else await logAction('Изменены настройки сайта',`Версия ${v.app_version}; дата ${v.megamine_date||'автоматическая'}`);
   return NextResponse.json({ok:true});
  }
  if(x.type==='broadcast'){
   const title=String(x.title||'').trim(),body=String(x.body||'').trim();if(!title)return NextResponse.json({error:'Введите заголовок рассылки'},{status:400});
   await db`INSERT INTO broadcasts(title,body,active) VALUES(${title},${body},${asBool(x.active)})`;await logAction('Создана рассылка',title);return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:'Неизвестный тип'},{status:400});
 }catch(e:any){return NextResponse.json({error:e?.message||'Ошибка сохранения'},{status:400})}
}
export async function PUT(req:Request){
 if(!(await isAdmin()))return bad();if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});await ensureSchema();const x=await req.json().catch(()=>({}));
 try{if(x.type==='broadcast'){const id=Number(x.id),title=String(x.title||'').trim();if(!id||!title)return NextResponse.json({error:'Некорректные данные рассылки'},{status:400});await db`UPDATE broadcasts SET title=${title},body=${String(x.body||'')},active=${asBool(x.active)},updated_at=NOW() WHERE id=${id}`;await logAction('Изменена рассылка',title);return NextResponse.json({ok:true})}return NextResponse.json({error:'Неизвестный тип'},{status:400})}catch(e:any){return NextResponse.json({error:e?.message||'Ошибка сохранения'},{status:400})}
}
export async function DELETE(req:Request){
 if(!(await isAdmin()))return bad();if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});await ensureSchema();const x=await req.json().catch(()=>({}));
 if(x.type==='broadcast'){await db`DELETE FROM broadcasts WHERE id=${Number(x.id)}`;await logAction('Удалена рассылка',String(x.id));return NextResponse.json({ok:true})}
 return NextResponse.json({error:'Неизвестный тип'},{status:400});
}
