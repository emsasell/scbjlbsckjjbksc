import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isAdmin, logAction } from '../../../lib/auth';

export const runtime = 'nodejs';

// Загрузка файлов доступна только авторизованному администратору.
// Пользовательские логины и роли создателей районов удалены.
export async function POST(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized. Войдите в админ-панель заново.'},{status:401});
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token) return NextResponse.json({error:'BLOB_READ_WRITE_TOKEN не подключён к этому Vercel Project.'}, {status:503});
 try{
  const form=await req.formData(); const file=form.get('file');
  if(!(file instanceof File)) return NextResponse.json({error:'Файл не найден'},{status:400});
  if(!file.type.startsWith('image/')&&!file.type.startsWith('video/')) return NextResponse.json({error:'Можно загружать только изображения и видео'},{status:400});
  if(file.size>100*1024*1024) return NextResponse.json({error:'Максимальный размер файла — 100 МБ'},{status:413});
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'-') || (file.type.startsWith('video/')?'video':'image');
  // Для публичного сайта медиа должны открываться без авторизации.
  // Blob Store подключён в режиме Private. Файл читается сайтом через /api/media.
  const blob=await put(`megamine/${Date.now()}-${safeName}`,file,{access:'private',token,addRandomSuffix:true,contentType:file.type} as any);
  await logAction('Загружен медиафайл', `${file.name} • ${file.type} • ${file.size} байт`);
  const displayUrl='/api/media?url='+encodeURIComponent(blob.url);
  return NextResponse.json({url:blob.url,displayUrl,access:'private',name:file.name,type:file.type,size:file.size});
 }catch(error:any){
  console.error('Blob upload failed:',error);
  const raw=String(error?.message||'Не удалось загрузить файл');
  if(/public access|private store|access/i.test(raw)) return NextResponse.json({error:'Blob Store настроен как Private. Загрузка должна использовать private access — обновите сайт до этой версии.'},{status:503});
  if(/unauthorized|forbidden|401|403|credentials|token/i.test(raw)) return NextResponse.json({error:'Vercel Blob отклонил доступ. Проверьте подключение Blob Store и BLOB_READ_WRITE_TOKEN.'},{status:503});
  return NextResponse.json({error:raw},{status:500});
 }
}
