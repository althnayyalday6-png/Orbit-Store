const express=require('express'),crypto=require('crypto'),path=require('path');
const {d,save}=require('./db'),bot=require('./bot');
const {PORT=3000,SITE_URL='http://localhost:3000',CLIENT_ID,CLIENT_SECRET,SESSION_SECRET='change-me',ADMIN_IDS=''}=process.env;
const admins=ADMIN_IDS.split(',').map(s=>s.trim()).filter(Boolean);
const sign=v=>crypto.createHmac('sha256',SESSION_SECRET).update(v).digest('base64url');
const app=express();
app.use(express.json({limit:'8mb'}));
app.use((req,res,next)=>{const m=(req.headers.cookie||'').match(/(?:^|; )s=([^;]+)/);if(m){const[v,s]=m[1].split('.');if(s===sign(v))try{req.user=JSON.parse(Buffer.from(v,'base64url'))}catch{}}next()});
const need=(req,res,next)=>req.user?next():res.status(401).json({error:'سجّل دخولك بديسكورد أولاً'});
const adm=(req,res,next)=>req.user&&admins.includes(req.user.id)?next():res.status(403).json({error:'غير مصرح'});
const rid=()=>crypto.randomBytes(5).toString('hex');
const valid=u=>/^data:image\/(jpeg|png|webp);base64,/.test(u||'');
const img=(res,u)=>{const m=/^data:(image\/\w+);base64,(.+)$/.exec(u||'');if(!m)return res.sendStatus(404);res.type(m[1]).send(Buffer.from(m[2],'base64'))};
const pub=p=>({id:p.id,name:p.name,price:p.price,desc:p.desc,image:`/img/${p.id}`});

// ---- Discord login (OAuth2) ----
app.get('/login',(req,res)=>{
  const state=Buffer.from(String(req.query.next||'/')).toString('base64url');
  res.redirect('https://discord.com/api/oauth2/authorize?'+new URLSearchParams({client_id:CLIENT_ID,redirect_uri:SITE_URL+'/callback',response_type:'code',scope:'identify',state}));
});
app.get('/callback',async(req,res)=>{try{
  const t=await(await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,grant_type:'authorization_code',code:req.query.code,redirect_uri:SITE_URL+'/callback'})})).json();
  const u=await(await fetch('https://discord.com/api/users/@me',{headers:{Authorization:'Bearer '+t.access_token}})).json();
  if(!u.id)throw 0;
  const v=Buffer.from(JSON.stringify({id:u.id,name:u.global_name||u.username})).toString('base64url');
  res.setHeader('Set-Cookie',`s=${v}.${sign(v)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${SITE_URL.startsWith('https')?'; Secure':''}`);
  let n=Buffer.from(String(req.query.state||''),'base64url').toString();if(!n.startsWith('/')||n.startsWith('//'))n='/';
  res.redirect(n);
}catch{res.status(400).send('فشل تسجيل الدخول')}});
app.get('/logout',(req,res)=>{res.setHeader('Set-Cookie','s=; Path=/; Max-Age=0');res.redirect('/')});

// ---- Public API ----
app.get('/api/me',(req,res)=>res.json({user:req.user||null,admin:!!req.user&&admins.includes(req.user.id)}));
app.get('/api/public',(req,res)=>{const{storeName,terms,announce}=d.settings;res.json({storeName,terms,announce})});
app.get('/api/products',(req,res)=>res.json(d.products.map(pub)));
app.get('/api/products/:id',(req,res)=>{const p=d.products.find(x=>x.id===req.params.id);p?res.json(pub(p)):res.status(404).json({error:'المنتج غير موجود'})});
app.get('/img/:id',(req,res)=>img(res,(d.products.find(x=>x.id===req.params.id)||{}).image));
app.get('/api/bank',need,(req,res)=>{const{bank,iban,beneficiary}=d.settings;res.json({bank,iban,beneficiary})});
app.post('/api/orders',need,(req,res)=>{
  const p=d.products.find(x=>x.id===req.body.productId);
  if(!p)return res.status(404).json({error:'المنتج غير موجود'});
  if(!valid(req.body.receipt))return res.status(400).json({error:'أرفق صورة الإيصال'});
  const o={id:rid(),productId:p.id,productName:p.name,price:p.price,userId:req.user.id,userName:req.user.name,receipt:req.body.receipt,status:'pending',at:Date.now()};
  d.orders.unshift(o);save();
  bot.dm(o.userId,bot.embed('📩 تم استلام طلبك',`طلب **${p.name}** قيد المراجعة، وسيصلك المنتج هنا في الخاص عند القبول.\nرقم الطلب: \`${o.id}\``));
  res.json({ok:true,id:o.id});
});

// ---- Admin API ----
app.get('/api/admin/products',adm,(req,res)=>res.json(d.products.map(p=>({...pub(p),delivery:p.delivery}))));
app.post('/api/admin/products',adm,(req,res)=>{const b=req.body;
  if(!b.name||!(b.price>0)||!valid(b.image))return res.status(400).json({error:'الاسم والسعر والصورة مطلوبة'});
  const p={id:rid(),name:b.name,price:+b.price,desc:b.desc||'',delivery:b.delivery||'',image:b.image};d.products.push(p);save();res.json(pub(p))});
app.put('/api/admin/products/:id',adm,(req,res)=>{const p=d.products.find(x=>x.id===req.params.id);if(!p)return res.sendStatus(404);const b=req.body;
  Object.assign(p,{name:b.name,price:+b.price,desc:b.desc||'',delivery:b.delivery||''});if(valid(b.image))p.image=b.image;save();res.json({ok:true})});
app.delete('/api/admin/products/:id',adm,(req,res)=>{d.products=d.products.filter(x=>x.id!==req.params.id);save();res.json({ok:true})});
app.get('/api/admin/orders',adm,(req,res)=>res.json(d.orders.map(({receipt,...o})=>o)));
app.get('/receipt/:id',adm,(req,res)=>img(res,(d.orders.find(x=>x.id===req.params.id)||{}).receipt));
app.post('/api/admin/orders/:id/:act',adm,async(req,res)=>{
  const o=d.orders.find(x=>x.id===req.params.id);
  if(!o||o.status!=='pending')return res.status(400).json({error:'الطلب غير متاح'});
  if(req.params.act==='accept'){const p=d.products.find(x=>x.id===o.productId);o.status='accepted';
    o.dm=await bot.dm(o.userId,bot.embed('✅ تم قبول طلبك',`**${o.productName}**\n\n${p&&p.delivery?p.delivery:'تواصل مع الإدارة لاستلام طلبك.'}`))}
  else{o.status='rejected';o.dm=await bot.dm(o.userId,bot.embed('❌ تم رفض طلبك',req.body.reason||'تعذّر التحقق من الحوالة. تواصل مع الإدارة.'))}
  save();res.json({ok:true,dm:o.dm});
});
app.get('/api/admin/settings',adm,(req,res)=>res.json(d.settings));
app.put('/api/admin/settings',adm,(req,res)=>{Object.assign(d.settings,req.body);save();res.json({ok:true})});

app.get('/buy/:id',(req,res)=>res.sendFile(path.join(__dirname,'public/buy.html')));
app.use(express.static(path.join(__dirname,'public'),{extensions:['html']}));
app.listen(PORT,()=>console.log('Orbit Store on '+PORT));
if(process.env.DISCORD_TOKEN)bot.start();
