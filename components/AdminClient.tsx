'use client';
import {useEffect,useState} from 'react';
import type {Item,AdminUser,ActionLog} from '@/lib/types';

type Kind=Item['kind'];
type Section=Kind|'accounts'|'logs'|'version';
const labels:Record<Kind,string>={news:'Новости',district:'Районы',tab:'Вкладки',link:'Ссылки'};
const sections:{id:Section;label:string}[]=[
 {id:'news',label:'📰 Новости'},{id:'district',label:'🏘️ Районы'},
 {id:'tab',label:'📑 Вкладки'},{id:'link',label:'🔗 Ссылки'},
 {id:'accounts',label:'👤 Аккаунты и роли'},{id:'logs',label:'📋 Журнал действий'},
 {id:'version',label:'⚙️ Версии'}
];
const msk=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).replace(' ','T');
const empty=(kind:Kind)=>({kind,title:'',body:'',image_url:'',video_url:'',video_title:'',video_description:'',video_preview:'',published_at:kind==='news'?msk():'',url:'',extra_links:[],sort_order:0,status:'published'});
const emptyAccount=()=>({username:'',password:'',display_name:'',minecraft_nick:'',profile_description:'',avatar_url:'',url:'',district_id:'',is_admin:true,is_creator:false});

export default function AdminClient({initial}:{initial:Item[]}){
 const [items,setItems]=useState(initial);
 const [section,setSection]=useState<Section>('news');
 const [form,setForm]=useState<any>(empty('news'));
 const [editId,setEditId]=useState<number|null>(null);
 const [account,setAccount]=useState<any>(emptyAccount());
 const [editingAccount,setEditingAccount]=useState<number|null>(null);
 const [data,setData]=useState<{admins:AdminUser[];logs:ActionLog[];settings:Record<string,string>}>({admins:[],logs:[],settings:{}});
 const [versions,setVersions]=useState({app_version:'1.0.0',app_description:'',minecraft_java:'',minecraft_bedrock:''});
 const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false);

 const load=async()=>{
   try{
    const [a,b]=await Promise.all([fetch('/api/content',{cache:'no-store'}),fetch('/api/admin/data',{cache:'no-store'})]);
    if(a.ok)setItems(await a.json());
    if(b.ok){const x=await b.json();setData(x);setVersions(v=>({...v,...(x.settings||{})}));}
   }catch{}
 };
 useEffect(()=>{load();const t=setInterval(load,7000);return()=>clearInterval(t)},[]);
 const isKind=(s=section):s is Kind=>['news','district','tab','link'].includes(s);
 const openSection=(s:Section)=>{setSection(s);setMsg('');if(isKind(s)){setEditId(null);setForm(empty(s));}};
 const edit=(x:Item)=>{setSection(x.kind);setEditId(x.id);setForm({...x,extra_links:Array.isArray(x.extra_links)?x.extra_links:[]});window.scrollTo({top:0,behavior:'smooth'});};
 const upload=async(file:File):Promise<string|null>=>{
   const fd=new FormData();fd.append('file',file);setMsg('Загрузка файла…');
   try{const r=await fetch('/api/upload',{method:'POST',body:fd});const j=await r.json();if(!r.ok){setMsg(j.error||'Ошибка загрузки');return null;}setMsg('Файл загружен');return j.url||null}catch{setMsg('Ошибка сети при загрузке');return null}
 };
 const saveContent=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMsg('');
  try{const r=await fetch('/api/content',{method:editId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editId?{...form,id:editId}:form)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Ошибка сохранения');setMsg('Сохранено');setEditId(null);setForm(empty(form.kind));await load()}catch(e:any){setMsg(e.message||'Ошибка')}finally{setBusy(false)}
 };
 const saveAccount=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMsg('');
  try{const r=await fetch('/api/admin/data',{method:editingAccount?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editingAccount?{type:'admin',id:editingAccount,...account}:{type:'admin',...account})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Ошибка сохранения');setMsg(editingAccount?'Аккаунт обновлён':'Аккаунт создан');setAccount(emptyAccount());setEditingAccount(null);await load()}catch(e:any){setMsg(e.message||'Ошибка')}finally{setBusy(false)}
 };
 const removeAccount=async(id:number)=>{if(!confirm('Удалить логин? Его активные сессии перестанут работать.'))return;const r=await fetch('/api/admin/data',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'admin',id})});const j=await r.json().catch(()=>({}));setMsg(r.ok?'Аккаунт удалён':j.error||'Ошибка');if(r.ok)load()};
 const saveVersions=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{const r=await fetch('/api/admin/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'version',...versions})});const j=await r.json().catch(()=>({}));setMsg(r.ok?'Версии сохранены':j.error||'Ошибка');if(r.ok)load()}finally{setBusy(false)}};
 const districts=items.filter(x=>x.kind==='district');
 return <main className="admin">
   <aside className="admin-sidebar">
    <h2>MEGAMINE CMS</h2>
    {sections.map(s=><button key={s.id} className={section===s.id?'active':''} onClick={()=>openSection(s.id)}>{s.label}</button>)}
    <div className="side-divider"/>
    <a href="/">← На сайт</a>
   </aside>
   <section className="admin-main">
    <header className="admin-page-head"><div><span className="eyebrow">УПРАВЛЕНИЕ САЙТОМ</span><h1>{isKind()?labels[section]:section==='accounts'?'Аккаунты и роли':section==='logs'?'Последние действия':'Версии проекта'}</h1></div></header>
    {msg&&<div className="notice">{msg}</div>}

    {isKind()&&<div className="admin-split">
      <div className="admin-list panel">
       <div className="panel-head"><h2>{labels[section]}</h2><button className="primary" onClick={()=>{setEditId(null);setForm(empty(section))}}>＋ Новый</button></div>
       {items.filter(x=>x.kind===section).map(x=><article className="admin-row" key={x.id}>
        <div><b>{x.title}</b><small>{x.status||'published'} {x.published_at?'• '+new Date(x.published_at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'}):''}</small></div>
        <div className="row-actions"><button onClick={()=>edit(x)}>Изменить</button><button className="danger" onClick={async()=>{if(confirm('Удалить элемент?')){const r=await fetch('/api/content',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:x.id})});if(r.ok)load();}}}>Удалить</button></div>
       </article>)}
       {!items.some(x=>x.kind===section)&&<p className="empty-mini">Пока ничего нет.</p>}
      </div>
      <form className="admin-form panel" onSubmit={saveContent}>
       <h2>{editId?'Редактирование':'Новый элемент'}</h2>
       <label>Название<input required value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})}/></label>
       <label>Описание<textarea rows={6} value={form.body||''} onChange={e=>setForm({...form,body:e.target.value})}/></label>
       {section==='news'&&<>
        <label>Публикация по МСК<input type="datetime-local" value={form.published_at||''} onChange={e=>setForm({...form,published_at:e.target.value})}/><small>Будущая дата создаёт отложенную публикацию.</small></label>
        <label>Статус<select value={form.status||'published'} onChange={e=>setForm({...form,status:e.target.value})}><option value="published">Опубликовать</option><option value="pending">На модерации</option><option value="rejected">Отклонено</option></select></label>
       </>}
       <label>Фото / превью<input type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(f){const u=await upload(f);if(u)setForm({...form,image_url:u});}}}/><input placeholder="или URL изображения" value={form.image_url||''} onChange={e=>setForm({...form,image_url:e.target.value})}/></label>
       {section==='news'&&<>
        <label>Видео<input type="file" accept="video/*" onChange={async e=>{const f=e.target.files?.[0];if(f){const u=await upload(f);if(u)setForm({...form,video_url:u});}}}/></label>
        <label>Название видео<input value={form.video_title||''} onChange={e=>setForm({...form,video_title:e.target.value})}/></label>
        <label>Описание видео<textarea rows={3} value={form.video_description||''} onChange={e=>setForm({...form,video_description:e.target.value})}/></label>
        <label>Превью видео<input type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(f){const u=await upload(f);if(u)setForm({...form,video_preview:u});}}}/></label>
       </>}
       {(section==='link'||section==='tab')&&<label>Внешняя ссылка<input type="url" placeholder="https://..." value={form.url||''} onChange={e=>setForm({...form,url:e.target.value})}/></label>}
       <button className="primary" disabled={busy}>{busy?'Сохранение…':editId?'Сохранить изменения':'Добавить'}</button>
      </form>
    </div>}

    {section==='accounts'&&<div className="admin-split">
      <div className="panel admin-list"><div className="panel-head"><h2>Все логины</h2><small>Один логин может быть и админом, и создателем района.</small></div>
       {data.admins.map(a=><article className="admin-row account-row" key={a.id}>
         <div><b>{a.username}</b><small>{a.display_name||'Без имени'} {a.minecraft_nick?'• Minecraft: '+a.minecraft_nick:''}</small><div className="role-badges">{a.is_admin&&<span>Админ</span>}{a.is_creator&&<span>Создатель района</span>}</div></div>
         <div className="row-actions"><button onClick={()=>{setEditingAccount(a.id);setAccount({username:a.username,password:'',display_name:a.display_name||'',minecraft_nick:a.minecraft_nick||'',profile_description:a.profile_description||'',avatar_url:a.avatar_url||'',url:a.url||'',district_id:a.district_id==null?'':String(a.district_id),is_admin:!!a.is_admin,is_creator:!!a.is_creator});}}>Изменить</button><button className="danger" onClick={()=>removeAccount(a.id)}>Удалить</button></div>
       </article>)}
      </div>
      <form className="admin-form panel" onSubmit={saveAccount}>
       <h2>{editingAccount?'Изменить аккаунт':'Новый аккаунт'}</h2>
       <label>Логин<input required value={account.username} onChange={e=>setAccount({...account,username:e.target.value})}/></label>
       <label>{editingAccount?'Новый пароль (пусто = не менять)':'Пароль'}<input type="password" required={!editingAccount} value={account.password} onChange={e=>setAccount({...account,password:e.target.value})}/><small>При смене пароля все старые сессии этого логина завершаются.</small></label>
       <label>Отображаемое имя<input value={account.display_name} onChange={e=>setAccount({...account,display_name:e.target.value})}/></label>
       <div className="checks"><label><input type="checkbox" checked={account.is_admin} onChange={e=>setAccount({...account,is_admin:e.target.checked})}/> Админ — доступ к админ-панели</label><label><input type="checkbox" checked={account.is_creator} onChange={e=>setAccount({...account,is_creator:e.target.checked})}/> Создатель района — публикации в своём районе</label></div>
       {account.is_creator&&<><label>Ник в Minecraft<input required value={account.minecraft_nick} onChange={e=>setAccount({...account,minecraft_nick:e.target.value})}/></label>
       <label>Привязанный район<select required value={account.district_id} onChange={e=>setAccount({...account,district_id:e.target.value})}><option value="">Выберите район</option>{districts.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}</select></label>
       <label>Описание профиля<textarea rows={3} value={account.profile_description} onChange={e=>setAccount({...account,profile_description:e.target.value})}/></label>
       <label>Аватар<input type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(f){const u=await upload(f);if(u)setAccount({...account,avatar_url:u});}}}/></label>
       <label>Ссылка / контакты<input type="url" placeholder="https://..." value={account.url} onChange={e=>setAccount({...account,url:e.target.value})}/></label></>}
       <div className="form-actions"><button className="primary" disabled={busy}>{busy?'Сохранение…':editingAccount?'Сохранить':'Создать логин'}</button>{editingAccount&&<button type="button" onClick={()=>{setEditingAccount(null);setAccount(emptyAccount())}}>Отмена</button>}</div>
      </form>
    </div>}

    {section==='logs'&&<div className="panel admin-list"><p className="muted">Последние 10 действий. Время — МСК.</p>{data.logs.map(l=><article className="admin-row" key={l.id}><div><b>{l.action}</b><small>{l.username} — {l.details}</small></div><time>{new Date(l.created_at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})} МСК</time></article>)}</div>}

    {section==='version'&&<form className="admin-form panel version-form" onSubmit={saveVersions}>
      <h2>Версии сайта и Minecraft</h2>
      <label>Версия сайта<input required value={versions.app_version} onChange={e=>setVersions({...versions,app_version:e.target.value})}/></label>
      <label>Описание обновления<textarea rows={4} value={versions.app_description} onChange={e=>setVersions({...versions,app_description:e.target.value})}/></label>
      <div className="two-col"><label>Minecraft Java<input placeholder="например 1.21.8" value={versions.minecraft_java} onChange={e=>setVersions({...versions,minecraft_java:e.target.value})}/></label><label>Minecraft Bedrock<input placeholder="например 1.21.100" value={versions.minecraft_bedrock} onChange={e=>setVersions({...versions,minecraft_bedrock:e.target.value})}/></label></div>
      <button className="primary" disabled={busy}>{busy?'Сохранение…':'Сохранить версии'}</button>
    </form>}
   </section>
 </main>
}
