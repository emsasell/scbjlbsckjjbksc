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
  // Любой создатель района отправляет материал именно как заявку, даже если
  // этому же логину дополнительно выдан доступ администратора.
  const creatorSubmission=!!user.is_creator;
  const districtId=creatorSubmission ? user.district_id : (admin ? (x.district_id==null?null:Number(x.district_id)) : user.district_id);
  if(!admin&&!creatorSubmission)return NextResponse.json({error:'У этого аккаунта нет права создавать новости'},{status:403});
  if(creatorSubmission&&!districtId)return NextResponse.json({error:'К вашему логину не привязан район'},{status:403});
  if(creatorSubmission && (x.video_url||x.video_title||x.video_description||x.video_preview)) return NextResponse.json({error:'Создатель района не может публиковать видео. Видео добавляют только администраторы.'},{status:403});
  const status=creatorSubmission?'pending':'published';
  const result=status==='pending'
    ? await db`INSERT INTO content(kind,title,slug,body,image_url,published_at,url,status,creator_id) VALUES('news',${title},${slug(title)},${body},${x.image_url||null},NULL,${x.url||null},'pending',${user.id||null}) RETURNING *`
    : await db`INSERT INTO content(kind,title,slug,body,image_url,published_at,url,status,creator_id) VALUES('news',${title},${slug(title)},${body},${x.image_url||null},NOW(),${x.url||null},'published',${user.id||null}) RETURNING *`;
  await logAction(status==='published'?'Опубликована новость':'Отправлена новость на модерацию',title);
  return NextResponse.json({ok:true,item:result[0]});
}
