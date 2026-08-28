import { db, ensureSchema } from './db';
import type { Item } from './types';

const demo: Item[] = [
 { id:1, kind:'news', title:'MegaMine открывает новый сезон', slug:'season', body:'Добро пожаловать на официальный сайт проекта. Здесь будут новости, события и обновления мира.', image_url:'/avatar.jpg', video_url:null, published_at:'2026-08-28T18:00:00.000Z', url:null, extra_links:[], sort_order:0, created_at:'2026-08-28T18:00:00.000Z' },
 { id:2, kind:'district', title:'Центральный район', slug:'center', body:'Главная точка спавна, торговля и общественные здания.', image_url:'/avatar.jpg', video_url:null, published_at:null, url:null, extra_links:[], sort_order:0, created_at:'2026-08-28T18:00:00.000Z' },
 { id:3, kind:'link', title:'Новости проекта', slug:'news-channel', body:'Следите за обновлениями MegaMine.', image_url:null, video_url:null, published_at:null, url:'https://t.me/', extra_links:[], sort_order:0, created_at:'2026-08-28T18:00:00.000Z' }
];

export async function getAllContent(): Promise<Item[]> {
  if (!db) return demo;
  try {
    await ensureSchema();
    return await db<Item[]>`SELECT * FROM content ORDER BY sort_order ASC, created_at DESC`;
  } catch (error) {
    // Не даём публичной странице падать с 500 из-за временной ошибки БД.
    console.error('MegaMine database read failed:', error);
    return demo;
  }
}
export async function getPublicContent() {
  const items = await getAllContent();
  return { news: items.filter(x=>x.kind==='news'), districts: items.filter(x=>x.kind==='district'), tabs: items.filter(x=>x.kind==='tab'), links: items.filter(x=>x.kind==='link') };
}
