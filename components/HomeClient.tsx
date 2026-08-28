'use client';
import { useEffect, useState } from 'react';
import type { Item } from '@/lib/types';

type Props = { content: {news:Item[];districts:Item[];tabs:Item[];links:Item[]} };
const bedrock = '26.45';

export default function HomeClient({content}:Props) {
 const [active,setActive]=useState('Главная');
 const [menu,setMenu]=useState(false);
 useEffect(()=>{ const on=()=>setMenu(false); window.addEventListener('resize',on); return()=>window.removeEventListener('resize',on)},[]);
 const tabs=[...content.tabs];
 return <div className="site-shell">
  <header className="topbar">
   <a className="brand" href="#"><img src="/avatar.jpg"/><span>Mega<span>Mine</span></span></a>
   <button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Меню">☰</button>
   <nav className={menu?'nav open':'nav'}>
    {['Главная','Новости','Районы',...tabs.map(t=>t.title)].map(t=><button key={t} className={active===t?'active':''} onClick={()=>{setActive(t);setMenu(false)}}>{t}</button>)}
    <a href="/admin" className="admin-link">Админ-панель</a>
   </nav>
  </header>
  <main>
   {active==='Главная' && <>
    <section className="hero"><div className="hero-copy"><div className="eyebrow">MINECRAFT BEDROCK • {bedrock}</div><h1>Добро пожаловать<br/><em>в MegaMine</em></h1><p>Живой мир, события, районы и новости проекта — всё в одном месте.</p><div className="hero-actions"><button onClick={()=>setActive('Новости')}>Смотреть новости</button><a href="#about">О проекте ↓</a></div></div><div className="hero-avatar"><img src="/avatar.jpg"/><div className="pixel-card">MEGAMINE<br/><small>BEDROCK {bedrock}</small></div></div></section>
    <section className="stats"><div><b>{content.news.length}</b><span>новостей</span></div><div><b>{content.districts.length}</b><span>районов</span></div><div><b>{content.links.length}</b><span>каналов</span></div><div><b>{bedrock}</b><span>Bedrock</span></div></section>
    <section className="section" id="about"><div className="section-head"><div><span>01</span><h2>Последние новости</h2></div><button onClick={()=>setActive('Новости')}>Все новости →</button></div><NewsGrid items={content.news.slice(0,3)}/></section>
    <section className="section"><div className="section-head"><div><span>02</span><h2>Районы мира</h2></div><button onClick={()=>setActive('Районы')}>Все районы →</button></div><DistrictGrid items={content.districts.slice(0,4)}/></section>
   </>}
   {active==='Новости' && <Page title="Новости" kicker="Хроника MegaMine"><NewsGrid items={content.news}/></Page>}
   {active==='Районы' && <Page title="Районы" kicker="Карта мира"><DistrictGrid items={content.districts}/></Page>}
   {tabs.map(t=>active===t.title && <Page key={t.id} title={t.title} kicker="Раздел проекта"><article className="long-card">{t.image_url&&<img src={t.image_url}/>}<div><p>{t.body}</p>{t.url&&<a className="big-link" href={t.url} target="_blank">Открыть ссылку →</a>}</div></article></Page>)}
  </main>
  <footer><div className="brand footer-brand"><img src="/avatar.jpg"/><span>Mega<span>Mine</span></span></div><p>Minecraft Bedrock • {bedrock}</p><div>{content.links.map(l=><a key={l.id} href={l.url||'#'} target="_blank">{l.title}</a>)}</div></footer>
 </div>
}
function Page({title,kicker,children}:{title:string;kicker:string;children:React.ReactNode}){return <section className="page"><span className="eyebrow">{kicker}</span><h1>{title}</h1>{children}</section>}
function NewsGrid({items}:{items:Item[]}){if(!items.length)return <Empty text="Новостей пока нет."/>;return <div className="news-grid">{items.map(n=><article className="news-card" key={n.id}>{n.image_url&&<img src={n.image_url}/>}<div className="news-body"><time>{n.published_at?new Date(n.published_at).toLocaleDateString('ru-RU'):''}</time><h3>{n.title}</h3><p>{n.body}</p>{n.video_url&&<a href={n.video_url} target="_blank">Видео →</a>}</div></article>)}</div>}
function DistrictGrid({items}:{items:Item[]}){if(!items.length)return <Empty text="Районов пока нет."/>;return <div className="district-grid">{items.map(d=><article className="district-card" key={d.id}>{d.image_url&&<img src={d.image_url}/>}<div><span>РАЙОН</span><h3>{d.title}</h3><p>{d.body}</p></div></article>)}</div>}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}
