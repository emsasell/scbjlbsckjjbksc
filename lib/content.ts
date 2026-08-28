import { db, ensureSchema } from './db';
import type { Item } from './types';
const demo:Item[]=[];
export async function getAllContent():Promise<Item[]>{if(!db)return demo;try{await ensureSchema();return await db<Item[]>`SELECT * FROM content ORDER BY sort_order ASC, COALESCE(published_at,created_at) DESC`}catch(e){console.error('DB read',e);return demo}}
export async function getPublicContent(){const items=await getAllContent();const now=Date.now();const pub=items.filter(x=>!x.published_at||new Date(x.published_at).getTime()<=now);return {news:pub.filter(x=>x.kind==='news'),districts:pub.filter(x=>x.kind==='district'),tabs:pub.filter(x=>x.kind==='tab'),links:pub.filter(x=>x.kind==='link')}}
