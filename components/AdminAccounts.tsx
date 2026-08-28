'use client';
import type {User} from '@/lib/types';
export default function AdminAccounts({users=[]}:{users?:User[]}){
  return <div className="admin-list">{users.map(u=><div className="admin-row" key={u.id}><b>{u.username}</b><span>{u.role||'user'}</span></div>)}</div>;
}
