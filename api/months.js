import {user,send,months} from './_store.js';
export default async function handler(req,res){if(req.method!=='GET')return send(res,405,{error:'Método não permitido.'});try{return send(res,200,{months:await months(user(req,res))})}catch{return send(res,503,{error:'Histórico indisponível.'})}}
