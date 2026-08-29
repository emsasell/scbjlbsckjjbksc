'use client';
import {useEffect,useState} from 'react';import type {Item} from '@/lib/types';
type Content={news:Item[];districts:Item[];tabs:Item[];links:Item[];videos:Item[]};
function mediaSrc(url:any){
 const value=String(url||'');
 if(!value)return '';
 try{const u=new URL(value);if(/(^|\.)blob\.vercel-storage\.com$/i.test(u.hostname))return '/api/media?url='+encodeURIComponent(value)}catch{}
 return value;
}
export default function HomeClient({content:initialContent}:{content:Content}){
 const [content,setContent]=useState(initialContent),[active,setActive]=useState('Главная'),[menu,setMenu]=useState(false),[selected,setSelected]=useState<Item|null>(null),[fullImage,setFullImage]=useState<string|null>(null),[linksOpen,setLinksOpen]=useState(false),[updatesOpen,setUpdatesOpen]=useState(false),[settings,setSettings]=useState<any>({app_version:'',megamine_date:'',broadcasts:[]}),[serverOffset,setServerOffset]=useState<number|null>(null),[nowTick,setNowTick]=useState(()=>Date.now());
 // Часы перерисовываются ровно раз в секунду независимо от сетевых запросов.
 // Поэтому секунды больше не прыгают через 2–3 секунды.
 useEffect(()=>{let timer:any;const tick=()=>{setNowTick(Date.now());timer=setTimeout(tick,1000-(Date.now()%1000)+8)};tick();return()=>clearTimeout(timer)},[]);
 useEffect(()=>{const sync=async()=>{try{const [a,b]=await Promise.all([fetch('/api/content',{cache:'no-store'}),fetch('/api/settings',{cache:'no-store'})]);if(a.ok){const rows:Item[]=await a.json(),now=Date.now();setContent({news:rows.filter(x=>x.kind==='news'&&((x.status||'published')==='published'||((x.status||'')==='scheduled'&&(!x.published_at||new Date(x.published_at).getTime()<=now)))&&(!x.published_at||new Date(x.published_at).getTime()<=now)),districts:rows.filter(x=>x.kind==='district'),tabs:rows.filter(x=>x.kind==='tab'),links:rows.filter(x=>x.kind==='link'),videos:rows.filter(x=>x.kind==='video'&&((x.status||'published')==='published'||((x.status||'')==='scheduled'&&(!x.published_at||new Date(x.published_at).getTime()<=now)))&&(!x.published_at||new Date(x.published_at).getTime()<=now))})}if(b.ok){
   const nextSettings=await b.json();
   setSettings(nextSettings);
   if(typeof nextSettings.server_now==='number'&&Number.isFinite(nextSettings.server_now)) setServerOffset(prev=>prev===null?nextSettings.server_now-Date.now():prev);
  }}catch{}};sync();const t=setInterval(sync,2000);return()=>clearInterval(t)},[]);
 // Сетевое смещение обновляется редко, а сами часы идут локально каждую секунду.
 const stableServerNow=nowTick+(serverOffset??0);
 const megaNow=clockNow(settings.megamine_date,stableServerNow); const tabs=[...content.tabs].sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||a.id-b.id);
 return <div className="site-shell"><header className="topbar"><a className="brand" href="#"><img src="/avatar.jpg" alt="MegaMine"/><span>Mega<span>Mine</span></span></a><button className="mobile-menu" onClick={()=>setMenu(!menu)}>☰</button><nav className={menu?'nav open':'nav'}>{['Главная','Новости','Районы','Видео'].map(t=><button key={t} className={active===t?'active':''} onClick={()=>{setActive(t);setMenu(false)}}>{t}</button>)}{tabs.map(t=>{const key=`tab:${t.id}`;return <button key={key} className={active===key?'active':''} onClick={()=>{setActive(key);setMenu(false)}}>{t.title}</button>})}</nav></header>
 <main>{active==='Главная'&&<><section className="hero"><div className="hero-copy"><div className="eyebrow">MINECRAFT BEDROCK</div><h1>Добро пожаловать<br/><em>в MegaMine</em></h1><p>Живой мир, события, районы, новости и видео проекта.</p><div className="clock-card"><b>{fmtDate(megaNow)}</b><strong>{fmtTime(megaNow)}</strong><span>Дата и время MegaMine</span></div><div className="hero-actions"><button onClick={()=>setActive('Новости')}>Смотреть новости</button><button onClick={()=>setActive('Видео')}>Видео</button><button className="secondary" onClick={()=>setUpdatesOpen(true)}>🆕 Что нового</button></div></div><div className="hero-avatar"><img className="clickable-image" src="/avatar.jpg" alt="MegaMine" onClick={()=>setFullImage("/avatar.jpg")}/></div></section>{settings.broadcasts?.length>0&&<section className="broadcast-bar">{settings.broadcasts.map((b:any)=><article key={b.id}><b>📣 {b.title}</b><p>{b.body}</p></article>)}</section>}<section id="updates" className="updates-preview"><div><span className="eyebrow">ОБНОВЛЕНИЕ САЙТА</span><h2>Версия {settings.app_version||'—'}</h2><p>{settings.app_description||'Описание текущего обновления пока не добавлено.'}</p></div><button onClick={()=>setUpdatesOpen(true)}>Посмотреть обновления →</button></section><section className="stats"><div><b>{content.news.length}</b><span>новостей</span></div><div><b>{content.districts.length}</b><span>районов</span></div><div><b>{content.videos.length}</b><span>видео</span></div><div><b>{settings.app_version||'—'}</b><span>версия сайта</span></div></section><section className="section"><div className="section-head"><div><span>01</span><h2>Последние новости</h2></div><button onClick={()=>setActive('Новости')}>Все новости →</button></div><Grid items={content.news.slice(0,3)} onOpen={setSelected} type="news"/></section><section className="section"><div className="section-head"><div><span>02</span><h2>Районы мира</h2></div><button onClick={()=>setActive('Районы')}>Все районы →</button></div><DistrictGrid items={content.districts.slice(0,4)} onOpen={setSelected}/></section></>}{active==='Новости'&&<Page title="Новости" kicker="Хроника MegaMine"><Grid items={content.news} onOpen={setSelected} type="news"/></Page>}{active==='Районы'&&<Page title="Районы" kicker="Карта мира"><DistrictGrid items={content.districts} onOpen={setSelected}/></Page>}{active==='Видео'&&<Page title="Видео" kicker="Видео MegaMine"><Grid items={content.videos} onOpen={setSelected} type="video"/></Page>}{tabs.map(t=>active===`tab:${t.id}`&&<Page key={t.id} title={t.title} kicker={t.district_id?`Раздел района • ${content.districts.find(d=>d.id===t.district_id)?.title||'Район'}`:'Раздел проекта'}><article className="long-card">{t.image_url&&<img src={mediaSrc(t.image_url)} alt="" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none'}}/>}<div>{t.district_id&&<div className="linked-district">🏘️ Привязанный район: <b>{content.districts.find(d=>d.id===t.district_id)?.title||'Район удалён'}</b></div>}<p>{t.body}</p><TabPostsView posts={parseTabPosts((t as any).tab_posts)} />{parseExtraLinks(t.extra_links).length>0&&<ItemLinks links={parseExtraLinks(t.extra_links)} />}</div></article></Page>)}</main><footer><p>MegaMine{settings.app_version&&' • Версия сайта '+settings.app_version}</p><div className="footer-actions"><button onClick={()=>setLinksOpen(true)}>Ссылки</button></div></footer>{linksOpen&&<LinksModal items={content.links} onClose={()=>setLinksOpen(false)}/>} {updatesOpen&&<UpdatesModal settings={settings} onClose={()=>setUpdatesOpen(false)}/>} {selected&&<InfoModal item={selected} onClose={()=>setSelected(null)}/>} {fullImage&&<div className="fullscreen-media" onClick={()=>setFullImage(null)}><button aria-label="Закрыть">×</button><img src={fullImage} alt="Полноразмерное изображение"/></div>}</div>
}
function normalizedDate(value:any):string{
 const raw=String(value||'').trim();
 // PostgreSQL DATE/TIMESTAMP может прийти как ISO: 2026-08-29T00:00:00.000Z.
 const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(match)return `${match[1]}-${match[2]}-${match[3]}`;
 return '';
}
function clockNow(dateOverride:string,tick:number){
 // MegaMine всегда работает строго по UTC+4. Используются UTC-геттеры,
 // поэтому часовой пояс браузера и устройства не может изменить отображение.
 const safeTick=Number.isFinite(tick)?tick:Date.now();
 const megaMs=safeTick+4*60*60*1000;
 const shifted=new Date(megaMs);
 const override=normalizedDate(dateOverride);
 if(!override)return shifted;
 const [y,m,day]=override.split('-').map(Number);
 return new Date(Date.UTC(
   y,m-1,day,
   shifted.getUTCHours(),shifted.getUTCMinutes(),shifted.getUTCSeconds(),shifted.getUTCMilliseconds()
 ));
}
function fmtDate(d:Date){
 return `${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${d.getUTCFullYear()}`;
}
function fmtTime(d:Date){
 return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}:${String(d.getUTCSeconds()).padStart(2,'0')}`;
}
function formatStoredDate(value:any,fallback='не указана'){
 const normalized=normalizedDate(value);
 if(!normalized)return fallback;
 const [y,m,d]=normalized.split('-');
 return `${d}.${m}.${y}`;
}
function parseExtraLinks(value:any):any[]{if(Array.isArray(value))return value;if(typeof value==='string'){try{const p=JSON.parse(value);return Array.isArray(p)?p:[]}catch{return []}}return []}
function Page({title,kicker,children}:{title:string;kicker:string;children:React.ReactNode}){return <section className="page"><span className="eyebrow">{kicker}</span><h1>{title}</h1>{children}</section>}
function Grid({items,onOpen,type}:{items:Item[];onOpen:(x:Item)=>void;type:string}){if(!items.length)return <div className="empty">Пока нет материалов.</div>;return <div className="news-grid">{items.map(n=>{const links=parseExtraLinks(n.extra_links);const count=links.length;return <article className="news-card material-card" key={n.id}>{(n.image_url||n.video_preview)&&<img src={mediaSrc(n.image_url||n.video_preview||'')} alt="" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none'}}/>}<div className="news-body"><time>{n.published_at?megaTime(n.published_at):''}</time><h3>{n.title}</h3><p>{n.body}</p><div className="card-actions"><button onClick={()=>onOpen(n)}>{type==='video'?'Смотреть видео':'Подробнее'}</button>{count>0&&<button className="secondary" onClick={()=>onOpen(n)}>🔗 Ссылки ({count})</button>}</div></div></article>})}</div>}
function DistrictGrid({items,onOpen}:{items:Item[];onOpen:(x:Item)=>void}){if(!items.length)return <div className="empty">Районов пока нет.</div>;return <div className="district-grid">{items.map(d=>{const links=parseExtraLinks(d.extra_links);const count=links.length;return <article className="district-card material-card" key={d.id}>{d.image_url&&<img src={mediaSrc(d.image_url)} alt="" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none'}}/>}<div><span>РАЙОН</span><h3>{d.title}</h3><p>{d.body}</p>{d.minecraft_version&&<small className="district-version">Bedrock {d.minecraft_version}</small>}<div className="card-actions district-actions"><button onClick={()=>onOpen(d)}>Подробнее</button>{count>0&&<button className="secondary" onClick={()=>onOpen(d)}>🔗 Ссылки ({count})</button>}</div></div></article>})}</div>}
function megaTime(v:string){return new Date(new Date(v).getTime()+4*3600e3).toISOString().replace('T',' ').slice(0,16)}
function InfoModal({item,onClose}:{item:Item;onClose:()=>void}){return <div className="modal-backdrop" onMouseDown={onClose}><article className="info-modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button>{item.image_url&&<img className="modal-image" src={mediaSrc(item.image_url)} alt="" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none'}}/>}<div className="modal-content"><h2>{item.title}</h2>{item.published_at&&<time>{megaTime(item.published_at)} MegaMine</time>}<p>{item.body}</p>{parseExtraLinks(item.extra_links).length>0&&<ItemLinks links={parseExtraLinks(item.extra_links)} />}{item.video_url&&<div className="video-box">{item.video_preview&&<img src={mediaSrc(item.video_preview)} alt=""/>}<h3>{item.video_title||item.title}</h3>{item.video_description&&<p>{item.video_description}</p>}<video controls src={mediaSrc(item.video_url)}/></div>}</div></article></div>}

function parseTabPosts(value:any):any[]{if(Array.isArray(value))return value;if(typeof value==='string'){try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[]}catch{return []}}return []}
function TabPostsView({posts}:{posts:any[]}){if(!posts.length)return null;return <section className="tab-materials"><div className="tab-materials-head"><span className="eyebrow">МАТЕРИАЛЫ ВКЛАДКИ</span><h3>Новости и материалы</h3></div><div className="tab-materials-list">{posts.map((post:any,i:number)=><article className="tab-material" key={i}>{post.image_url&&<img src={mediaSrc(post.image_url)} alt="" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none'}}/>}<div><span>Материал {i+1}</span>{post.title&&<h4>{post.title}</h4>}<p>{post.body}</p></div></article>)}</div></section>}
function ItemLinks({links}:{links:any[]}){return <section className="item-links"><h3>Ссылки</h3><div className="item-links-grid">{links.map((l:any,i:number)=><article className="item-link-card" key={i}>{l.image_url&&<img src={mediaSrc(l.image_url)} alt=""/>}<div><b>{l.title}</b>{l.description&&<p>{l.description}</p>}<a href={l.url} target="_blank" rel="noreferrer">Перейти ↗</a></div></article>)}</div></section>}
function LinksModal({items,onClose}:{items:Item[];onClose:()=>void}){return <div className="modal-backdrop" onMouseDown={onClose}><article className="info-modal links-modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><h2>Ссылки</h2><div className="links-cards">{items.map(l=><article className="link-card district-link-card" key={l.id}>{l.image_url&&<img src={mediaSrc(l.image_url)} alt="" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none'}}/>}<div className="link-card-body"><span>ССЫЛКА</span><h3>{l.title}</h3><p>{l.body}</p><a href={l.url||'#'} target="_blank" rel="noreferrer">Перейти ↗</a></div></article>)}</div></article></div>}

function UpdatesModal({settings,onClose}:{settings:any;onClose:()=>void}){
 const updates=Array.isArray(settings.updates)?settings.updates:[];
 const currentDate=settings.current_update_date||'';
 return <div className="modal-backdrop" onMouseDown={onClose}>
  <article className="info-modal updates-modal" onMouseDown={e=>e.stopPropagation()}>
   <button className="modal-close" onClick={onClose}>×</button>
   <div className="updates-header"><span className="eyebrow">ИСТОРИЯ ОБНОВЛЕНИЙ</span><h2>Что нового</h2><p>Новые функции и изменения сайта MegaMine.</p></div>
   <section className="current-update">
    <div className="update-badge">ТЕКУЩАЯ ВЕРСИЯ</div>
    <div className="current-update-main"><div><span>Версия</span><strong>{settings.app_version||'—'}</strong></div><div><span>Дата обновления</span><strong>{formatStoredDate(currentDate)}</strong></div></div>
    <h3>{settings.current_update_title||'Текущее обновление'}</h3>
    <p>{settings.app_description||'Описание текущего обновления пока не добавлено.'}</p>
   </section>
   <h3 className="history-title">История версий</h3>
   <div className="updates-list">
    {updates.length?updates.map((u:any)=><article className="update-card" key={u.id}>
      <div className="update-card-top"><b>Версия {u.version}</b><time>{formatStoredDate(u.update_date||u.created_at,'без даты')}</time></div>
      <h3>{u.title||'Обновление'}</h3><p>{u.description||'Без описания.'}</p>
    </article>):<div className="updates-empty">История обновлений пока пуста.</div>}
   </div>
  </article>
 </div>
}