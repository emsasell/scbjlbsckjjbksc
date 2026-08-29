import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../../lib/db';
import { isAdmin, logAction } from '../../../../lib/auth';

const allowed=new Set(['news','district','tab','link','video']);
type ContentRow={id:number|string;title:string};

export async function POST(req:Request){
 if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 try{
  await ensureSchema();
  const body=await req.json();
  const kind=String(body.kind||'');
  const ids:number[]=Array.isArray(body.ids)?body.ids.map(Number).filter(Number.isFinite):[];
  if(!allowed.has(kind)||!ids.length)return NextResponse.json({error:'Некорректный порядок'},{status:400});
  const unique=[...new Set(ids)];
  if(unique.length!==ids.length)return NextResponse.json({error:'Некорректный список элементов'},{status:400});

  const rows=await db<ContentRow[]>`SELECT id,title FROM content WHERE kind=${kind} AND id=ANY(${ids})`;
  if(rows.length!==ids.length)return NextResponse.json({error:'В списке есть элементы не этого типа или удалённые элементы'},{status:400});

  await db.begin(async (tx:any)=>{
    for(let i=0;i<ids.length;i++){
      await tx`UPDATE content SET sort_order=${i*10}, updated_at=NOW() WHERE id=${ids[i]} AND kind=${kind}`;
    }
  });

  const byId=new Map(rows.map((row:ContentRow)=>[Number(row.id),row.title]));
  const names=ids.map((id:number)=>byId.get(id)||String(id));
  await logAction('Изменён порядок элементов',`${kind}: ${names.join(' → ')} (ID: ${ids.join(', ')})`);
  return NextResponse.json({ok:true,ids});
 }catch(error:any){
  console.error('Content order API error:',error);
  return NextResponse.json({error:'Не удалось сохранить порядок: '+String(error?.message||'ошибка')},{status:500});
 }
}
