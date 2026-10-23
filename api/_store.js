import {get, put, list} from '@vercel/blob';
import {blank, validate} from '../core.js';
const cookieName='finora_user';
export function user(req,res){const found=(req.headers.cookie||'').match(/(?:^|; )finora_user=([^;]+)/)?.[1];if(found)return found;const id=crypto.randomUUID();res.setHeader('Set-Cookie',`${cookieName}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);return id}
export const send=(res,status,body)=>res.status(status).setHeader('Cache-Control','no-store').json(body);
const path=(userId,month)=>`finora/${userId}/${month}.json`;
export async function read(userId,month){const file=await get(path(userId,month),{access:'private',useCache:false});return file?JSON.parse(await new Response(file.stream).text()):null}
export async function write(userId,month,data){return put(path(userId,month),JSON.stringify(data),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:true})}
export async function months(userId){const result=await list({prefix:`finora/${userId}/`,access:'private'});return result.blobs.map(x=>({month:x.pathname.split('/').pop().replace('.json',''),updated_at:x.uploadedAt})).sort((a,b)=>b.month.localeCompare(a.month))}
export {blank,validate};
