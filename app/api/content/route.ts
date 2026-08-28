import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET(){ if(!db) return NextResponse.json([]); await ensureSchema(); return NextResponse.json(await db`SELECT * FROM content ORDER BY sort_order ASC, created_at DESC`); }
function slugify(s:string){return s.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString(36)}
export async function POST(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 await ensureSchema(); const x=await req.json();
 if(!x.title) return NextResponse.json({error:'Введите название'},{status:400});
 const slug=slugify(x.title);
 const rows=await db`INSERT INTO content (kind,title,slug,body,image_url,video_url,published_at,url,sort_order) VALUES (${x.kind||'news'},${x.title},${slug},${x.body||''},${x.image_url||null},${x.video_url||null},${x.published_at?new Date(x.published_at):null},${x.url||null},${Number(x.sort_order)||0}) RETURNING *`;
 return NextResponse.json(rows[0]);
}
export async function PUT(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 const x=await req.json(); if(!x.id) return NextResponse.json({error:'Нет id'},{status:400});
 const rows=await db`UPDATE content SET kind=${x.kind}, title=${x.title}, body=${x.body||''}, image_url=${x.image_url||null}, video_url=${x.video_url||null}, published_at=${x.published_at?new Date(x.published_at):null}, url=${x.url||null}, sort_order=${Number(x.sort_order)||0} WHERE id=${x.id} RETURNING *`;
 return NextResponse.json(rows[0]);
}
export async function DELETE(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!db) return NextResponse.json({error:'DATABASE_URL не настроен'},{status:503});
 const {id}=await req.json(); await db`DELETE FROM content WHERE id=${id}`; return NextResponse.json({ok:true});
}
