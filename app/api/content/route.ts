import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../lib/db';
import { isAdmin } from '../../../lib/auth';

const kinds=['news','district','tab','link'] as const;
async function log(action:string,details:string){try{if(db)await db`INSERT INTO action_log (actor,action,details) VALUES ('superadmin',${action},${details})`}catch{}}
function slugify(s:string){return s.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString(36)}
function cleanText(v:any){return String(v??'').trim()}
function normalizeUrl(v:any){return cleanText(v).replace(/\/$/,'').toLowerCase()}
function validUrl(v:string){ if(!v) return true; try{const u=new URL(v);return u.protocol==='http:'||u.protocol==='https:'}catch{return false} }
function normalizeLinks(value:any){
 const raw=Array.isArray(value)?value:[];
 const links=raw.map((x:any)=>({title:cleanText(x?.title),url:cleanText(x?.url)})).filter((x:any)=>x.title||x.url);
 if(links.some((x:any)=>!x.title||!x.url)) throw new Error('У каждой дополнительной ссылки должны быть заполнены название и URL.');
 if(links.some((x:any)=>!validUrl(x.url))) throw new Error('Укажите корректный URL ссылки, начинающийся с http:// или https://.');
 const seen=new Set<string>();
 for(const link of links){const key=`${link.title.toLowerCase()}|${normalizeUrl(link.url)}`;if(seen.has(key))throw new Error('Одинаковые ссылки нельзя добавлять повторно.');seen.add(key)}
 return links;
}
function safePublished(v:any, kind:string){
 if(!v) return kind==='news'?new Date():null;
 const d=new Date(String(v));
 if(Number.isNaN(d.getTime())) throw new Error('Некорректная дата публикации.');
 return d;
}
function payload(x:any){
 const kind=kinds.includes(x.kind)?x.kind:'news'; const url=cleanText(x.url)||null;
 if(kind==='link'&&!url) throw new Error('Для канала или ссылки необходимо указать URL.');
 if(url&&!validUrl(url)) throw new Error('Укажите корректный URL, начинающийся с http:// или https://.');
 return {kind,title:cleanText(x.title),body:String(x.body||''),image_url:cleanText(x.image_url)||null,video_url:cleanText(x.video_url)||null,video_title:cleanText(x.video_title)||null,video_description:String(x.video_description||''),video_preview:cleanText(x.video_preview)||null,published_at:safePublished(x.published_at,kind),url,extra_links:normalizeLinks(x.extra_links),sort_order:Number(x.sort_order)||0}
}
async function duplicateError(x:any,id?:number){
 if(!db) return null;
 const titleRows=id?await db`SELECT id FROM content WHERE kind=${x.kind} AND LOWER(TRIM(title))=LOWER(TRIM(${x.title})) AND id<>${id} LIMIT 1`:await db`SELECT id FROM content WHERE kind=${x.kind} AND LOWER(TRIM(title))=LOWER(TRIM(${x.title})) LIMIT 1`;
 if(titleRows.length) return `Элемент «${x.title}» уже существует. Повторное создание запрещено.`;
 if(x.kind==='link'&&x.url){const rows=id?await db`SELECT id FROM content WHERE kind='link' AND LOWER(TRIM(COALESCE(url,'')))=LOWER(TRIM(${x.url})) AND id<>${id} LIMIT 1`:await db`SELECT id FROM content WHERE kind='link' AND LOWER(TRIM(COALESCE(url,'')))=LOWER(TRIM(${x.url})) LIMIT 1`;if(rows.length)return 'Такая ссылка уже существует. Повторное создание запрещено.'}
 return null;
}
function errorResponse(error:any){console.error('Content API error:',error);const raw=String(error?.message||'');const status=/duplicate|уже существует/i.test(raw)?409:/Некоррект|Укажите|необходимо|должны|Одинаковые/i.test(raw)?400:500;return NextResponse.json({error:status===500?'Не удалось сохранить данные: '+(raw||'ошибка сервера'):raw},{status})}
export async function GET(req:Request){
 const admin=new URL(req.url).searchParams.get('admin')==='1' && await isAdmin();
 if(!db) return NextResponse.json([],{headers:{'Cache-Control':'no-store'}});
 try{await ensureSchema();const rows=admin?await db`SELECT * FROM content ORDER BY sort_order ASC, COALESCE(published_at,created_at) DESC`:await db`SELECT * FROM content WHERE status='approved' AND (published_at IS NULL OR published_at<=NOW()) ORDER BY sort_order ASC, COALESCE(published_at,created_at) DESC`;return NextResponse.json(rows,{headers:{'Cache-Control':'no-store'}})}catch(error){return errorResponse(error)}
}
export async function POST(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 try{await ensureSchema();const x=payload(await req.json());if(!x.title)return NextResponse.json({error:'Введите название'},{status:400});const duplicate=await duplicateError(x);if(duplicate)return NextResponse.json({error:duplicate},{status:409});const rows=await db`INSERT INTO content (kind,title,slug,body,image_url,video_url,video_title,video_description,video_preview,published_at,url,extra_links,sort_order,status,created_at,updated_at) VALUES (${x.kind},${x.title},${slugify(x.title)},${x.body},${x.image_url},${x.video_url},${x.video_title},${x.video_description},${x.video_preview},${x.published_at},${x.url},${JSON.stringify(x.extra_links)}::jsonb,${x.sort_order},'approved',NOW(),NOW()) RETURNING *`;await log('Создание',`${x.kind}: ${x.title}`);return NextResponse.json(rows[0],{status:201})}catch(error){return errorResponse(error)}
}
export async function PUT(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401}); if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 try{await ensureSchema();const raw=await req.json();if(!raw.id)return NextResponse.json({error:'Нет id'},{status:400});const x=payload(raw);if(!x.title)return NextResponse.json({error:'Введите название'},{status:400});const duplicate=await duplicateError(x,Number(raw.id));if(duplicate)return NextResponse.json({error:duplicate},{status:409});const rows=await db`UPDATE content SET kind=${x.kind},title=${x.title},body=${x.body},image_url=${x.image_url},video_url=${x.video_url},video_title=${x.video_title},video_description=${x.video_description},video_preview=${x.video_preview},published_at=${x.published_at},url=${x.url},extra_links=${JSON.stringify(x.extra_links)}::jsonb,sort_order=${x.sort_order},updated_at=NOW() WHERE id=${raw.id} RETURNING *`;if(!rows[0])return NextResponse.json({error:'Элемент не найден'},{status:404});await log('Изменение',`${x.kind}: ${x.title}`);return NextResponse.json(rows[0])}catch(error){return errorResponse(error)}
}
export async function DELETE(req:Request){if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});try{await ensureSchema();const {id}=await req.json();await db`DELETE FROM content WHERE id=${id}`;await log('Удаление',`content id ${id}`);return NextResponse.json({ok:true})}catch(error){return errorResponse(error)}}
