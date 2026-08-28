import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../lib/db';
import { isAdmin } from '../../../lib/auth';

const kinds=['news','district','tab','link'] as const;
function slugify(s:string){return s.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString(36)}
function cleanText(v:any){return String(v??'').trim();}
function normalizeUrl(v:any){return cleanText(v).replace(/\/$/,'').toLowerCase();}
function normalizeLinks(value:any){
 const raw=Array.isArray(value)?value:[];
 const links=raw.map((x:any)=>({title:cleanText(x?.title),url:cleanText(x?.url)})).filter((x:any)=>x.title&&x.url);
 const seen=new Set<string>();
 for(const link of links){
  const key=`${link.title.toLowerCase()}|${normalizeUrl(link.url)}`;
  if(seen.has(key)) throw new Error('Одинаковые ссылки нельзя добавлять повторно.');
  seen.add(key);
 }
 return links;
}
function payload(x:any){
 const kind=kinds.includes(x.kind)?x.kind:'news';
 return {kind,title:cleanText(x.title),body:String(x.body||''),image_url:cleanText(x.image_url)||null,video_url:cleanText(x.video_url)||null,published_at:x.published_at?new Date(x.published_at):null,url:cleanText(x.url)||null,extra_links:normalizeLinks(x.extra_links),sort_order:Number(x.sort_order)||0}
}
async function duplicateError(x:any,id?:number){
 if(!db) return null;
 const titleRows=id
  ?await db`SELECT id FROM content WHERE kind=${x.kind} AND LOWER(TRIM(title))=LOWER(TRIM(${x.title})) AND id<>${id} LIMIT 1`
  :await db`SELECT id FROM content WHERE kind=${x.kind} AND LOWER(TRIM(title))=LOWER(TRIM(${x.title})) LIMIT 1`;
 if(titleRows.length) return `Элемент «${x.title}» уже существует в разделе «${x.kind==='news'?'Новости':x.kind==='district'?'Районы':x.kind==='tab'?'Вкладки':'Каналы и ссылки'}». Повторное создание запрещено.`;
 if(x.kind==='link' && x.url){
  const urlRows=id
   ?await db`SELECT id FROM content WHERE kind='link' AND LOWER(TRIM(COALESCE(url,'')))=LOWER(TRIM(${x.url})) AND id<>${id} LIMIT 1`
   :await db`SELECT id FROM content WHERE kind='link' AND LOWER(TRIM(COALESCE(url,'')))=LOWER(TRIM(${x.url})) LIMIT 1`;
  if(urlRows.length) return 'Такая ссылка уже существует в разделе «Каналы и ссылки». Повторное создание запрещено.';
 }
 return null;
}
function dbError(error:any){
 console.error('Content API error:',error);
 return NextResponse.json({error:'Ошибка базы данных. Проверьте DATABASE_URL и подключение базы.'},{status:503});
}

export async function GET(){
 if(!db) return NextResponse.json([]);
 try{await ensureSchema();return NextResponse.json(await db`SELECT * FROM content ORDER BY sort_order ASC, created_at DESC`)}catch(error){return dbError(error)}
}
export async function POST(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 try{
  await ensureSchema(); const x=payload(await req.json());
  if(!x.title) return NextResponse.json({error:'Введите название'},{status:400});
  const duplicate=await duplicateError(x); if(duplicate) return NextResponse.json({error:duplicate},{status:409});
  const slug=slugify(x.title);
  const rows=await db`INSERT INTO content (kind,title,slug,body,image_url,video_url,published_at,url,extra_links,sort_order) VALUES (${x.kind},${x.title},${slug},${x.body},${x.image_url},${x.video_url},${x.published_at},${x.url},${JSON.stringify(x.extra_links)}::jsonb,${x.sort_order}) RETURNING *`;
  return NextResponse.json(rows[0]);
 }catch(error:any){if(error?.message?.includes('Одинаковые ссылки'))return NextResponse.json({error:error.message},{status:409});return dbError(error)}
}
export async function PUT(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 try{
  await ensureSchema(); const raw=await req.json(); if(!raw.id) return NextResponse.json({error:'Нет id'},{status:400}); const x=payload(raw);
  if(!x.title) return NextResponse.json({error:'Введите название'},{status:400});
  const duplicate=await duplicateError(x,Number(raw.id)); if(duplicate) return NextResponse.json({error:duplicate},{status:409});
  const rows=await db`UPDATE content SET kind=${x.kind}, title=${x.title}, body=${x.body}, image_url=${x.image_url}, video_url=${x.video_url}, published_at=${x.published_at}, url=${x.url}, extra_links=${JSON.stringify(x.extra_links)}::jsonb, sort_order=${x.sort_order} WHERE id=${raw.id} RETURNING *`;
  if(!rows[0]) return NextResponse.json({error:'Элемент не найден'},{status:404});
  return NextResponse.json(rows[0]);
 }catch(error:any){if(error?.message?.includes('Одинаковые ссылки'))return NextResponse.json({error:error.message},{status:409});return dbError(error)}
}
export async function DELETE(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 try{await ensureSchema();const {id}=await req.json();await db`DELETE FROM content WHERE id=${id}`;return NextResponse.json({ok:true})}catch(error){return dbError(error)}
}
