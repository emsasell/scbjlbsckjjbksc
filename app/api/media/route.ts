import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function allowed(host:string){
 const h=host.toLowerCase();
 return h==='blob.vercel-storage.com' || h.endsWith('.blob.vercel-storage.com');
}

// Универсальный прокси для Private Vercel Blob.
// Браузер никогда не получает токен Blob Store: сервер получает временный downloadUrl
// и перенаправляет на него. Для SDK, возвращающих stream вместо downloadUrl, есть fallback.
export async function GET(req:Request){
 const raw=new URL(req.url).searchParams.get('url');
 if(!raw)return NextResponse.json({error:'Missing media url'},{status:400});
 let target:URL;
 try{target=new URL(raw)}catch{return NextResponse.json({error:'Invalid media url'},{status:400})}
 if(!allowed(target.hostname))return NextResponse.json({error:'Unsupported media host'},{status:400});
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token)return NextResponse.json({error:'Blob token is not configured'},{status:503});
 try{
  const blob:any=await get(raw,{access:'private',token} as any);
  if(!blob)return NextResponse.json({error:'Media unavailable'},{status:404});
  const downloadUrl=String(blob.downloadUrl||'');
  if(downloadUrl) return NextResponse.redirect(downloadUrl,307);
  if(blob.stream){
   const headers=new Headers();
   headers.set('Content-Type',blob.contentType||'application/octet-stream');
   headers.set('Cache-Control','private, max-age=60');
   headers.set('X-Content-Type-Options','nosniff');
   return new NextResponse(blob.stream,{headers});
  }
  // Последний fallback: некоторые версии SDK отдают URL, доступный серверу.
  const source=String(blob.url||raw);
  const upstream=await fetch(source,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}).catch(()=>null);
  if(upstream?.ok&&upstream.body){
   const headers=new Headers();
   headers.set('Content-Type',upstream.headers.get('content-type')||blob.contentType||'application/octet-stream');
   headers.set('Cache-Control','private, max-age=60');
   return new NextResponse(upstream.body,{headers});
  }
  return NextResponse.json({error:'Blob did not return a readable download URL'},{status:502});
 }catch(error:any){
  console.error('Private blob read failed:',error);
  return NextResponse.json({error:'Media unavailable',details:String(error?.message||'Unknown Blob error')},{status:502});
 }
}
