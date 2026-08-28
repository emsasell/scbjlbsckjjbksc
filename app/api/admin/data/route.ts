import {NextResponse} from 'next/server';
import {db,ensureSchema} from '../../../../lib/db';
import {isAdmin,logAction,passwordHash} from '../../../../lib/auth';

const bad=()=>NextResponse.json({error:'Unauthorized'},{status:401});
const asBool=(v:any)=>v===true||v==='true'||v===1||v==='1';

export async function GET(){
  if(!(await isAdmin()))return bad();
  if(!db)return NextResponse.json({admins:[],creators:[],logs:[],settings:{}});
  await ensureSchema();
  const [admins,creators,logs,settingsRows]=await Promise.all([
    db`SELECT id,username,display_name,minecraft_nick,profile_description,avatar_url,url,district_id,is_admin,is_creator,role,session_version,created_at FROM admins ORDER BY id DESC`,
    db`SELECT * FROM creators ORDER BY id DESC`,
    db`SELECT * FROM action_log ORDER BY created_at DESC LIMIT 10`,
    db`SELECT key,value FROM settings ORDER BY key`
  ]);
  const settings=Object.fromEntries(settingsRows.map((x:any)=>[String(x.key),String(x.value)]));
  return NextResponse.json({admins,creators,logs,settings});
}

async function validateAccount(x:any, excludeId?:number){
  const username=String(x.username||'').trim();
  if(!username)return 'Введите логин';
  if(username==='0')return 'Логин 0 зарезервирован владельцем';
  const isCreator=asBool(x.is_creator);
  if(isCreator&&!String(x.minecraft_nick||'').trim())return 'Для создателя района укажите ник в Minecraft';
  if(isCreator&&(x.district_id===null||x.district_id===undefined||x.district_id===''))return 'Для создателя района выберите район';
  if(!asBool(x.is_admin)&&!isCreator)return 'Выберите хотя бы одну роль: админ или создатель района';
  const dupe=excludeId
    ? await db!`SELECT id FROM admins WHERE username=${username} AND id<>${excludeId} LIMIT 1`
    : await db!`SELECT id FROM admins WHERE username=${username} LIMIT 1`;
  if(dupe.length)return 'Такой логин уже существует';
  return null;
}

export async function POST(req:Request){
  if(!(await isAdmin()))return bad();
  if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
  await ensureSchema();
  const x=await req.json();
  const type=String(x.type||'');
  try{
    if(type==='admin'){
      if(!x.password)return NextResponse.json({error:'Введите пароль'},{status:400});
      const error=await validateAccount(x); if(error)return NextResponse.json({error},{status:400});
      const isAdminRole=asBool(x.is_admin), isCreator=asBool(x.is_creator);
      const role=isAdminRole?'admin':isCreator?'creator':'user';
      await db`INSERT INTO admins(username,password_hash,display_name,minecraft_nick,profile_description,avatar_url,url,district_id,is_admin,is_creator,role)
        VALUES(${String(x.username).trim()},${passwordHash(String(x.password))},${String(x.display_name||'')},${String(x.minecraft_nick||'').trim()||null},${String(x.profile_description||'')},${x.avatar_url||null},${x.url||null},${x.district_id===''||x.district_id==null?null:Number(x.district_id)},${isAdminRole},${isCreator},${role})`;
      await logAction('Добавлен аккаунт',`${String(x.username).trim()}${isAdminRole?' • админ':''}${isCreator?' • создатель района':''}`);
      return NextResponse.json({ok:true});
    }
    if(type==='version'){
      const values:any={
        app_version:String(x.app_version||'').trim(),
        app_description:String(x.app_description||'').trim(),
        minecraft_java:String(x.minecraft_java||'').trim(),
        minecraft_bedrock:String(x.minecraft_bedrock||'').trim()
      };
      if(!values.app_version)return NextResponse.json({error:'Введите версию сайта'},{status:400});
      const settingPairs: Array<[string,string]> = [
        ['app_version', values.app_version],
        ['app_description', values.app_description],
        ['minecraft_java', values.minecraft_java],
        ['minecraft_bedrock', values.minecraft_bedrock]
      ];
      for(const pair of settingPairs){
        const key = pair[0];
        const value = pair[1];
        await db`INSERT INTO settings(key,value,updated_at) VALUES(${key},${value},NOW())
          ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`;
      }
      await logAction('Изменены версии',`Сайт ${values.app_version}; Java ${values.minecraft_java||'—'}; Bedrock ${values.minecraft_bedrock||'—'}`);
      return NextResponse.json({ok:true});
    }
    return NextResponse.json({error:'Неизвестный тип'},{status:400});
  }catch(e:any){return NextResponse.json({error:e?.message||'Ошибка сохранения'},{status:400})}
}

export async function PUT(req:Request){
  if(!(await isAdmin()))return bad();
  if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
  await ensureSchema();
  const x=await req.json();
  if(x.type!=='admin')return NextResponse.json({error:'Неизвестный тип'},{status:400});
  const id=Number(x.id); if(!Number.isFinite(id))return NextResponse.json({error:'Некорректный id'},{status:400});
  const error=await validateAccount(x,id); if(error)return NextResponse.json({error},{status:400});
  const isAdminRole=asBool(x.is_admin),isCreator=asBool(x.is_creator);
  const role=isAdminRole?'admin':isCreator?'creator':'user';
  const common=[
    String(x.username).trim(),String(x.display_name||''),String(x.minecraft_nick||'').trim()||null,
    String(x.profile_description||''),x.avatar_url||null,x.url||null,
    x.district_id===''||x.district_id==null?null:Number(x.district_id),isAdminRole,isCreator,role
  ];
  if(String(x.password||'')){
    await db`UPDATE admins SET username=${common[0]},display_name=${common[1]},minecraft_nick=${common[2]},profile_description=${common[3]},avatar_url=${common[4]},url=${common[5]},district_id=${common[6]},is_admin=${common[7]},is_creator=${common[8]},role=${common[9]},password_hash=${passwordHash(String(x.password))},session_version=session_version+1 WHERE id=${id}`;
    await logAction('Изменён аккаунт и пароль',`${common[0]} — его старые сессии завершены`);
  }else{
    await db`UPDATE admins SET username=${common[0]},display_name=${common[1]},minecraft_nick=${common[2]},profile_description=${common[3]},avatar_url=${common[4]},url=${common[5]},district_id=${common[6]},is_admin=${common[7]},is_creator=${common[8]},role=${common[9]} WHERE id=${id}`;
    await logAction('Изменён аккаунт',String(common[0]));
  }
  return NextResponse.json({ok:true});
}

export async function DELETE(req:Request){
  if(!(await isAdmin()))return bad();
  if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
  await ensureSchema();
  const x=await req.json();
  if(x.type==='admin'){
    await db`DELETE FROM admins WHERE id=${Number(x.id)}`;
    await logAction('Удалён аккаунт',String(x.id));
    return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:'Неизвестный тип'},{status:400});
}
