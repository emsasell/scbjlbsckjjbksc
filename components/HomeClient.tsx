'use client';
import { useEffect, useState } from 'react';
import type { Item } from '@/lib/types';

type Props = { content: {news:Item[];districts:Item[];tabs:Item[];links:Item[]} };
const bedrock = '26.45';

export default function HomeClient({content:initialContent}:Props) {
 const [content,setContent]=useState(initialContent);
 const [active,setActive]=useState('Главная');
 const [menu,setMenu]=useState(false);
 const [selected,setSelected]=useState<Item|null>(null); const [linksOpen,setLinksOpen]=useState(false);
 useEffect(()=>{ const on=()=>setMenu(false); window.addEventListener('resize',on); return()=>window.removeEventListener('resize',on)},[]);
 useEffect(()=>{ const on=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null)}; window.addEventListener('keydown',on); return()=>window.removeEventListener('keydown',on)},[]);
 useEffect(()=>{let stopped=false;const sync=async()=>{try{const r=await fetch('/api/content',{cache:'no-store'});if(!r.ok)return;const rows:Item[]=await r.json();if(stopped)return;const now=Date.now();setContent({news:rows.filter(x=>x.kind==='news'&&(x.status||'published')==='published'&&(!x.published_at||new Date(x.published_at).getTime()<=now)),districts:rows.filter(x=>x.kind==='district'),tabs:rows.filter(x=>x.kind==='tab'),links:rows.filter(x=>x.kind==='link')})}catch{}};const timer=window.setInterval(sync,5000);return()=>{stopped=true;window.clearInterval(timer)}},[]);
 const tabs=[...content.tabs];
 return <div className="site-shell">
  <header className="topbar">
   <a className="brand" href="#"><img src="/avatar.jpg" alt="MegaMine"/><span>Mega<span>Mine</span></span></a>
   <button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Меню">☰</button>
   <nav className={menu?'nav open':'nav'}>
    {['Главная','Новости','Районы',...tabs.map(t=>t.title)].map(t=><button key={t} className={active===t?'active':''} onClick={()=>{setActive(t);setMenu(false)}}>{t}</button>)}
   </nav>
  </header>
  <main>
   {active==='Главная' && <>
    <section className="hero"><div className="hero-copy"><div className="eyebrow">MINECRAFT BEDROCK • {bedrock}</div><h1>Добро пожаловать<br/><em>в MegaMine</em></h1><p>Живой мир, события, районы и новости проекта — всё в одном месте.</p><div className="hero-actions"><button onClick={()=>setActive('Новости')}>Смотреть новости</button><a href="#about">О проекте ↓</a></div></div><div className="hero-avatar"><img src="/avatar.jpg" alt="MegaMine"/><div className="pixel-card">MEGAMINE<br/><small>BEDROCK {bedrock}</small></div></div></section>
    <section className="stats"><div><b>{content.news.length}</b><span>новостей</span></div><div><b>{content.districts.length}</b><span>районов</span></div><div><b>{content.links.length}</b><span>каналов</span></div><div><b>{bedrock}</b><span>Bedrock</span></div></section>
    <section className="section" id="about"><div className="section-head"><div><span>01</span><h2>Последние новости</h2></div><button onClick={()=>setActive('Новости')}>Все новости →</button></div><NewsGrid items={content.news.slice(0,3)} onOpen={setSelected}/></section>
    <section className="section"><div className="section-head"><div><span>02</span><h2>Районы мира</h2></div><button onClick={()=>setActive('Районы')}>Все районы →</button></div><DistrictGrid items={content.districts.slice(0,4)} onOpen={setSelected}/></section>
   </>}
   {active==='Новости' && <Page title="Новости" kicker="Хроника MegaMine"><NewsGrid items={content.news} onOpen={setSelected}/></Page>}
   {active==='Районы' && <Page title="Районы" kicker="Карта мира"><DistrictGrid items={content.districts} onOpen={setSelected}/></Page>}
   {tabs.map(t=>active===t.title && <Page key={t.id} title={t.title} kicker="Раздел проекта"><article className="long-card">{t.image_url&&<img src={t.image_url} alt=""/>}<div><p>{t.body}</p>{t.url&&<a className="big-link" href={t.url} target="_blank" rel="noreferrer">Открыть ссылку →</a>}</div></article></Page>)}
  </main>
  <footer><div className="brand footer-brand"><img src="/avatar.jpg" alt="MegaMine"/><span>Mega<span>Mine</span></span></div><p>Minecraft Bedrock • {bedrock}</p><button className="footer-links-btn" onClick={()=>setLinksOpen(true)}>Ссылки</button></footer>{linksOpen&&<LinksModal items={content.links} onClose={()=>setLinksOpen(false)}/> }
  {selected&&<InfoModal item={selected} onClose={()=>setSelected(null)}/>} 
 </div>
}
function Page({title,kicker,children}:{title:string;kicker:string;children:React.ReactNode}){return <section className="page"><span className="eyebrow">{kicker}</span><h1>{title}</h1>{children}</section>}
function NewsGrid({items,onOpen}:{items:Item[];onOpen:(x:Item)=>void}){if(!items.length)return <Empty text="Новостей пока нет."/>;return <div className="news-grid">{items.map(n=><button className="news-card card-button" key={n.id} onClick={()=>onOpen(n)} aria-label={`Открыть: ${n.title}`}>{n.image_url&&<img src={n.image_url} alt=""/>}<div className="news-body"><time>{n.published_at?new Date(n.published_at).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'medium'}):''}</time><h3>{n.title}</h3><p>{n.body}</p><span className="card-more">Подробнее →</span></div></button>)}</div>}
function DistrictGrid({items,onOpen}:{items:Item[];onOpen:(x:Item)=>void}){if(!items.length)return <Empty text="Районов пока нет."/>;return <div className="district-grid">{items.map(d=><button className="district-card card-button" key={d.id} onClick={()=>onOpen(d)} aria-label={`Открыть район: ${d.title}`}>{d.image_url&&<img src={d.image_url} alt=""/>}<div><span>РАЙОН</span><h3>{d.title}</h3><p>{d.body}</p><b className="card-more">Подробнее →</b></div></button>)}</div>}
function itemLinks(value:any):{title:string;url:string}[]{
 if(Array.isArray(value)) return value.filter(x=>x&&x.title&&x.url);
 if(typeof value==='string'){try{return itemLinks(JSON.parse(value))}catch{return []}}
 return [];
}
function InfoModal({item,onClose}:{item:Item;onClose:()=>void}){
 const links=itemLinks(item.extra_links);
 return <div className="modal-backdrop" onMouseDown={onClose}><article className="info-modal" onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={item.title}>
  <button className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
  {item.image_url&&<img className="modal-image" src={item.image_url} alt=""/>}
  <div className="modal-content"><span className="eyebrow">{item.kind==='district'?'РАЙОН MEGAMINE':'НОВОСТЬ MEGAMINE'}</span><h2>{item.title}</h2>{item.published_at&&<time>{new Date(item.published_at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})} МСК</time>}<p>{item.body}</p>
   <div className="modal-actions">{item.url&&<a href={item.url} target="_blank" rel="noreferrer">Открыть основную ссылку ↗</a>}</div>
   {item.video_url&&<div className="video-box">{item.video_preview&&<img src={item.video_preview} alt="Превью видео"/>}<h3>{item.video_title||'Видео'}</h3>{item.video_description&&<p>{item.video_description}</p>}<video controls src={item.video_url}>Ваш браузер не поддерживает видео.</video></div>}
   {links.length>0&&<div className="modal-links"><h3>Ссылки этой {item.kind==='district'?'района':'новости'}</h3>{links.map((l,i)=><a key={i} href={l.url} target="_blank" rel="noreferrer">{l.title} ↗</a>)}</div>}
  </div></article></div>
}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}

function LinksModal({items,onClose}:{items:Item[];onClose:()=>void}){return <div className="modal-backdrop" onMouseDown={onClose}><article className="info-modal links-modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><h2>Ссылки проекта</h2><div className="links-cards">{items.map(l=><article className="link-card" key={l.id}>{l.image_url&&<img src={l.image_url} alt=""/>}<h3>{l.title}</h3><p>{l.body}</p><a href={l.url||'#'} target="_blank" rel="noreferrer">Перейти ↗</a></article>)}</div></article></div>}
