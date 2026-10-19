const {Client,GatewayIntentBits:G,Events,EmbedBuilder,ActionRowBuilder:Row,ButtonBuilder,ButtonStyle:S,StringSelectMenuBuilder,ChannelType,PermissionFlagsBits:P,SlashCommandBuilder}=require('discord.js');
const {d}=require('./db');
const {DISCORD_TOKEN,GUILD_ID,SITE_URL,STAFF_ROLE_ID,TICKET_CATEGORY_ID}=process.env;
const client=new Client({intents:[G.Guilds]});
const embed=(t,desc)=>new EmbedBuilder().setColor(0xff6a13).setTitle(t).setDescription(desc.slice(0,4000)).setFooter({text:d.settings.storeName});
const dm=async(id,e)=>{try{await(await client.users.fetch(id)).send({embeds:[e]});return true}catch{return false}};
const btn=(id,label,style=S.Primary)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
client.once(Events.ClientReady,async()=>{
  const g=await client.guilds.fetch(GUILD_ID);
  await g.commands.set([new SlashCommandBuilder().setName('panel').setDescription('نشر لوحة الشراء الذاتي').setDefaultMemberPermissions(P.Administrator).toJSON()]);
  console.log('Bot ready:',client.user.tag);
});
client.on(Events.InteractionCreate,async i=>{try{
  if(i.isChatInputCommand()&&i.commandName==='panel'){
    await i.channel.send({embeds:[embed('🛒 الشراء الذاتي','اضغط الزر لفتح تذكرة خاصة، تصفّح المنتجات واشترِ بنفسك بدون انتظار.')],components:[new Row().addComponents(btn('open','🛒 الشراء الذاتي'))]});
    return i.reply({content:'✅ تم نشر اللوحة',ephemeral:true});
  }
  if(i.isButton()&&i.customId==='open'){
    const ex=i.guild.channels.cache.find(c=>c.topic===`selfbuy:${i.user.id}`);
    if(ex)return i.reply({content:`لديك تذكرة مفتوحة: ${ex}`,ephemeral:true});
    const ow=[{id:i.guild.id,deny:[P.ViewChannel]},{id:i.user.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory]},{id:client.user.id,allow:[P.ViewChannel,P.SendMessages,P.EmbedLinks]}];
    if(STAFF_ROLE_ID)ow.push({id:STAFF_ROLE_ID,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory]});
    const ch=await i.guild.channels.create({name:`شراء-${i.user.username}`.slice(0,90),type:ChannelType.GuildText,parent:TICKET_CATEGORY_ID||null,topic:`selfbuy:${i.user.id}`,permissionOverwrites:ow});
    await ch.send({content:`${i.user}`,embeds:[embed('أهلاً بك في الشراء الذاتي 🪐','اضغط **تصفح المنتجات** ثم اختر المنتج واضغط **شراء الآن**.\nيجب ربط ديسكورد في الموقع عند الدفع ليصلك المنتج في الخاص — **تأكد أن خاصك مفتوح**.')],components:[new Row().addComponents(btn('browse','🛍️ تصفح المنتجات'),btn('close','🔒 إغلاق',S.Danger))]});
    return i.reply({content:`✅ تم فتح تذكرتك: ${ch}`,ephemeral:true});
  }
  if(i.isButton()&&i.customId==='browse'){
    if(!d.products.length)return i.reply({content:'لا توجد منتجات حالياً.',ephemeral:true});
    const m=new StringSelectMenuBuilder().setCustomId('pick').setPlaceholder('اختر المنتج').addOptions(d.products.slice(-25).map(p=>({label:p.name.slice(0,100),description:`${p.price} ر.س`,value:p.id})));
    return i.reply({content:'اختر منتجاً:',components:[new Row().addComponents(m)],ephemeral:true});
  }
  if(i.isStringSelectMenu()&&i.customId==='pick'){
    const p=d.products.find(x=>x.id===i.values[0]);
    if(!p)return i.update({content:'المنتج لم يعد متوفراً',components:[]});
    const e=embed(p.name,p.desc||'\u200b').addFields({name:'💰 السعر',value:`${p.price} ر.س`}).setImage(`${SITE_URL}/img/${p.id}`);
    return i.update({content:'',embeds:[e],components:[new Row().addComponents(new ButtonBuilder().setLabel('شراء الآن').setStyle(S.Link).setURL(`${SITE_URL}/buy/${p.id}`))]});
  }
  if(i.isButton()&&i.customId==='close'){
    if(i.channel.topic!==`selfbuy:${i.user.id}`&&!i.memberPermissions.has(P.ManageChannels))return i.reply({content:'غير مصرح',ephemeral:true});
    await i.reply('🔒 سيتم حذف التذكرة خلال 5 ثوانٍ');
    setTimeout(()=>i.channel.delete().catch(()=>{}),5000);
  }
}catch(e){console.error(e)}});
module.exports={start:()=>client.login(DISCORD_TOKEN),dm,embed};
