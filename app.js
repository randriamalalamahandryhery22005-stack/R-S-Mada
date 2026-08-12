import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cfg=window.TAFASS_CONFIG||{};
export const supabase=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);

export async function currentUser(){
  const {data:{user}}=await supabase.auth.getUser();
  return user;
}
export async function profile(){
  const u=await currentUser(); if(!u) return null;
  const {data}=await supabase.from("profiles").select("*").eq("id",u.id).single();
  return data;
}
export function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
export function initials(s="Tafaß"){return s.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}
export function fmt(t){return new Date(t).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
export function avatar(u,cls="avatar"){
 return `<span class="${cls}">${u?.avatar_url?`<img src="${esc(u.avatar_url)}">`:initials(u?.name||"Tafaß")}</span>`
}
export function verified(u){return u?.verified?`<span class="verified">✓</span>`:""}

export async function upload(file,bucket="media"){
 const ext=file.name.split(".").pop().toLowerCase();
 const path=`${crypto.randomUUID()}.${ext}`;
 const {error}=await supabase.storage.from(bucket).upload(path,file,{upsert:false});
 if(error) throw error;
 const {data}=supabase.storage.from(bucket).getPublicUrl(path);
 return data.publicUrl;
}

export async function sendNotification(user_id,text,type="system",actor_id=null){
 await supabase.from("notifications").insert({user_id,text,type,actor_id});
}
