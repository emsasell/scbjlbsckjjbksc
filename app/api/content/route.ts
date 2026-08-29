import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../lib/db';
import { isAdmin, logAction } from '../../../lib/auth';

const kinds=['news','district','tab','link','video'] as const;
function slugify(s:string){return s.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString(36)}
function cleanText(v:any){return String(v??'').trim()}
function normalizeUrl(v:any){return cleanText(v).replace(/\/$/,'').toLowerCase()}
function validUrl(v:string){ if(!v) return true; try{const u=new URL(v);return u.protocol==='http:'||u.protocol==='https:'}catch{return false} }
function normalizeLinks(value:any){
 const raw=Array.isArray(value)?value:[];
 const links=raw.map((x:any)=>({title:cleanText(x?.title),description:String(x?.description||'').trim(),image_url:cleanText(x?.image_url)||null,url:cleanText(x?.url)})).filter((x:any)=>x.title||x.url||x.description||x.image_url);
 if(links.some((x:any)=>!x.title||!x.url)) throw new Error('У каждой дополнительной ссылки должны быть заполнены название и URL.');
 if(links.some((x:any)=>!validUrl(x.url))) throw new Error('Укажите корректный URL ссылки, начинающийся с http:// или https://.');
 const seen=new Set<string>();
 for(const link of links){const key=`${link.title.toLowerCase()}|${normalizeUrl(link.url)}`;if(seen.has(key))throw new Error('Одинаковые ссылки нельзя добавлять повторно.');seen.add(key)}
 return links;
}

function normalizeTabPosts(value:any, kind:string){
 if(kind!=='tab') return [];
 const raw=Array.isArray(value)?value:[];
 return raw.map((x:any)=>({
  title:cleanText(x?.title),
  body:String(x?.body||'').trim(),
  image_url:cleanText(x?.image_url)||null,
  published_at:cleanText(x?.published_at)||null
 })).filter((x:any)=>x.title||x.body||x.image_url);
}

function safePublished(v:any, kind:string){ if(kind!=='news'&&kind!=='video') return null; if(!v)return new Date(); const raw=String(v); const d=/[zZ]|[+-]\d\d:?\d\d$/.test(raw)?new Date(raw):new Date(raw+'+04:00'); if(Number.isNaN(d.getTime()))throw new Error('Некорректная дата публикации.'); return d; }
function payload(x:any){
 const kind=kinds.includes(x.kind)?x.kind:'news'; const url=cleanText(x.url)||null;
 if(kind==='link'&&!url) throw new Error('Для канала или ссылки необходимо указать URL.');
 if(url&&!validUrl(url)) throw new Error('Укажите корректный URL, начинающийся с http:// или https://.');
 const published_at=safePublished(x.published_at,kind); const status=(kind==='news'||kind==='video')?(published_at&&published_at.getTime()>Date.now()?'scheduled':'published'):'published'; return {kind,title:cleanText(x.title),body:String(x.body||''),image_url:cleanText(x.image_url)||null,video_url:cleanText(x.video_url)||null,video_title:cleanText(x.video_title)||null,video_description:cleanText(x.video_description)||null,video_preview:cleanText(x.video_preview)||null,published_at,url,extra_links:normalizeLinks(x.extra_links),sort_order:Number(x.sort_order)||0,status,creator_id:x.creator_id?Number(x.creator_id):null,minecraft_version:cleanText(x.minecraft_version)||null,district_id:(kind==='tab'&&x.district_id!==''&&x.district_id!=null)?Number(x.district_id):null,tab_posts:normalizeTabPosts(x.tab_posts,kind)}
}
async function duplicateError(x:any,id?:number){
 if(!db) return null;
 const titleRows=id?await db`SELECT id FROM content WHERE kind=${x.kind} AND LOWER(TRIM(title))=LOWER(TRIM(${x.title})) AND id<>${id} LIMIT 1`:await db`SELECT id FROM content WHERE kind=${x.kind} AND LOWER(TRIM(title))=LOWER(TRIM(${x.title})) LIMIT 1`;
 if(titleRows.length) return `Элемент «${x.title}» уже существует. Повторное создание запрещено.`;
 if(x.kind==='link'&&x.url){const rows=id?await db`SELECT id FROM content WHERE kind='link' AND LOWER(TRIM(COALESCE(url,'')))=LOWER(TRIM(${x.url})) AND id<>${id} LIMIT 1`:await db`SELECT id FROM content WHERE kind='link' AND LOWER(TRIM(COALESCE(url,'')))=LOWER(TRIM(${x.url})) LIMIT 1`;if(rows.length)return 'Такая ссылка уже существует. Повторное создание запрещено.'}
 return null;
}
function valueForLog(v:any){if(v===null||v===undefined||v==='')return '—';if(typeof v==='object')return JSON.stringify(v);return String(v)}
function diffForLog(before:any,after:any){
 const fields:[string,string][]=[['kind','тип'],['title','название'],['body','описание'],['image_url','изображение'],['video_url','видео'],['video_preview','превью видео'],['published_at','дата публикации'],['url','URL'],['minecraft_version','версия Minecraft'],['district_id','привязанный район'],['extra_links','ссылки'],['tab_posts','материалы вкладки']];
 const changed=fields.filter(([key])=>JSON.stringify(before?.[key]??null)!==JSON.stringify(after?.[key]??null)).map(([key,label])=>label);
 return changed.length?changed.join(', '):'изменений полей не обнаружено';
}
function errorResponse(error:any){console.error('Content API error:',error);const raw=String(error?.message||'');const status=/duplicate|уже существует/i.test(raw)?409:/Некоррект|Укажите|необходимо|должны|Одинаковые/i.test(raw)?400:500;return NextResponse.json({error:status===500?'Не удалось сохранить данные: '+(raw||'ошибка сервера'):raw},{status})}
export async function GET(){
 if(!db) return NextResponse.json([],{headers:{'Cache-Control':'no-store'}});
 try{await ensureSchema();const rows=await db`SELECT * FROM content ORDER BY sort_order ASC, COALESCE(published_at,created_at) DESC`;return NextResponse.json(rows,{headers:{'Cache-Control':'no-store'}})}catch(error){return errorResponse(error)}
}
export async function POST(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 try{await ensureSchema();const x=payload(await req.json());if(!x.title)return NextResponse.json({error:'Введите название'},{status:400});const duplicate=await duplicateError(x);if(duplicate)return NextResponse.json({error:duplicate},{status:409});const rows=await db`INSERT INTO content (kind,title,slug,body,image_url,video_url,video_title,video_description,video_preview,published_at,url,extra_links,sort_order,status,creator_id,minecraft_version,district_id,tab_posts,created_at,updated_at) VALUES (${x.kind},${x.title},${slugify(x.title)},${x.body},${x.image_url},${x.video_url},${x.video_title},${x.video_description},${x.video_preview},${x.published_at},${x.url},${JSON.stringify(x.extra_links)}::jsonb,${x.sort_order},${x.status},${x.creator_id},${x.minecraft_version},${x.district_id},${JSON.stringify(x.tab_posts)}::jsonb,NOW(),NOW()) RETURNING *`;await logAction('Добавлен элемент',x.kind+': '+x.title);return NextResponse.json(rows[0],{status:201})}catch(error){return errorResponse(error)}
}
export async function PUT(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401}); if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 try{await ensureSchema();const raw=await req.json();if(!raw.id)return NextResponse.json({error:'Нет id'},{status:400});const x=payload(raw);if(!x.title)return NextResponse.json({error:'Введите название'},{status:400});const duplicate=await duplicateError(x,Number(raw.id));if(duplicate)return NextResponse.json({error:duplicate},{status:409});const beforeRows=await db`SELECT * FROM content WHERE id=${raw.id} LIMIT 1`;if(!beforeRows[0])return NextResponse.json({error:'Элемент не найден'},{status:404});const rows=await db`UPDATE content SET kind=${x.kind},title=${x.title},body=${x.body},image_url=${x.image_url},video_url=${x.video_url},video_title=${x.video_title},video_description=${x.video_description},video_preview=${x.video_preview},published_at=${x.published_at},url=${x.url},extra_links=${JSON.stringify(x.extra_links)}::jsonb,sort_order=${x.sort_order},status=${x.status},creator_id=${x.creator_id},minecraft_version=${x.minecraft_version},district_id=${x.district_id},tab_posts=${JSON.stringify(x.tab_posts)}::jsonb,updated_at=NOW() WHERE id=${raw.id} RETURNING *`;if(!rows[0])return NextResponse.json({error:'Элемент не найден'},{status:404});await logAction('Изменён элемент',`${x.kind}: ${x.title} • изменено: ${diffForLog(beforeRows[0],rows[0])}`);return NextResponse.json(rows[0])}catch(error){return errorResponse(error)}
}
export async function DELETE(req:Request){if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});if(!db)return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});try{await ensureSchema();const {id}=await req.json();const before=await db`SELECT kind,title FROM content WHERE id=${id} LIMIT 1`;if(!before.length)return NextResponse.json({error:'Элемент не найден'},{status:404});await db`DELETE FROM content WHERE id=${id}`;await logAction('Удалён элемент',`${before[0].kind}: ${before[0].title} (ID ${id})`);return NextResponse.json({ok:true})}catch(error){return errorResponse(error)}}
