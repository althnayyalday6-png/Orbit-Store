const fs=require('fs'),path=require('path');
const F=path.join(process.env.DATA_DIR||__dirname,'db.json');
const d={products:[],orders:[],settings:{storeName:'Orbit Store',announce:'أهلاً بك في متجرنا 🪐',bank:'اسم البنك',iban:'SA00 0000 0000 0000 0000 0000',beneficiary:'اسم المستفيد',
terms:'1. جميع المنتجات رقمية ويتم تسليمها في الخاص على ديسكورد بعد قبول الحوالة.\n2. يجب ربط حساب ديسكورد وفتح الرسائل الخاصة لاستلام الطلب.\n3. لا يمكن استرجاع أو استبدال المنتجات الرقمية بعد التسليم.\n4. الدفع عن طريق التحويل البنكي فقط، وأي إيصال غير صحيح يُرفض الطلب.\n5. تحتفظ الإدارة بحق تعديل الأسعار والشروط في أي وقت.'}};
try{const j=JSON.parse(fs.readFileSync(F,'utf8'));Object.assign(d,j);d.settings={...d.settings,...j.settings}}catch{}
module.exports={d,save:()=>fs.writeFileSync(F,JSON.stringify(d))};
