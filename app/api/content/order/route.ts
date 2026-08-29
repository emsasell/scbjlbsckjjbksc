import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../../lib/db';
import { isAdmin, logAction } from '../../../../lib/auth';

const allowed=new Set(['news','district','tab','link','video']);
export async function POST(req:Request){
 if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 try{
  await ensureSchema();
  const body=await req.json(); const kind=String(body.kind||''); const ids=Array.isArray(body.ids)?body.ids.map(Number).filter(Number.isFinite):[];
  if(!allowed.has(kind)||!ids.length)return NextResponse.json({error:'Некорректный порядок'},{status:400});
  const unique=[...new Set(ids)]; if(unique.length!==ids.length)return NextResponse.json({error:'Некорректный список элементов'},{status:400});
  for(let i=0;i<ids.length;i++) await db`UPDATE content SET sort_order=${i*10}, updated_at=NOW() WHERE id=${ids[i]} AND kind=${kind}`;
  await logAction('Изменён порядок',`${kind}: ${ids.join(', ')}`);
  return NextResponse.json({ok:true});
 }catch(error:any){return NextResponse.json({error:'Не удалось сохранить порядок: '+String(error?.message||'ошибка')},{status:500})}
}
