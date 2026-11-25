import { games, offersFor, discount, normalize, money, markets, updated, exchange } from './data.js'

const main = document.querySelector('main')
const byId = id => games.find(g => g.id === id)
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const paths = { inicio:'Explorar', catalogo:'Catálogo', ofertas:'Ofertas', alertas:'Mis alertas', asistente:'Asistente', perfil:'Mi perfil', ayuda:'Ayuda', contacto:'Contacto', panel:'Fuentes y precios' }
const shapes = {
  search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5.5 5.5"/>',
  bell:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 3h4"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  tag:'<path d="M3 3h8l9 9-8 8-9-9V3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  compare:'<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  chat:'<path d="M4 4h16v12H9l-5 4Z"/><path d="M8 8h8m-8 4h5"/>',
  left:'<path d="m14 5-7 7 7 7"/>', right:'<path d="m9 5 7 7-7 7"/>'
}
const icon = name => '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+shapes[name]+'</svg>'
const coverUrl = g => g.art.startsWith('https://images.gog-statics.com/') ? g.art.replace(/\.png$/,'_product_tile_536.jpg') : g.art
const key = 'gamescout:mercados:v2'
const validMarket = code => Object.prototype.hasOwnProperty.call(markets,code)
function readState() {
  try {
    const current = JSON.parse(localStorage.getItem(key))
    const previous = current || JSON.parse(localStorage.getItem('gamescout:demo:v1')) || {}
    const alerts = (Array.isArray(previous.alerts) ? previous.alerts : []).map(a=>({...a,market:a?.market || 'CO'}))
      .filter(a=>byId(a.id) && validMarket(a.market) && Number.isFinite(a.target) && a.target>=0 && (!a.platform || a.platform==='PC'))
    return {name:typeof previous.name==='string'?previous.name.slice(0,36):'',market:validMarket(previous.market)?previous.market:'CO',alerts}
  } catch { return {name:'',market:'CO',alerts:[]} }
}
let state = readState()
let slide = 0, assistantQuery = '', lastListing = '#/catalogo', noticeTimer
const offers = g => offersFor(g,state.market)
const currency = () => markets[state.market].currency
const price = n => money(n,currency())
const uniq = a => [...new Set(a)]
const detail = (g,market=state.market) => '#/juego/'+g.id+'?mercado='+market
const route = () => {
  const [path,query] = location.hash.slice(1).split('?')
  const [,page,id] = (path || '/').split('/')
  return {page:page || 'inicio',id,params:new URLSearchParams(query)}
}
function notice(message) {
  const n=document.querySelector('#notice')
  n.textContent=message
  clearTimeout(noticeTimer)
  noticeTimer=setTimeout(()=>n.textContent='',3500)
}
function save(message) {
  try { localStorage.setItem(key,JSON.stringify(state)); if(message) notice(message) }
  catch { notice('El navegador solo permite guardar los cambios durante esta sesión.') }
}
const options = (pairs,selected) => pairs.map(([v,t])=>'<option value="'+esc(v)+'" '+(v===selected?'selected':'')+'>'+esc(t)+'</option>').join('')
const select = (name,label,pairs,value) => '<label>'+label+'<select name="'+name+'">'+options(pairs,value)+'</select></label>'
const marketOptions = Object.entries(markets).map(([v,m])=>[v,m.name+' · '+m.currency])
function header(page) {
  const items = [['inicio','compass'],['catalogo','grid'],['ofertas','tag'],['alertas','bell'],['asistente','chat']]
  document.querySelector('#header').innerHTML='<div class="wrap mast"><a class="brand" href="#/" aria-label="GameScout, inicio"><i class="mark" aria-hidden="true"></i>GameScout</a><nav aria-label="Principal">'+items.map(([id,sym])=>'<a href="#/'+(id==='inicio'?'':id)+'" '+(page===id?'aria-current="page"':'')+'>'+icon(sym)+paths[id]+(id==='alertas' && state.alerts.length?' <small>'+state.alerts.length+'</small>':'')+'</a>').join('')+'</nav><select class="market" aria-label="Mercado" id="market">'+options(marketOptions,state.market)+'</select><a class="account" href="#/perfil">'+icon('user')+'<span>'+esc(state.name || 'Mi perfil')+'</span></a></div>'
}
function image(g,important=false) {
  return '<img src="'+esc(coverUrl(g))+'" alt="" loading="'+(important?'eager':'lazy')+'" decoding="async">'
}
function card(g,o=offers(g)[0]) {
  const percent=discount(o)
  return '<a class="game" href="'+detail(g)+'"><div class="art">'+image(g)+(percent?'<b class="discount">−'+percent+'%</b>':'')+'</div><div class="cardinfo"><small>'+esc(g.genre)+'</small><h3>'+esc(g.title)+'</h3><div class="priceline"><strong>'+(o?(o.equivalent?'≈ ':'')+price(o.price):'Sin precio')+'</strong>'+(percent?'<del>'+price(o.regular)+'</del>':'')+'</div><span class="source">'+esc(o?o.store+' · PC':'Sin ofertas en este mercado')+'</span><span class="compare-count">Ver precios · '+storeCount(g)+' '+(storeCount(g)===1?'tienda':'tiendas')+' ›</span></div></a>'
}
const searchBox = (value='')=>'<label class="search">'+icon('search')+'<input type="search" name="q" aria-label="Buscar un juego" placeholder="Busca un videojuego…" maxlength="90" value="'+esc(value)+'"></label>'
const heading = (title,href,label)=>'<div class="sectionhead"><h2>'+title+'</h2><a class="quiet" href="'+href+'">'+label+icon('right')+'</a></div>'
const pageHead = (section,title,desc='')=>'<div class="pagehead"><small class="kicker">'+esc(section)+'</small><h1>'+esc(title)+'</h1>'+(desc?'<p>'+esc(desc)+'</p>':'')+'</div>'
const empty = (title,copy)=>'<div class="empty"><h2>'+esc(title)+'</h2><p>'+esc(copy)+'</p><a class="secondary" href="#/catalogo">Explorar catálogo</a></div>'
const shared = () => games.filter(g=>offers(g).length>=2)
function featured() {
  const common=shared()
  return [byId('red-dead-redemption-2'),common.find(g=>/cyberpunk|hollow knight|control ultimate|disco elysium/i.test(g.title)) || common[0],common.find(g=>/baldur.s gate 3|no man.s sky|stardew valley|alan wake/i.test(g.title)) || common[1]].filter(g=>g && offers(g).length)
}
function hero() {
  const picks=featured(), idx=slide%picks.length, g=picks[idx], list=offers(g), best=list[0]
  const cover=g.id==='red-dead-redemption-2'?'./west-hero.jpg':coverUrl(g)
  return '<section class="feature" aria-label="Juego destacado"><img class="heroart" src="'+esc(cover)+'" alt=""><div class="herocopy"><small class="kicker"><i></i> JUEGO DESTACADO</small><h1>'+esc(g.title)+'</h1><div class="herometa">'+esc(g.genre)+' · '+storeCount(g)+' '+(storeCount(g)===1?'tienda':'tiendas')+'</div><div class="heroaction"><a class="primary" href="'+detail(g)+'">'+icon('compare')+(storeCount(g)>1?'Comparar precios':'Ver precio')+'</a><span>Desde <strong>'+(best.equivalent?'≈ ':'')+price(best.price)+'</strong></span></div></div><div class="slides"><button data-slide="-1" aria-label="Juego destacado anterior">'+icon('left')+'</button><span>'+String(idx+1).padStart(2,'0')+' / '+String(picks.length).padStart(2,'0')+'</span><button data-slide="1" aria-label="Siguiente juego destacado">'+icon('right')+'</button></div></section>'
}
function home() {
  const catalog=shared(), picks=catalog.map(g=>({g,o:offers(g)[0]})).filter(x=>discount(x.o)>0).sort((a,b)=>discount(b.o)-discount(a.o))
  const selections=catalog.filter(g=>!picks.slice(0,4).some(x=>x.g===g)).slice(0,4)
  return '<div class="wrap"><div class="discoverybar"><div class="context"><i></i> ESTUD-IA</div><form id="home-search">'+searchBox()+'</form><span class="currency">Precios de PC <b>·</b> '+currency()+'</span></div><div id="feature">'+hero()+'</div><div class="summaryline"><strong>'+catalog.length+' juegos en dos o más tiendas</strong><span>'+esc(markets[state.market].name)+' · Consulta del '+updated+'</span></div>'+heading('Juegos con descuento','#/ofertas','Todas las ofertas')+'<div class="cards">'+picks.slice(0,4).map(x=>card(x.g,x.o)).join('')+'</div>'+heading('Compara tienda por tienda','#/catalogo','Ver catálogo')+'<div class="cards">'+selections.map(g=>card(g)).join('')+'</div></div>'
}
const pairs = items => items.map(x=>[x,x])
function catalog(deals,params) {
  const stores=uniq(games.flatMap(g=>offers(g).map(o=>o.store))).sort()
  return '<div class="wrap">'+pageHead('JUEGOS DE PC',deals?'Ofertas':'Catálogo','Precios para '+markets[state.market].name+' consultados el '+updated+'.')+'<form id="filters" class="filters">'+searchBox(params.get('q') || '')+
    select('tienda','Tienda',[['','Todas'],...pairs(stores)],params.get('tienda'))+
    select('genero','Género',[['','Todos'],...pairs(uniq(games.map(g=>g.genre)).sort())],params.get('genero'))+
    select('comparar','Disponibilidad',[['','Todos los juegos'],['si','Dos o más en mi mercado']],params.get('comparar'))+
    select('orden','Ordenar por',[['nombre','Nombre A–Z'],['precio','Menor precio'],['descuento','Mayor descuento'],['tiendas','Más tiendas disponibles']],params.get('orden'))+
    '<button class="textbtn" type="reset">Limpiar</button></form><p role="status" class="count" id="count"></p><div id="results"></div></div>'
}
function refreshResults(sync=false) {
  const f=Object.fromEntries(new FormData(document.querySelector('#filters')))
  const {page,params}=route(), deals=page==='ofertas', query=normalize(f.q)
  const rows=[]
  for (const g of games) {
    if (!normalize(g.title+' '+g.genre+' '+(g.developer || '')).includes(query) || (f.genero && g.genre!==f.genero)) continue
    const all=offers(g)
    if (f.comparar==='si' && all.length<2) continue
    const eligible=all.filter(o=>(!f.tienda || o.store===f.tienda) && (!deals || discount(o)>0))
    if (!eligible.length) continue
    const o=f.orden==='descuento'?eligible.reduce((best,x)=>discount(x)>discount(best)?x:best):eligible[0]
    rows.push({g,o,stores:f.orden==='tiendas'?storeCount(g):0})
  }
  rows.sort((a,b)=>(f.orden==='precio'?a.o.price-b.o.price:f.orden==='descuento'?discount(b.o)-discount(a.o):b.stores-a.stores) || a.g.title.localeCompare(b.g.title,'es'))
  const pageSize=24,last=Math.max(1,Math.ceil(rows.length/pageSize))
  const n=sync?1:Math.min(last,Math.max(1,parseInt(params.get('pagina'),10)||1))
  function url(i) {
    const p=new URLSearchParams(Object.entries(f).filter(([k,v])=>v && !(k==='orden' && v==='nombre')))
    if(i>1) p.set('pagina',String(i))
    return '#/'+page+(p.toString()?'?'+p:'')
  }
  lastListing=url(n)
  if(sync) history.replaceState(null,'',lastListing)
  document.querySelector('#count').textContent=rows.length?rows.length+' juegos · Mostrando '+((n-1)*pageSize+1)+'–'+Math.min(n*pageSize,rows.length):'0 juegos'
  const pager=last>1?'<nav class="pager" aria-label="Páginas del catálogo">'+(n>1?'<a class="secondary" href="'+esc(url(n-1))+'">‹ Anterior</a>':'')+'<span>Página '+n+' de '+last+'</span>'+(n<last?'<a class="secondary" href="'+esc(url(n+1))+'">Siguiente ›</a>':'')+'</nav>':''
  document.querySelector('#results').innerHTML=rows.length?'<div class="cards">'+rows.slice((n-1)*pageSize,n*pageSize).map(x=>card(x.g,x.o)).join('')+'</div>'+pager:'<div class="empty"><h2>Sin coincidencias</h2><p>Prueba con otro título o limpia los filtros.</p></div>'
}
function storeCount(g) {
  return new Set(g.offers.filter(o=>o.market===state.market || o.market==='US').map(o=>o.store)).size
}
function offerRows(g,list,lowestLabel='Mejor precio') {
  const best=list[0]
  return '<ul class="store-list">'+list.map(o=>{
    const lowest=list.length>1 && o.price===best.price
    const hint=lowest?lowestLabel:o.source || 'Tienda oficial'
    const amount=money(o.amount,o.currency)
    return '<li><a class="store-offer" href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(g.title+' en '+o.store+', '+amount+', '+markets[o.market].name)+'">'+
      '<span class="seller"><strong>'+esc(o.store)+'</strong><small class="'+(lowest?'met':'')+'">'+esc(hint)+'</small></span>'+
      '<span class="offer-price"><b>'+esc(amount)+'</b>'+(discount(o)?'<del>'+esc(money(o.originalRegular,o.currency))+'</del>':'')+(o.equivalent?'<small>≈ '+money(o.price,markets[o.market].currency)+'</small>':'')+'</span>'+
      '<span class="store-go"><span>Ver oferta</span> ↗</span></a></li>'
  }).join('')+'</ul>'
}
function gamePage(g) {
  const list=offers(g), best=list[0], goal=state.alerts.find(a=>a.id===g.id && a.market===state.market)
  const localStores=new Set(list.map(o=>o.store))
  const others=state.market==='US'?[]:offersFor(g,'US').filter(o=>!localStores.has(o.store))
  const intro='<div class="wrap"><a class="back" href="'+esc(lastListing)+'">‹ Volver al catálogo</a><div class="gameintro"><div class="detailart">'+image(g,true)+'</div>'+pageHead(g.genre,g.title,[g.developer,g.year,'PC'].filter(Boolean).join(' · '))+'</div>'
  const storeLabel=n=>n+' '+(n===1?'tienda':'tiendas')
  const spread=best?list[list.length-1].price-best.price:0
  const local='<section class="panel price-panel"><h2>Precios en '+esc(markets[state.market].name)+'</h2><p class="quote-meta">'+storeLabel(list.length)+' · '+updated+'</p>'+
    (best?offerRows(g,list):'<p>Sin ofertas verificadas para este mercado.</p>')+
    (spread>0?'<p class="savings">Diferencia entre tiendas <strong>'+price(spread)+'</strong></p>':'')+
    (list.some(o=>o.equivalent)?'<p class="rate">Equivalentes en pesos calculados con la TRM de '+money(exchange.usdCop,'USD').replace(' USD','')+' COP por dólar.</p>':'')+'</section>'
  const international=others.length?'<section class="panel price-panel"><h2>Más tiendas en Estados Unidos</h2><p class="quote-meta">'+storeLabel(others.length)+' · USD · '+updated+'</p><p class="market-note">Estas ofertas corresponden a Estados Unidos. Comprueba en la tienda si puedes comprarlas y activar el juego en tu país.</p>'+offerRows(g,others,'Menor de esta lista')+'<a class="quiet" href="'+detail(g,'US')+'">Ver todas las ofertas de Estados Unidos ›</a></section>':''
  let goalPanel=''
  if(best) {
    const defaultTarget=currency()==='COP'?Math.floor(best.price*.9):(best.price*.9).toFixed(2)
    goalPanel='<aside class="panel alertpanel">'+icon('bell')+'<h2>Alerta de precio</h2><p>Guarda tu objetivo para '+esc(markets[state.market].name)+'. Podrás consultar el resultado en Mis alertas.</p><form id="target-form" data-id="'+esc(g.id)+'"><label>Mi precio objetivo ('+currency()+')<input type="number" name="target" required min="0" max="99999999" step="'+(currency()==='COP'?'1':'0.01')+'" value="'+(goal?.target??defaultTarget)+'"></label><button class="primary">'+(goal?'Actualizar alerta':'Crear alerta')+'</button></form></aside>'
  }
  return intro+'<div class="columns"><div class="price-groups">'+local+international+'</div>'+goalPanel+'</div></div>'
}
function alertsPage() {
  return '<div class="wrap">'+pageHead('SEGUIMIENTO','Mis alertas','Cada objetivo conserva su mercado y moneda. El estado se calcula con la última consulta de precios.')+
  (state.alerts.length?'<div class="alertlist">'+state.alerts.map(a=>{
    const g=byId(a.id),best=offersFor(g,a.market)[0],cur=markets[a.market].currency,reached=best && best.price<=a.target
    return '<article class="alertrow"><div class="thumb">'+image(g)+'</div><div><small>'+esc(markets[a.market].name)+'</small><h3><a href="'+detail(g,a.market)+'">'+esc(g.title)+'</a></h3><span class="'+(reached?'met':'muted')+'">'+(!best?'Sin cotización':reached?'Objetivo alcanzado':'En seguimiento')+'</span></div><div>Objetivo <b>'+money(a.target,cur)+'</b><small>'+(best?'Actual '+money(best.price,cur):'Sin precio')+'</small></div><a class="secondary" href="'+detail(g,a.market)+'">Editar</a><button class="textbtn" data-remove="'+g.id+'" data-market="'+a.market+'">Quitar</button></article>'
  }).join('')+'</div>':empty('Todavía no tienes alertas','Abre un juego y guarda tu precio objetivo.'))+'</div>'
}
function profilePage() {
  return '<div class="wrap narrow">'+pageHead('CUENTA LOCAL','Mi perfil','Tu alias y tus alertas se guardan en este navegador.')+'<form id="profile" class="panel stack"><label>Alias<input name="alias" maxlength="36" required value="'+esc(state.name)+'"></label><button class="primary">Guardar alias</button>'+(state.name?'<button class="textbtn" type="button" data-signout>Usar como invitado</button>':'')+'</form></div>'
}
function assistantPage() {
  const suggestion=currency()==='COP'?'Menos de 50.000':'Menos de 20'
  return '<div class="wrap narrow">'+pageHead('ASISTENTE DEL CATÁLOGO','Encuentra tu juego','Busca por título, género o presupuesto en '+currency()+'.')+'<form id="assistant" class="panel stack"><label>¿Qué estás buscando?<input name="query" required maxlength="120" value="'+esc(assistantQuery)+'" placeholder="'+suggestion+'"></label><button class="primary">Ver sugerencias</button></form><div class="suggest">'+[suggestion,'Aventura','Minecraft'].map(q=>'<button class="secondary" data-query="'+q+'">'+q+'</button>').join('')+'</div><section id="answer" aria-live="polite"></section></div>'
}
function answer(q) {
  const budget=q.toLowerCase().match(/(menos de|hasta|por debajo de|máximo de|maximo de|presupuesto de|\$)\s*\$?\s*([\d.,]+)/)
  let max=Infinity
  if(budget) {
    const raw=budget[2]
    max=Number((/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(raw)?raw.replaceAll('.',''):raw).replace(',','.'))
  }
  const words=normalize(budget?q.replace(budget[0],''):q).split(' ').filter(w=>w && !['juegos','juego','por','de','en','para','cop','usd','eur','euros','pesos','dolares','quiero','un','una','con','hasta'].includes(w))
  const matches=games.map(g=>({g,o:offers(g)[0]})).filter(({g,o})=>o && (/^(menos|por debajo)/.test(budget?.[0])?o.price<max:o.price<=max) && words.every(w=>normalize(g.title+' '+g.genre).includes(w))).sort((a,b)=>a.o.price-b.o.price).slice(0,8)
  document.querySelector('#answer').innerHTML=matches.length?'<h2>Sugerencias</h2><div class="cards smallcards">'+matches.map(x=>card(x.g,x.o)).join('')+'</div>':empty('Sin coincidencias','Prueba otro título o amplía el presupuesto.')
}
function panelPage() {
  const count=shared().length
  return '<div class="wrap narrow">'+pageHead('DATOS DEL CATÁLOGO','Fuentes y precios','Última consulta del '+updated+'.')+'<section class="panel stack"><h2>'+count+' juegos comparables</h2><p>En '+markets[state.market].name+', estos juegos tienen precios en al menos dos tiendas para la misma edición de PC. Los precios regionales proceden de Steam, GOG, Nuuvem y Microsoft Store. CheapShark aporta precios de otras tiendas para Estados Unidos y dirige a cada vendedor. Cada ficha indica el mercado donde se consultó la oferta.</p><p>En Colombia, GOG publica en dólares. Para ordenar las ofertas se usa la TRM vigente del '+exchange.validFrom+' al '+exchange.validTo+'.</p><a class="quiet" href="https://www.datos.gov.co/resource/32sa-8pi3.json" target="_blank" rel="noopener noreferrer">Consultar la fuente de la TRM ↗</a></section><form id="simulator" class="panel stack"><h2>Probar un precio</h2><p>Compara una oferta que hayas encontrado con la más económica del catálogo.</p>'+select('game','Juego',games.filter(g=>offers(g).length).map(g=>[g.id,g.title]),'')+'<label>Precio que encontraste ('+currency()+')<input type="number" name="amount" min="0" max="99999999" step="'+(currency()==='COP'?'1':'0.01')+'" required></label><button class="primary">Comparar mi precio</button><output id="sim-result" aria-live="polite"></output></form></div>'
}
function infoPage(contact) {
  if(contact) return '<div class="wrap narrow">'+pageHead('ESTUD-IA','Contacto')+'<section class="panel stack"><h2>Habla con el equipo</h2><a class="quiet" href="mailto:videojuegos65@gmail.com">videojuegos65@gmail.com</a><a class="secondary" target="_blank" rel="noopener noreferrer" href="https://wa.me/573057654678">Abrir WhatsApp</a></section></div>'
  const faq=[['¿Cómo se comparan los juegos?','Elige un mercado y abre una ficha. Las tiendas se ordenan por precio para una misma edición de PC.'],['¿Qué precio voy a pagar?','Cada ficha muestra el importe regional de la última consulta. Comprueba la disponibilidad, los impuestos y el total en la tienda antes de comprar.'],['¿Cómo funcionan las alertas?','Cada objetivo tiene un juego, una moneda y un mercado. Abre Mis alertas para ver si el último precio alcanza tu objetivo.'],['¿Dónde están mis datos?','El alias, la región preferida y las alertas se guardan en este navegador.']]
  return '<div class="wrap narrow">'+pageHead('AYUDA','Preguntas frecuentes')+'<div class="panel">'+faq.map(([q,a])=>'<details><summary>'+q+'</summary><p>'+a+'</p></details>').join('')+'</div><p><a class="quiet" href="#/panel">Fuentes y precios</a></p></div>'
}
function render(focus=false) {
  const {page,id,params}=route(),g=page==='juego'?byId(id):null
  if(g && validMarket(params.get('mercado')) && state.market!==params.get('mercado')) {state.market=params.get('mercado');save()}
  const views={inicio:home,catalogo:()=>catalog(false,params),ofertas:()=>catalog(true,params),alertas:alertsPage,perfil:profilePage,asistente:assistantPage,panel:panelPage,ayuda:()=>infoPage(false),contacto:()=>infoPage(true)}
  header(page)
  main.innerHTML=g?gamePage(g):Object.prototype.hasOwnProperty.call(views,page)?views[page]():'<div class="wrap">'+empty('Ficha no disponible','Busca otro título en el catálogo oficial.')+'</div>'
  document.title=(g?.title || paths[page] || 'Ficha no disponible')+' · GameScout'
  if(['catalogo','ofertas'].includes(page)) refreshResults()
  if(page==='asistente' && assistantQuery) answer(assistantQuery)
  if(focus) {main.focus({preventScroll:true});window.scrollTo(0,0)}
}
document.addEventListener('submit',e=>{
  e.preventDefault()
  const f=e.target,data=new FormData(f)
  if(f.id==='home-search') location.hash='/catalogo?q='+encodeURIComponent(data.get('q').trim())
  if(f.id==='filters') refreshResults(true)
  if(f.id==='target-form') {
    state.alerts=state.alerts.filter(a=>a.id!==f.dataset.id || a.market!==state.market)
    state.alerts.push({id:f.dataset.id,market:state.market,target:Number(data.get('target'))})
    save('Alerta guardada');location.hash='/alertas'
  }
  if(f.id==='profile') {
    const name=data.get('alias').trim()
    if(!name) {notice('Escribe un alias.');return}
    state.name=name;save('Alias guardado');render()
  }
  if(f.id==='assistant') {assistantQuery=data.get('query').trim().toLowerCase();answer(assistantQuery)}
  if(f.id==='simulator') {
    const best=offers(byId(data.get('game')))[0], diff=Number(data.get('amount'))-best.price
    document.querySelector('#sim-result').textContent=diff===0?'Tu precio coincide con el de '+best.store+'.':'Tu oferta cuesta '+price(Math.abs(diff))+(diff<0?' menos':' más')+' que la de '+best.store+'.'
  }
})
document.addEventListener('input',e=>{if(e.target.closest('#filters'))refreshResults(true)})
document.addEventListener('reset',e=>{
  if(e.target.id!=='filters')return
  e.preventDefault()
  for(const input of e.target.querySelectorAll('input,select')) input.value=input.name==='orden'?'nombre':''
  refreshResults(true)
})
document.addEventListener('change',e=>{
  if(e.target.id!=='market' || !validMarket(e.target.value))return
  state.market=e.target.value;assistantQuery='';save()
  const {page,id}=route()
  if(page==='juego' && byId(id)) history.replaceState(null,'',detail(byId(id)))
  render()
})
document.addEventListener('click',e=>{
  const b=e.target.closest('button')
  if(!b)return
  if(b.hasAttribute('data-slide')) {const n=featured().length;slide=(slide+Number(b.dataset.slide)+n)%n;document.querySelector('#feature').innerHTML=hero();document.querySelector('[data-slide="'+b.dataset.slide+'"]').focus({preventScroll:true})}
  if(b.hasAttribute('data-remove')){state.alerts=state.alerts.filter(a=>a.id!==b.dataset.remove || a.market!==b.dataset.market);save('Alerta eliminada');render()}
  if(b.hasAttribute('data-signout')){state.name='';save('Perfil de invitado activo');render()}
  if(b.hasAttribute('data-query')){assistantQuery=b.dataset.query;document.querySelector('#assistant input').value=assistantQuery;answer(assistantQuery)}
})
document.addEventListener('error',e=>{
  if(e.target.tagName==='IMG') {e.target.hidden=true;e.target.parentElement.classList.add('missing-cover')}
},true)
document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();main.focus()})
window.addEventListener('hashchange',()=>render(true))
window.addEventListener('storage',e=>{if(e.key===key || e.key===null){state=readState();render()}})
render()
