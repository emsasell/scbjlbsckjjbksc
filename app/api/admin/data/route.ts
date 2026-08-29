import {NextResponse} from 'next/server';
import {db,ensureSchema} from '../../../../lib/db';
import {isAdmin,logAction,setAdminPassword} from '../../../../lib/auth';
const bad=()=>NextResponse.json({error:'Unauthorized'},{status:401});
const asBool=(v:any)=>v===true||v==='true'||v===1||v==='1';
async function setSettings(values:Record<string,string>){for(const [key,value] of Object.entries(values)){await db!`INSERT INTO settings(key,value,updated_at) VALUES(${key},${value},NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`}}
export async function GET(){
 if(!(await isAdmin()))return bad();
 if(!db)return NextResponse.json({settings:{},broadcasts:[]});
 await ensureSchema();
 const [settingsRows,broadcasts,updates]=await Promise.all([
  db`SELECT key,value FROM settings WHERE key IN ('app_version','app_description','megamine_date','current_update_title','current_update_date') ORDER BY key`,
  db`SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 50`,
  db`SELECT * FROM site_updates ORDER BY COALESCE(update_date,created_at::date) DESC, id DESC LIMIT 100`
 ]);
 const stored=Object.fromEntries(settingsRows.map((x:any)=>[String(x.key),String(x.value)]));
 return NextResponse.json({settings:{app_version:'1.0.0',app_description:'',megamine_date:'',current_update_title:'',current_update_date:'',...stored},broadcasts,updates});
}
export async function POST(req:Request){
 if(!(await isAdmin()))return bad();if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});await ensureSchema();
 const x=await req.json().catch(()=>({}));
 try{
  if(x.type==='settings'){
   const v={app_version:String(x.app_version||'').trim(),app_description:String(x.app_description||'').trim(),megamine_date:String(x.megamine_date||'').trim(),current_update_title:String(x.current_update_title||'').trim(),current_update_date:String(x.current_update_date||'').trim()};
   if(!v.app_version)return NextResponse.json({error:'Введите версию сайта'},{status:400});
   for(const dateValue of [v.megamine_date,v.current_update_date]) if(dateValue&&!/^\d{4}-\d{2}-\d{2}$/.test(dateValue))return NextResponse.json({error:'Некорректная дата'},{status:400});
   const beforeRows=await db`SELECT key,value FROM settings WHERE key IN ('app_version','app_description','megamine_date','current_update_title','current_update_date')`;
   const before=Object.fromEntries(beforeRows.map((r:any)=>[String(r.key),String(r.value)]));
   await setSettings(v);
   const changed=Object.entries(v).filter(([k,value])=>String(before[k]??'')!==String(value)).map(([k])=>({app_version:'версия',app_description:'описание обновления',megamine_date:'дата MegaMine',current_update_title:'название текущего обновления',current_update_date:'дата обновления'} as Record<string,string>)[k]||k);
   if(String(x.new_password||'')){await setAdminPassword(String(x.new_password));await logAction('Изменён пароль админ-панели',`Изменены настройки: ${changed.join(', ')||'нет'}; все старые сессии завершены`)}else await logAction('Изменены настройки сайта',`Изменено: ${changed.join(', ')||'нет изменений'}; версия ${v.app_version}`);
   return NextResponse.json({ok:true});
  }
  if(x.type==='update'){
   const version=String(x.version||'').trim(),title=String(x.title||'').trim(),description=String(x.description||'').trim(),updateDate=String(x.update_date||'').trim();
   if(!version||!title||!description||!updateDate)return NextResponse.json({error:'Заполните версию, название, описание и дату записи истории'},{status:400});
   if(!/^\d{4}-\d{2}-\d{2}$/.test(updateDate))return NextResponse.json({error:'Некорректная дата записи истории'},{status:400});
   await db`INSERT INTO site_updates(version,title,description,update_date) VALUES(${version},${title},${description},${updateDate}::date)`;
   await logAction('Создана запись истории обновлений',`${version}: ${title}`);
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
 try{
  if(x.type==='update'){
   const id=Number(x.id),version=String(x.version||'').trim(),title=String(x.title||'').trim(),description=String(x.description||'').trim(),updateDate=String(x.update_date||'').trim();
   if(!id||!version||!title||!description||!updateDate)return NextResponse.json({error:'Заполните все поля записи истории'},{status:400});
   if(!/^\d{4}-\d{2}-\d{2}$/.test(updateDate))return NextResponse.json({error:'Некорректная дата записи истории'},{status:400});
   const rows=await db`UPDATE site_updates SET version=${version},title=${title},description=${description},update_date=${updateDate}::date WHERE id=${id} RETURNING id`;
   if(!rows.length)return NextResponse.json({error:'Запись истории не найдена'},{status:404});
   await logAction('Изменена запись истории обновлений',`${version}: ${title}`);return NextResponse.json({ok:true});
  }
  if(x.type==='broadcast'){const id=Number(x.id),title=String(x.title||'').trim();if(!id||!title)return NextResponse.json({error:'Некорректные данные рассылки'},{status:400});await db`UPDATE broadcasts SET title=${title},body=${String(x.body||'')},active=${asBool(x.active)},updated_at=NOW() WHERE id=${id}`;await logAction('Изменена рассылка',title);return NextResponse.json({ok:true})}
  return NextResponse.json({error:'Неизвестный тип'},{status:400})
 }catch(e:any){return NextResponse.json({error:e?.message||'Ошибка сохранения'},{status:400})}
}
export async function DELETE(req:Request){
 if(!(await isAdmin()))return bad();if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});await ensureSchema();const x=await req.json().catch(()=>({}));
 if(x.type==='broadcast'){const id=Number(x.id);const before=await db`SELECT title FROM broadcasts WHERE id=${id}`;await db`DELETE FROM broadcasts WHERE id=${id}`;await logAction('Удалена рассылка',before[0]?.title||`ID ${id}`);return NextResponse.json({ok:true})}
 if(x.type==='update'){const id=Number(x.id);const before=await db`SELECT version,title FROM site_updates WHERE id=${id}`;await db`DELETE FROM site_updates WHERE id=${id}`;await logAction('Удалена запись обновления',before[0]?`${before[0].version}: ${before[0].title}`:`ID ${id}`);return NextResponse.json({ok:true})}
 return NextResponse.json({error:'Неизвестный тип'},{status:400});
}
