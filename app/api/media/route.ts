import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(req:Request){
 const raw=new URL(req.url).searchParams.get('url');
 if(!raw)return NextResponse.json({error:'Missing url'},{status:400});
 let target:URL;
 try{target=new URL(raw)}catch{return NextResponse.json({error:'Invalid url'},{status:400})}
 if(!/(^|\.)blob\.vercel-storage\.com$/i.test(target.hostname))return NextResponse.json({error:'Unsupported media host'},{status:400});
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token)return NextResponse.json({error:'Blob token is not configured'},{status:503});
 try{
  const blob:any=await get(raw,{access:'private',token} as any);
  if(!blob)return NextResponse.json({error:'Media unavailable'},{status:404});
  const source=String(blob.downloadUrl||blob.url||raw);
  const upstream=await fetch(source,{cache:'no-store'});
  if(!upstream.ok||!upstream.body)return NextResponse.json({error:'Media unavailable'},{status:404});
  const headers=new Headers();
  headers.set('Content-Type',upstream.headers.get('content-type')||blob.contentType||'application/octet-stream');
  const length=upstream.headers.get('content-length')||String(blob.size||'');
  if(length)headers.set('Content-Length',length);
  headers.set('Cache-Control','public, max-age=300, s-maxage=300');
  headers.set('X-Content-Type-Options','nosniff');
  return new NextResponse(upstream.body,{headers});
 }catch(error){console.error('Private blob read failed:',error);return NextResponse.json({error:'Media unavailable'},{status:502})}
}
