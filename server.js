const express=require('express');
const http=require('http');const {Server}=require('socket.io');
const questions=require('./questions.json');
const app=express();app.use(express.static('public'));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
const server=http.createServer(app),io=new Server(server),rooms=new Map();
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
// Accept meaningful keyword variations, while requiring all four goals for Q1.
const groups={
  0:[['social welfare','welfare'],['moral improvement','morals','moral'],['economic reform','economy','economic'],['efficiency','efficient']],
  1:[['poor','poverty','needy'],['help','aid','support','service','assist']],
  3:[['young'],['men','mens'],['christian'],['association']],
  7:[['women','womens','woman','womans'],['christian'],['temperance'],['union']],
  14:[['taylor'],['frederick','winslow','f w']],
  24:[['national'],['association'],['colored'],['women']],
  28:[['upton'],['sinclair']],
  36:[['conservation','conserve','preserve','environment','nature','naturalist','forest','parks','wilderness']],
  41:[['wilson']],
};
const extras={
  2:['education','childcare','child care','housing','immigrants','community center'],
  4:['soup kitchens','nurseries','fed people','feed poor','feeding poor','help immigrants'],
  5:['protect workers','factory laws','labor rights','worker safety','child labor','women workers'],
  6:['stop drinking','stop sale of liquor','ban liquor','alcohol illegal','no alcohol','prohibit alcohol'],
  8:['womens christian temperance union','prohibition leader','temperance leader'],
  9:['destroyed alcohol','destroy liquor','destroyed bottles','broke bottles','axe','ax'],
  10:['reporters exposing','investigative journalists','exposed corruption','expose wrongdoing'],
  11:['standard oil','rockefeller'],
  12:['socialist','socialism','union organizer','labor organizer'],
  13:['productivity','reduce wasted time','work faster','efficient production'],
  15:['better pay','shorter hours','five dollar','5 dollar','8 hour'],
  16:['council appoints manager','council hires manager','appointed manager'],
  17:['citizens suggest bills','people propose bills','introduce legislation'],
  18:['people vote on laws','voters approve laws','public votes on bills'],
  19:['vote someone out','remove politicians','remove official from office'],
  20:['people elect senators','voters choose senators','popular vote for senators'],
  21:['unsafe factories','poor fire safety','locked exits','fire hazards','dangerous conditions'],
  22:['stop child labor','ban child labor','child workers'],
  23:['improve living conditions','improve working conditions','better communities'],
  25:['voting rights for women','right for women to vote','women vote'],
  26:['voting rights for women','right for women to vote','women vote'],
  27:['right for women to vote','voting rights for women','women vote','women voting rights'],
  29:['meat industry','meat packing plants','slaughterhouses'],
  30:['fair treatment','protect ordinary people','protect workers and consumers'],
  31:['persuade the public','influence the people','use presidential power to persuade'],
  32:['companies joining together','businesses controlling an industry','monopolies'],
  33:['roosevelt helped negotiate','roosevelt negotiated','government mediation','third party settlement'],
  34:['cleaner meat','sanitary meat','safe meat','inspect meat','clean meatpacking'],
  35:['unsafe food','contaminated food','contaminated drugs','mislabeling','false labels'],
  37:['irrigate western land','watering dry land','dams','water for farms'],
  38:['racial justice','equality for black americans','rights of african americans'],
  39:['tariffs remained high','did not lower tariffs','high import taxes'],
  40:['theodore roosevelt','progressive reforms','progressive party'],
  42:['protect unions','strengthened anti monopoly laws','protect labor','stop monopolies'],
  43:['unfair trade practices','unfair competition','business fraud'],
  44:['tax incomes','tax on earnings','tax on wages'],
  45:['federal reserve','regional reserve banks','banking system','12 districts'],
  46:['women right to vote','women vote','suffrage'],
  47:['world war i','ww1','great war','war in europe'],
};
function isCorrect(index,value){
  const a=norm(value);
  if(a.length<3)return false;
  const has=phrase=>{const k=norm(phrase);return k.length>=3&&(' '+a+' ').includes(' '+k+' ');};
  if(groups[index])return groups[index].every(options=>options.some(has));
  const keys=[...questions[index].keywords,...(extras[index]||[])];
  if(keys.some(has))return true;
  // Allow minor inflection differences in multiword phrases, without accepting unrelated single words.
  const stem=w=>w.replace(/(ing|ed|es|s)$/,'');
  const words=a.split(' ').map(stem);
  return keys.some(k=>{
    const parts=norm(k).split(' ').map(stem).filter(w=>w.length>=4);
    return parts.length>=2 && parts.every(w=>words.includes(w));
  });
}
const safe=s=>String(s||'').replace(/[<>]/g,'').trim().slice(0,22);
const getPlayers=r=>Object.values(r.players).map(p=>({name:p.name,score:p.score,answered:p.answered})).sort((a,b)=>b.score-a.score);
function send(r){io.to(r.code).emit('state',{code:r.code,phase:r.phase,index:r.index,total:questions.length,question:r.phase==='question'?questions[r.index].q:null,players:getPlayers(r),endAt:r.endAt||null,answer:r.phase==='reveal'?questions[r.index].answer:null,host:r.host});}
function advance(r){clearTimeout(r.timer);r.index++;if(r.index>=questions.length){r.phase='done';send(r);return;}r.phase='question';r.endAt=Date.now()+45000;for(const p of Object.values(r.players))p.answered=false;send(r);r.timer=setTimeout(()=>reveal(r),45000);}
function reveal(r){if(r.phase!=='question')return;clearTimeout(r.timer);r.phase='reveal';r.endAt=null;send(r);}
io.on('connection',s=>{
 s.on('create',({name},cb)=>{let code;do{code=String(Math.floor(100000+Math.random()*900000))}while(rooms.has(code));const r={code,host:s.id,phase:'lobby',index:-1,players:{},timer:null,endAt:null};rooms.set(code,r);r.players[s.id]={name:safe(name)||'Host',score:0,answered:false};s.join(code);s.data.code=code;send(r);cb?.({ok:true,code,host:true});});
 s.on('join',({code,name},cb)=>{const r=rooms.get(String(code));if(!r||r.phase==='done'){cb?.({error:'Room not found or game already ended.'});return;}if(r.phase!=='lobby'){cb?.({error:'Game already started. Join before the host starts.'});return;}if(Object.keys(r.players).length>=30){cb?.({error:'Room is full.'});return;}r.players[s.id]={name:safe(name)||'Player',score:0,answered:false};s.join(r.code);s.data.code=r.code;send(r);cb?.({ok:true,code:r.code,host:false});});
 s.on('start',()=>{const r=rooms.get(s.data.code);if(r&&r.host===s.id&&r.phase==='lobby')advance(r);});
 s.on('next',()=>{const r=rooms.get(s.data.code);if(r&&r.host===s.id&&r.phase==='reveal')advance(r);});
 s.on('reveal',()=>{const r=rooms.get(s.data.code);if(r&&r.host===s.id)reveal(r);});
 s.on('answer',(value,cb)=>{const r=rooms.get(s.data.code);if(!r||r.phase!=='question'||Date.now()>r.endAt){cb?.({error:'Time is up.'});return;}const p=r.players[s.id];if(!p||p.answered){cb?.({error:'Already answered.'});return;}p.answered=true;const ok=isCorrect(r.index,value);if(ok)p.score+=100+Math.max(0,Math.ceil((r.endAt-Date.now())/1000));cb?.({ok:true,correct:ok,expected:questions[r.index].answer});send(r);if(Object.values(r.players).every(p=>p.answered))reveal(r);});
 s.on('disconnect',()=>{const r=rooms.get(s.data.code);if(!r)return;delete r.players[s.id];if(!Object.keys(r.players).length){clearTimeout(r.timer);rooms.delete(r.code);return;}if(r.host===s.id)r.host=Object.keys(r.players)[0];send(r);});
});
server.listen(process.env.PORT||3000,()=>console.log('Game listening'));
