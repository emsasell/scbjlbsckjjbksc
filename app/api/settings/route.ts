import {NextResponse} from 'next/server';import {db,ensureSchema} from '@/lib/db';
export async function GET(){
 const fallback={app_version:process.env.NEXT_PUBLIC_APP_VERSION||'1.0.0',app_description:'',megamine_date:'',current_update_title:'',current_update_date:'',broadcasts:[] as any[],server_now:Date.now()};
 if(!db)return NextResponse.json(fallback,{headers:{'Cache-Control':'no-store'}});
 try{await ensureSchema();const [rows,broadcasts,updates]=await Promise.all([db`SELECT key,value FROM settings WHERE key IN ('app_version','app_description','megamine_date','current_update_title','current_update_date')`,db`SELECT id,title,body,active,created_at,updated_at FROM broadcasts WHERE active=TRUE ORDER BY created_at DESC LIMIT 5`,db`SELECT id,version,title,description,update_date,created_at FROM site_updates ORDER BY COALESCE(update_date,created_at::date) DESC,id DESC LIMIT 100`]);const x:any=Object.fromEntries(rows.map((r:any)=>[r.key,r.value]));return NextResponse.json({...fallback,...x,broadcasts,updates,server_now:Date.now()},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json(fallback,{headers:{'Cache-Control':'no-store'}})}
}
