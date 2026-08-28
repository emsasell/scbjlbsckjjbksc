import {NextResponse} from 'next/server';
import {db,ensureSchema} from '@/lib/db';
import {sessionUser,isAdmin,logAction} from '@/lib/auth';

const slug=(s:string)=>s.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-|-$/g,'')+'-'+Date.now();
export async function GET(){
  const user=await sessionUser();
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!db)return NextResponse.json([]);
  await ensureSchema();
  const rows=await db`SELECT * FROM content WHERE creator_id=${user.id||-1} ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}
export async function POST(req:Request){
  const user=await sessionUser();
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
  await ensureSchema();
  const x=await req.json();
  const title=String(x.title||'').trim();
  const body=String(x.body||'');
  if(!title)return NextResponse.json({error:'Введите название'},{status:400});
  const admin=await isAdmin();
  const districtId=admin ? (x.district_id==null?null:Number(x.district_id)) : user.district_id;
  if(!admin&&!districtId)return NextResponse.json({error:'К вашему логину не привязан район'},{status:403});
  const status=admin?'published':'pending';
  const result=await db`INSERT INTO content(kind,title,slug,body,image_url,published_at,url,status,creator_id) VALUES('news',${title},${slug(title)},${body},${x.image_url||null},NOW(),${x.url||null},${status},${user.id||null}) RETURNING *`;
  await logAction(admin?'Опубликована новость':'Отправлена новость на модерацию',title);
  return NextResponse.json({ok:true,item:result[0]});
}
