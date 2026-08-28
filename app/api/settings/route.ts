import {NextResponse} from 'next/server';
import {db,ensureSchema} from '@/lib/db';
export async function GET(){
 if(!db)return NextResponse.json({app_version:process.env.NEXT_PUBLIC_APP_VERSION||'1.0.0',minecraft_java:'',minecraft_bedrock:''},{headers:{'Cache-Control':'no-store'}});
 try{await ensureSchema();const rows=await db`SELECT key,value FROM settings WHERE key IN ('app_version','app_description','minecraft_java','minecraft_bedrock')`;const x:any=Object.fromEntries(rows.map((r:any)=>[r.key,r.value]));return NextResponse.json({app_version:x.app_version||process.env.NEXT_PUBLIC_APP_VERSION||'1.0.0',app_description:x.app_description||'',minecraft_java:x.minecraft_java||'',minecraft_bedrock:x.minecraft_bedrock||''},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({app_version:process.env.NEXT_PUBLIC_APP_VERSION||'1.0.0',minecraft_java:'',minecraft_bedrock:''})}
}