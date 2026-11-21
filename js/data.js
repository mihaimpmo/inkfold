/* Static data: fonts, sizes, shapes, icons, templates */
window.PZ = window.PZ || {};

PZ.FONTS = ['Inter','Poppins','Montserrat','Playfair Display','Bebas Neue','Lobster','Pacifico','Oswald',
  'Roboto Slab','Raleway','Anton','Dancing Script','Lora','Space Grotesk','Archivo Black','Caveat',
  'DM Serif Display','Abril Fatface','Permanent Marker','Righteous','JetBrains Mono','Georgia','Arial','Courier New'];

PZ.PRESETS = [
  {n:'Instagram post',w:1080,h:1080},
  {n:'Instagram portrait',w:1080,h:1350},
  {n:'Story / Reel',w:1080,h:1920},
  {n:'Presentation 16:9',w:1920,h:1080},
  {n:'YouTube thumbnail',w:1280,h:720},
  {n:'Facebook cover',w:1640,h:624},
  {n:'LinkedIn banner',w:1584,h:396},
  {n:'X / Twitter post',w:1600,h:900},
  {n:'A4 document',w:2480,h:3508},
  {n:'Letter',w:2550,h:3300},
  {n:'Poster 18×24',w:1800,h:2400},
  {n:'Business card',w:1050,h:600},
  {n:'Logo',w:500,h:500},
  {n:'Desktop wallpaper',w:1920,h:1080},
  {n:'Phone wallpaper',w:1170,h:2532}
];

function starPts(n, outer, inner){
  const p=[];for(let i=0;i<n*2;i++){const r=i%2?inner:outer,a=Math.PI*i/n-Math.PI/2;p.push({x:50+r*Math.cos(a),y:50+r*Math.sin(a)})}return p;
}
function polyPts(n){const p=[];for(let i=0;i<n;i++){const a=2*Math.PI*i/n-Math.PI/2;p.push({x:50+50*Math.cos(a),y:50+50*Math.sin(a)})}return p}
PZ.starPts=starPts;PZ.polyPts=polyPts;

PZ.SHAPES = [
  {id:'rect',name:'Square',svg:'<rect x="10" y="10" width="80" height="80"/>'},
  {id:'round',name:'Rounded square',svg:'<rect x="10" y="10" width="80" height="80" rx="18"/>'},
  {id:'circle',name:'Circle',svg:'<circle cx="50" cy="50" r="40"/>'},
  {id:'triangle',name:'Triangle',svg:'<path d="M50 12 90 88H10z"/>'},
  {id:'star',name:'Star',svg:'<polygon points="'+starPts(5,42,18).map(p=>p.x+','+p.y).join(' ')+'"/>'},
  {id:'pentagon',name:'Pentagon',svg:'<polygon points="'+polyPts(5).map(p=>(10+p.x*.8)+','+(10+p.y*.8)).join(' ')+'"/>'},
  {id:'hexagon',name:'Hexagon',svg:'<polygon points="'+polyPts(6).map(p=>(10+p.x*.8)+','+(10+p.y*.8)).join(' ')+'"/>'},
  {id:'arrow',name:'Arrow',svg:'<path d="M8 40h52V22l32 28-32 28V60H8z"/>'},
  {id:'line',name:'Line',svg:'<rect x="8" y="47" width="84" height="6"/>'},
  {id:'dashed',name:'Dashed line',svg:'<path d="M8 47h16v6H8zM32 47h16v6H32zM56 47h16v6H56zM80 47h12v6H80z"/>'},
  {id:'ring',name:'Ring',svg:'<path fill-rule="evenodd" d="M50 10a40 40 0 1 1 0 80 40 40 0 0 1 0-80zm0 14a26 26 0 1 0 0 52 26 26 0 0 0 0-52z"/>'},
  {id:'blob',name:'Blob',svg:'<path d="M66 14c14 6 24 22 22 38s-12 32-30 36-36-4-42-20 0-34 12-44 24-16 38-10z"/>'}
];
PZ.SHAPE_PATHS = {
  arrow:'M8 40h52V22l32 28-32 28V60H8z',
  ring:'M50 10a40 40 0 1 1 0 80 40 40 0 0 1 0-80zm0 14a26 26 0 1 0 0 52 26 26 0 0 0 0-52z',
  blob:'M66 14c14 6 24 22 22 38s-12 32-30 36-36-4-42-20 0-34 12-44 24-16 38-10z'
};

PZ.ICONS = {
  heart:'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z',
  check:'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
  close:'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
  arrow:'M4 11h12.2l-5.6-5.6L12 4l8 8-8 8-1.4-1.4 5.6-5.6H4z',
  home:'M12 3 2 12h3v8h5v-6h4v6h5v-8h3z',
  bolt:'M13 2 4 14h7l-1 8 9-12h-7z',
  pin:'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z',
  play:'M8 5v14l11-7z',
  plus:'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  chat:'M6 3h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H9l-5 4v-4.2A3 3 0 0 1 3 15V6a3 3 0 0 1 3-3z',
  user:'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-9 2.2-9 5.5V22h18v-2.5c0-3.3-4.6-5.5-9-5.5z',
  mail:'M3 5h18v14H3zM5 7v.5l7 5 7-5V7l-7 5z',
  sun:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3z',
  moon:'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z',
  cloud:'M7 19a5 5 0 0 1-.6-10A6 6 0 0 1 18 8.5 4.5 4.5 0 0 1 17.5 19z',
  music:'M9 3v12.3A3.5 3.5 0 1 0 11 18V8h8V3z',
  bell:'M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6v-5a7 7 0 0 0-5.5-6.8V3a1.5 1.5 0 0 0-3 0v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1z',
  leaf:'M20 4C10 4 4 9 4 16c0 1.4.3 2.7.8 4 1-4 4-8 9-10-4 3-6.5 6.5-7.5 10.5C15 20 20 13 20 4z',
  search:'M10 3a7 7 0 1 0 4.2 12.6l5.6 5.6 1.4-1.4-5.6-5.6A7 7 0 0 0 10 3zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  camera:'M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  flag:'M5 2h2v20H5zM8 3h11l-2.5 4.5L19 12H8z',
  crown:'M3 18 2 7l5.5 4L12 4l4.5 7L22 7l-1 11z',
  diamond:'M12 2 22 12 12 22 2 12z',
  sparkle:'M12 2c.8 5.2 4.8 9.2 10 10-5.2.8-9.2 4.8-10 10-.8-5.2-4.8-9.2-10-10 5.2-.8 9.2-4.8 10-10z'
};

PZ.COMBOS = [
  {h:'Playfair Display',b:'Lora',ht:'Elegant',bt:'Serif pairing',hw:'800'},
  {h:'Bebas Neue',b:'Montserrat',ht:'BOLD NEWS',bt:'Clean & loud',hw:'400'},
  {h:'Pacifico',b:'Poppins',ht:'Hello!',bt:'Friendly script',hw:'400'},
  {h:'Anton',b:'Inter',ht:'IMPACT',bt:'Modern sans',hw:'400'},
  {h:'Abril Fatface',b:'Raleway',ht:'Editorial',bt:'Magazine style',hw:'400'},
  {h:'Permanent Marker',b:'Caveat',ht:'Handmade',bt:'Casual notes',hw:'400'}
];

/* ---------- templates (Fabric JSON) ---------- */
(function(){
  const T=(text,left,top,width,fontSize,fontFamily,fill,o={})=>Object.assign({type:'textbox',text,left,top,width,fontSize,fontFamily,fill,textAlign:'center',lineHeight:1.1},o);
  const R=(left,top,width,height,fill,o={})=>Object.assign({type:'rect',left,top,width,height,fill,strokeWidth:0},o);
  const C=(left,top,radius,fill,o={})=>Object.assign({type:'circle',left,top,radius,fill,strokeWidth:0},o);
  const G=(c1,c2,angle)=>({type:'linear',gradientUnits:'percentage',coords:angle==='v'?{x1:0,y1:0,x2:0,y2:1}:{x1:0,y1:0,x2:1,y2:1},colorStops:[{offset:0,color:c1},{offset:1,color:c2}]});
  const P=(path,left,top,scale,fill,o={})=>Object.assign({type:'path',path,left,top,scaleX:scale,scaleY:scale,fill,strokeWidth:0,fillRule:'evenodd'},o);

  PZ.TEMPLATES=[
    {name:'Summer sale',w:1080,h:1080,bg:'#ffcf3f',objects:[
      C(560,-140,420,'#ff6b4a'),C(-160,700,300,'#ffffff',{opacity:.35}),
      T('SUMMER',90,250,900,220,'Anton','#1b1b3a',{textAlign:'left'}),
      T('SALE',90,470,900,220,'Anton','#ffffff',{textAlign:'left',stroke:'#1b1b3a',strokeWidth:6}),
      T('Up to 50% off everything this weekend',90,720,620,44,'Poppins','#1b1b3a',{textAlign:'left'}),
      R(90,880,360,96,'#1b1b3a',{rx:48,ry:48}),
      T('SHOP NOW',90,908,360,40,'Poppins','#ffcf3f',{fontWeight:'700',charSpacing:120})
    ]},
    {name:'Quote card',w:1080,h:1080,bg:'#1d1b2f',objects:[
      T('“',90,40,300,400,'Playfair Display','#ff7eb6',{textAlign:'left'}),
      T('Design is not just what it looks like. It is how it works.',120,360,840,76,'Playfair Display','#ffffff',{fontStyle:'italic',textAlign:'left',lineHeight:1.15}),
      R(120,800,90,8,'#ff7eb6'),
      T('Your Name',120,840,700,40,'Inter','#c7c4e0',{textAlign:'left',fontWeight:'600'})
    ]},
    {name:'Event poster',w:1080,h:1350,bg:'#0f0c29',objects:[
      R(0,0,1080,1350,G('#302b63','#0f0c29','v')),
      C(240,180,300,G('#ff512f','#dd2476')),
      P(PZ.ICONS.sparkle,820,120,6,'#ffd166'),
      T('DESIGN\nNIGHT',60,780,960,170,'Bebas Neue','#ffffff',{lineHeight:.9}),
      T('FRIDAY · 8 PM · THE OLD FACTORY',60,1130,960,40,'Space Grotesk','#ffd166',{charSpacing:150}),
      T('Free entry · Music · Workshops',60,1200,960,34,'Inter','#b9b3e6')
    ]},
    {name:'Story announcement',w:1080,h:1920,bg:'#f5efe6',objects:[
      R(0,0,1080,960,'#2a9d8f'),
      C(540,960,330,'#e9c46a',{originX:'center',originY:'center'}),
      T('NEW\nPOST',90,220,900,200,'Archivo Black','#f5efe6',{lineHeight:.95}),
      T('Something fresh just dropped. Tap the link to see it first.',140,1380,800,58,'Poppins','#264653'),
      R(290,1640,500,110,'#264653',{rx:55,ry:55}),
      T('See more ↗',290,1670,500,46,'Poppins','#f5efe6',{fontWeight:'700'})
    ]},
    {name:'YouTube thumbnail',w:1280,h:720,bg:'#111111',objects:[
      R(0,0,1280,720,G('#ff0050','#7a00ff')),
      R(700,0,580,720,'#000000',{opacity:.25}),
      T('5 TIPS',60,120,700,190,'Anton','#ffffff',{textAlign:'left',shadow:{color:'rgba(0,0,0,.5)',blur:20,offsetX:6,offsetY:6}}),
      T('YOU NEED TO KNOW',60,330,640,86,'Anton','#ffe600',{textAlign:'left'}),
      C(980,360,180,'#ffffff',{originX:'center',originY:'center'}),
      P(PZ.ICONS.play,905,265,8,'#ff0050')
    ]},
    {name:'Presentation title',w:1920,h:1080,bg:'#ffffff',objects:[
      R(0,0,760,1080,'#5b3df5'),
      C(760,540,220,'#00c4cc',{originX:'center',originY:'center'}),
      T('Quarterly\nReview',900,330,900,150,'Montserrat','#18191b',{textAlign:'left',fontWeight:'900',lineHeight:1}),
      T('Team update · Q4',900,690,900,54,'Montserrat','#6b7280',{textAlign:'left'}),
      T('01',120,860,400,120,'Montserrat','#ffffff',{textAlign:'left',fontWeight:'900',opacity:.5})
    ]},
    {name:'Business card',w:1050,h:600,bg:'#ffffff',objects:[
      R(0,0,380,600,'#18191b'),
      P(PZ.ICONS.diamond,130,200,5,'#ffcf3f'),
      T('Alex Moreno',440,170,560,64,'DM Serif Display','#18191b',{textAlign:'left'}),
      T('Product Designer',440,250,560,32,'Inter','#5b3df5',{textAlign:'left',fontWeight:'600'}),
      T('alex@example.com\n+40 700 000 000\nexample.com',440,350,560,28,'Inter','#4b5563',{textAlign:'left',lineHeight:1.6})
    ]},
    {name:'Website hero',w:1440,h:900,bg:'#0e0b1f',objects:[
      R(0,0,1440,900,G('#1b1446','#0e0b1f','v')),
      C(1080,450,330,G('#5b3df5','#00c4cc'),{originX:'center',originY:'center',anim:'pop'}),
      P(PZ.ICONS.sparkle,1230,120,5,'#ffcf3f',{anim:'spin'}),
      T('Design anything.\nPublish everywhere.',120,240,780,84,'Space Grotesk','#ffffff',{textAlign:'left',fontWeight:'700',anim:'rise'}),
      T('Turn designs into websites, slides and print files — free, right in your browser.',120,500,640,30,'Inter','#c9c4ef',{textAlign:'left',lineHeight:1.4,anim:'fade'}),
      R(120,640,300,76,'#ffcf3f',{rx:38,ry:38,anim:'rise',link:'https://github.com/mihaimpmo/inkfold'}),
      T('Get started →',120,662,300,30,'Inter','#0e0b1f',{fontWeight:'700',anim:'rise',link:'https://github.com/mihaimpmo/inkfold'})
    ]},
    {name:'Minimal announcement',w:1080,h:1080,bg:'#fafafa',objects:[
      R(80,80,920,920,'rgba(0,0,0,0)',{stroke:'#18191b',strokeWidth:4}),
      T('We are',140,360,800,60,'Raleway','#18191b',{fontWeight:'400'}),
      T('MOVING',140,430,800,170,'Raleway','#18191b',{fontWeight:'800',charSpacing:200}),
      T('New studio opens 1 March',140,660,800,40,'Raleway','#6b7280')
    ]}
  ];
})();
