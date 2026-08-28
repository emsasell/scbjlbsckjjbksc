import crypto from 'node:crypto';
export function hashPassword(p:string){const salt=crypto.randomBytes(16).toString('hex');const h=crypto.scryptSync(p,salt,64).toString('hex');return `${salt}:${h}`}
export function verifyPassword(p:string,stored:string){const [salt,h]=stored.split(':');if(!salt||!h)return false;const x=crypto.scryptSync(p,salt,64).toString('hex');return crypto.timingSafeEqual(Buffer.from(x,'hex'),Buffer.from(h,'hex'))}
