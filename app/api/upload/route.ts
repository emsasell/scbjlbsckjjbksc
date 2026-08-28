import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isAdmin } from '../../../lib/auth';

export const runtime = 'nodejs';

export async function POST(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Сессия администратора истекла. Выйдите и войдите в /admin заново.'},{status:401});
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token) return NextResponse.json({error:'BLOB_READ_WRITE_TOKEN не подключён к этому Vercel Project.'}, {status:503});
 try{
  const form=await req.formData(); const file=form.get('file');
  if(!(file instanceof File)) return NextResponse.json({error:'Файл не найден'},{status:400});
  if(!file.type.startsWith('image/')) return NextResponse.json({error:'Можно загружать только изображения'},{status:400});
  if(file.size>25*1024*1024) return NextResponse.json({error:'Максимальный размер изображения — 25 МБ'},{status:413});
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'-') || 'image';
  const access=(process.env.BLOB_ACCESS||'private').toLowerCase()==='public'?'public':'private';
  const blob=await put(`megamine/${Date.now()}-${safeName}`,file,{access,token} as any);
  const url=access==='private'?`/api/media?url=${encodeURIComponent(blob.url)}`:blob.url;
  return NextResponse.json({url,access});
 }catch(error:any){
  const raw=String(error?.message||'Не удалось загрузить изображение');
  if(/unauthorized|forbidden|401|403/i.test(raw)) return NextResponse.json({error:'Vercel Blob отклонил доступ. Подключите Blob Store к этому Project и заново создайте BLOB_READ_WRITE_TOKEN в Settings → Environment Variables. Не используйте Store ID или Base URL вместо токена.'},{status:503});
  return NextResponse.json({error:raw},{status:500});
 }
}
