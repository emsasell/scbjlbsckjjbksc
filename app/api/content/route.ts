import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../lib/db';
import { isAdmin } from '../../../lib/auth';

function slugify(s:string){return s.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString(36)}
function normalizeLinks(value:any){
 const raw=Array.isArray(value)?value:[];
 return raw.map((x:any)=>({title:String(x?.title||'').trim(),url:String(x?.url||'').trim()})).filter((x:any)=>x.title&&x.url);
}
function payload(x:any){return {kind:x.kind||'news',title:String(x.title||'').trim(),body:String(x.body||''),image_url:x.image_url||null,video_url:x.video_url||null,published_at:x.published_at?new Date(x.published_at):null,url:x.url||null,extra_links:JSON.stringify(normalizeLinks(x.extra_links)),sort_order:Number(x.sort_order)||0}}

export async function GET(){ if(!db) return NextResponse.json([]); await ensureSchema(); return NextResponse.json(await db`SELECT * FROM content ORDER BY sort_order ASC, created_at DESC`); }
export async function POST(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 await ensureSchema(); const x=payload(await req.json());
 if(!x.title) return NextResponse.json({error:'Введите название'},{status:400});
 const slug=slugify(x.title);
 const rows=await db`INSERT INTO content (kind,title,slug,body,image_url,video_url,published_at,url,extra_links,sort_order) VALUES (${x.kind},${x.title},${slug},${x.body},${x.image_url},${x.video_url},${x.published_at},${x.url},${x.extra_links}::jsonb,${x.sort_order}) RETURNING *`;
 return NextResponse.json(rows[0]);
}
export async function PUT(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 const raw=await req.json(); if(!raw.id) return NextResponse.json({error:'Нет id'},{status:400}); const x=payload(raw);
 const rows=await db`UPDATE content SET kind=${x.kind}, title=${x.title}, body=${x.body}, image_url=${x.image_url}, video_url=${x.video_url}, published_at=${x.published_at}, url=${x.url}, extra_links=${x.extra_links}::jsonb, sort_order=${x.sort_order} WHERE id=${raw.id} RETURNING *`;
 return NextResponse.json(rows[0]);
}
export async function DELETE(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 const {id}=await req.json(); await db`DELETE FROM content WHERE id=${id}`; return NextResponse.json({ok:true});
}
