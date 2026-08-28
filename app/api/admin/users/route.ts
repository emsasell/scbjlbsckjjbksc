import {NextResponse} from 'next/server';
import {db,ensureSchema} from '@/lib/db';
import {isAdmin} from '@/lib/auth';
import {hashPassword} from '@/lib/passwords';

async function log(action:string,details:string){
  if(db) await db`INSERT INTO action_log(actor,action,details) VALUES ('0',${action},${details})`;
}
function flags(x:any){
  const isDistrict=!!x.is_district;
  const isAdminRole=!!x.can_admin;
  // Keep backwards compatibility with old role field.
  const role=isDistrict?'district':(isAdminRole?'admin':'user');
  return {role,can_admin:isAdminRole};
}
export async function GET(){
  if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!db) return NextResponse.json([]);
  await ensureSchema();
  return NextResponse.json(await db`SELECT id,login,display_name,role,can_admin,district_id,created_at,updated_at FROM users ORDER BY id DESC`);
}
export async function POST(req:Request){
  if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
  try{
    await ensureSchema();
    const x=await req.json();
    const login=String(x.login||'').trim();
    const password=String(x.password||'');
    const f=flags(x);
    if(!login||!password) return NextResponse.json({error:'Укажите логин и пароль'},{status:400});
    if(!f.can_admin&&!x.is_district) return NextResponse.json({error:'Выберите хотя бы один доступ: админ или создатель района'},{status:400});
    if(x.is_district&&!x.district_id) return NextResponse.json({error:'Для создателя района выберите район'},{status:400});
    const r=await db`INSERT INTO users(login,password_hash,display_name,role,can_admin,district_id) VALUES (${login},${hashPassword(password)},${String(x.display_name||'')||null},${f.role},${f.can_admin},${x.is_district?Number(x.district_id):null}) RETURNING id,login,display_name,role,can_admin,district_id,created_at,updated_at`;
    await log('Создан аккаунт',`${login}; админ=${f.can_admin}; создатель района=${!!x.is_district}`);
    return NextResponse.json(r[0],{status:201});
  }catch(e:any){
    return NextResponse.json({error:/unique/i.test(e?.message||'')?'Такой логин уже существует':'Не удалось создать аккаунт'},{status:400});
  }
}
export async function PUT(req:Request){
  if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
  try{
    await ensureSchema();
    const x=await req.json();
    if(!x.id) return NextResponse.json({error:'Нет id'},{status:400});
    const login=String(x.login||'').trim();
    if(!login) return NextResponse.json({error:'Логин обязателен'},{status:400});
    const f=flags(x);
    if(!f.can_admin&&!x.is_district) return NextResponse.json({error:'Выберите хотя бы один доступ: админ или создатель района'},{status:400});
    if(x.is_district&&!x.district_id) return NextResponse.json({error:'Для создателя района выберите район'},{status:400});
    const r=x.password
      ? await db`UPDATE users SET login=${login},display_name=${String(x.display_name||'')||null},role=${f.role},can_admin=${f.can_admin},district_id=${x.is_district?Number(x.district_id):null},password_hash=${hashPassword(String(x.password))},updated_at=NOW() WHERE id=${Number(x.id)} RETURNING id,login,display_name,role,can_admin,district_id,created_at,updated_at`
      : await db`UPDATE users SET login=${login},display_name=${String(x.display_name||'')||null},role=${f.role},can_admin=${f.can_admin},district_id=${x.is_district?Number(x.district_id):null},updated_at=NOW() WHERE id=${Number(x.id)} RETURNING id,login,display_name,role,can_admin,district_id,created_at,updated_at`;
    if(!r[0]) return NextResponse.json({error:'Аккаунт не найден'},{status:404});
    await log('Изменён аккаунт',`${login}; админ=${f.can_admin}; создатель района=${!!x.is_district}`);
    return NextResponse.json(r[0]);
  }catch(e:any){return NextResponse.json({error:'Не удалось изменить аккаунт'},{status:400})}
}
export async function DELETE(req:Request){
  if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
  const {id}=await req.json();
  await db`DELETE FROM users WHERE id=${Number(id)}`;
  await log('Удалён аккаунт',String(id));
  return NextResponse.json({ok:true});
}
