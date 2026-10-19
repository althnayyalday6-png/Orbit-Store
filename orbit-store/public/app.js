const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=async(u,o={})=>{const r=await fetch(u,{headers:{'Content-Type':'application/json'},...o,body:o.body?JSON.stringify(o.body):undefined});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'حدث خطأ');return j};
const toData=(f,max=900)=>new Promise(res=>{const i=new Image();i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.82))};i.src=URL.createObjectURL(f)});
async function layout(){
  const [p,m]=await Promise.all([api('/api/public'),api('/api/me')]);
  document.title=p.storeName;
  document.body.insertAdjacentHTML('afterbegin',`<nav><a class="brand" href="/"><img src="/logo.png" alt="">${esc(p.storeName)}</a><div class="row"><a href="/terms">الشروط والأحكام</a>${m.admin?'<a href="/dashboard" class="btn ghost">لوحة التحكم</a>':''}${m.user?`<span>👤 ${esc(m.user.name)}</span><a href="/logout" class="btn ghost">خروج</a>`:`<a class="btn" href="/login?next=${encodeURIComponent(location.pathname)}">دخول بديسكورد</a>`}</div></nav>`);
  document.body.insertAdjacentHTML('beforeend',`<footer>© ${new Date().getFullYear()} ${esc(p.storeName)} — جميع الحقوق محفوظة</footer>`);
  return {p,m};
}
