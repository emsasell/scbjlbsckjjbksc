'use client';
import {useEffect,useState} from 'react';
import type {User} from '@/lib/types';

export default function AdminAccounts(){
 const [users,setUsers]=useState<User[]>([]);
 const [f,setF]=useState<any>({login:'',password:'',display_name:'',can_admin:false,is_district:true,district_id:''});
 const [msg,setMsg]=useState('');
 const [districts,setDistricts]=useState<any[]>([]);
 async function load(){
   const r=await fetch('/api/admin/users',{cache:'no-store'});
   if(r.ok)setUsers(await r.json());
 }
 useEffect(()=>{
   load();
   fetch('/api/content?admin=1').then(r=>r.json()).then((a:any[])=>setDistricts(a.filter(x=>x.kind==='district'))).catch(()=>{});
 },[]);
 async function save(e:any){
   e.preventDefault(); setMsg('');
   const r=await fetch('/api/admin/users',{method:f.id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});
   const j=await r.json();
   if(!r.ok){setMsg(j.error||'Ошибка');return}
   setMsg('Сохранено');
   setF({login:'',password:'',display_name:'',can_admin:false,is_district:true,district_id:''});
   load();
 }
 function edit(u:any){
   setF({...u,password:'',can_admin:!!u.can_admin||u.role==='admin',is_district:!!u.district_id||u.role==='district'});
 }
 async function del(id:number){if(confirm('Удалить аккаунт?')){await fetch('/api/admin/users',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});load()}}
 return <main className="admin-wrap">
  <header className="admin-top"><a href="/admin">← Админ-панель</a><a href="/">Сайт</a></header>
  <section className="admin-content standalone">
   <h1>Аккаунты и доступы</h1>
   <p>На один логин можно одновременно выдать доступ <b>Админ</b> и <b>Создатель района</b>. Админ получает доступ к админ-панели; создатель района может отправлять новости только своего района.</p>
   <form className="editor" onSubmit={save}>
    <label>Логин<input required value={f.login} onChange={e=>setF({...f,login:e.target.value})}/></label>
    <label>{f.id?'Новый пароль (оставьте пустым, чтобы не менять)':'Пароль'}<input required={!f.id} type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></label>
    <label>Отображаемое имя<input value={f.display_name||''} onChange={e=>setF({...f,display_name:e.target.value})}/></label>
    <div className="access-box">
      <label><input type="checkbox" checked={!!f.can_admin} onChange={e=>setF({...f,can_admin:e.target.checked})}/> Админ — доступ в админ-панель</label>
      <label><input type="checkbox" checked={!!f.is_district} onChange={e=>setF({...f,is_district:e.target.checked})}/> Создатель района — может отправлять новости своего района</label>
    </div>
    {f.is_district&&<label>Привязанный район<select required value={f.district_id||''} onChange={e=>setF({...f,district_id:e.target.value})}><option value="">Выберите район</option>{districts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>}
    <button className="primary">{f.id?'Сохранить':'Создать аккаунт'}</button>{msg&&<p>{msg}</p>}
   </form>
   <div className="list">{users.map(u=>{
     const admin=!!u.can_admin||u.role==='admin', district=!!u.district_id||u.role==='district';
     return <article className="admin-item" key={u.id}><div><h3>{u.login}</h3><p>{u.display_name||'Без имени'} · {admin?'Админ':''}{admin&&district?' + ':''}{district?'Создатель района':''}{u.district_id?` · район #${u.district_id}`:''}</p></div><div className="row-actions"><button onClick={()=>edit(u)}>Изменить</button><button className="danger" onClick={()=>del(u.id)}>Удалить</button></div></article>
   })}</div>
  </section>
 </main>
}
