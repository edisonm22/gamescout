import { games, offersFor, discount, normalize, money, markets, updated, exchange } from './data.js'

const main = document.querySelector('main')
const gameIndex = new Map(games.map(g => [g.id,g]))
const searchIndex = new Map(games.map(g => [g.id,normalize([g.title,g.genre,g.developer].filter(Boolean).join(' '))]))
const byId = id => gameIndex.get(id)
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const paths = { inicio:'Explorar', catalogo:'Catálogo', ofertas:'Ofertas', alertas:'Mis alertas', asistente:'Asistente', perfil:'Mi perfil', ayuda:'Ayuda', contacto:'Contacto', panel:'Fuentes y precios',nosotros:'Sobre GameScout',metodo:'Metodología',tiendas:'Para tiendas',privacidad:'Privacidad' }
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
  const nav = items.map(([id,symbol]) => {
    const active = page===id || (page==='juego' && id==='catalogo')
    const count = id==='alertas' && state.alerts.length ? ' <small>'+state.alerts.length+'</small>' : ''
    return '<a href="#/'+(id==='inicio'?'':id)+'" '+(active?'aria-current="page"':'')+'>'+icon(symbol)+paths[id]+count+'</a>'
  }).join('')
  const marketControl='<div class="market-control"><select class="market" aria-label="Mercado" id="market">'+options(marketOptions,state.market)+'</select><span class="market-short" aria-hidden="true">'+state.market+' · '+currency()+' ▾</span></div>'
  document.querySelector('#header').innerHTML='<div class="wrap mast"><a class="brand" href="#/" aria-label="GameScout, inicio"><img src="./gamescout.svg" width="34" height="34" alt="">GameScout</a><nav aria-label="Principal">'+nav+'</nav>'+marketControl+'<a class="account" href="#/perfil">'+icon('user')+'<span>'+esc(state.name || 'Mi perfil')+'</span></a></div>'
}
function image(g,important=false) {
  return '<img src="'+esc(coverUrl(g))+'" alt="" loading="'+(important?'eager':'lazy')+'" decoding="async">'
}
const storeLabel = n => n+' '+(n===1?'tienda':'tiendas')
function card(g,o=offers(g)[0]) {
  const percent=discount(o), local=offers(g).length
  const href=detail(g)+(o && o.store!==offers(g)[0]?.store?'&tienda='+encodeURIComponent(o.store):'')
  return '<a class="game" href="'+esc(href)+'"><div class="art">'+image(g)+(percent?'<b class="discount">−'+percent+'%</b>':'')+'</div><div class="cardinfo"><small>'+esc(g.genre)+'</small><h3>'+esc(g.title)+'</h3><div class="priceline"><strong>'+(o?(o.equivalent?'≈ ':'')+price(o.price):'Sin precio')+'</strong>'+(percent?'<del>'+price(o.regular)+'</del>':'')+'</div><span class="source">'+esc(o?o.store+' · PC':'Sin ofertas en este mercado')+'</span><span class="compare-count">'+icon('compare')+storeLabel(local)+' en '+markets[state.market].name+'</span></div></a>'
}
const searchBox = (value='')=>'<label class="search">'+icon('search')+'<input type="search" name="q" aria-label="Buscar un juego" placeholder="Busca un videojuego…" maxlength="90" value="'+esc(value)+'"></label>'
const heading = (title,href,label)=>'<div class="sectionhead"><h2>'+title+'</h2><a class="quiet" href="'+href+'">'+label+'</a></div>'
const pageHead = (section,title,desc='')=>'<div class="pagehead"><small class="kicker">'+esc(section)+'</small><h1>'+esc(title)+'</h1>'+(desc?'<p>'+esc(desc)+'</p>':'')+'</div>'
const empty = (title,copy)=>'<div class="empty"><h2>'+esc(title)+'</h2><p>'+esc(copy)+'</p><a class="secondary" href="#/catalogo">Explorar catálogo</a></div>'
const shared = () => games.filter(g=>offers(g).length>=2)
function featured() {
  const common=shared()
  return [byId('red-dead-redemption-2'),common.find(g=>/cyberpunk|hollow knight|control ultimate|disco elysium/i.test(g.title)) || common[0],common.find(g=>/baldur.s gate 3|no man.s sky|stardew valley|alan wake/i.test(g.title)) || common[1]].filter(g=>g && offers(g).length)
}
function hero() {
  const picks=featured()
  if(!picks.length) return empty('Sin destacados en este mercado','Puedes consultar la disponibilidad en el catálogo.')
  const idx=slide%picks.length, g=picks[idx], best=offers(g)[0]
  const cover=g.id==='red-dead-redemption-2'?'./west-hero.jpg':coverUrl(g)
  return '<section class="feature" aria-label="Juego destacado"><img class="heroart" src="'+esc(cover)+'" fetchpriority="high" alt=""><div class="herocopy"><small class="feature-tag">Juego destacado</small><h2>'+esc(g.title)+'</h2><p class="hero-price">Desde <strong>'+(best.equivalent?'≈ ':'')+price(best.price)+'</strong> en '+esc(best.store)+'</p><a class="primary" href="'+detail(g)+'">'+icon('compare')+'Comparar precios</a></div><div class="slides"><button data-slide="-1" aria-label="Juego destacado anterior">'+icon('left')+'</button><span>'+(idx+1)+' / '+picks.length+'</span><button data-slide="1" aria-label="Siguiente juego destacado">'+icon('right')+'</button></div></section>'
}
const coverage = {
  stores: new Set(games.flatMap(g=>g.offers.map(o=>o.store))).size,
  prices: games.reduce((total,g)=>total+g.offers.length,0)
}
function home() {
  const available=games.filter(g=>offers(g).length)
  const deals=available.map(g=>({g,o:highestDiscount(offers(g))})).filter(x=>discount(x.o)>0).sort(compareDiscounts).slice(0,3)
  const comparison=available.slice().sort((a,b)=>offers(b).length-offers(a).length || a.title.localeCompare(b.title,'es')).slice(0,4)
  const dealRows=deals.map(({g,o})=>'<a class="deal-line" href="'+esc(detail(g)+'&tienda='+encodeURIComponent(o.store))+'"><span class="deal-cover">'+image(g)+'</span><span class="deal-title"><strong>'+esc(g.title)+'</strong><small>'+esc(o.store)+'</small></span><span class="deal-money"><b>−'+discount(o)+'%</b><strong>'+(o.equivalent?'≈ ':'')+price(o.price)+'</strong></span></a>').join('')
  return '<div class="wrap"><section class="home-intro"><div><h1>Compara precios de <em>videojuegos.</em></h1><p>Encuentra tu juego y consulta cuánto cuesta en cada tienda de PC.</p></div><form id="home-search">'+searchBox()+'<button class="search-submit" type="submit">Buscar</button></form></section>'+
    '<div class="lead-grid"><div id="feature">'+hero()+'</div><section class="deal-board"><div class="board-head">'+icon('tag')+'<h2>Mayores descuentos</h2></div>'+dealRows+'<a class="quiet board-link" href="#/ofertas?orden=descuento">Ver todas las ofertas</a></section></div>'+
    '<div class="data-strip"><span><strong>'+games.length+'</strong> juegos de PC</span><span><strong>'+coverage.stores+'</strong> tiendas</span><span><strong>'+coverage.prices.toLocaleString('es-CO')+'</strong> precios regionales</span><span class="strip-date">Última consulta <b>'+updated+'</b></span></div>'+
    heading('Juegos con más tiendas','#/catalogo?orden=tiendas','Ver catálogo')+'<div class="cards">'+comparison.map(g=>card(g)).join('')+'</div>'+
    '<section class="project-note"><div>'+icon('compass')+'<h2>Cómo comparamos</h2></div><p>Cruzamos la edición, la plataforma y el mercado para que puedas comparar dos precios del mismo juego.</p><a class="secondary" href="#/metodo">Ver metodología</a></section></div>'
}
const pairs = items => items.map(x=>[x,x])
const highestDiscount = list => list.reduce((best,o)=>discount(o)>discount(best)?o:best)
const compareDiscounts = (a,b) => discount(b.o)-discount(a.o) || a.o.price-b.o.price || a.g.title.localeCompare(b.g.title,'es')
function catalog(deals,params) {
  const stores=uniq(games.flatMap(g=>offers(g).map(o=>o.store))).sort()
  const expanded=!window.matchMedia('(max-width: 620px)').matches || ['tienda','genero','comparar','orden'].some(k=>params.has(k))
  return '<div class="wrap">'+pageHead('JUEGOS DE PC',deals?'Ofertas':'Catálogo','Precios para '+markets[state.market].name+' consultados el '+updated+'.')+'<form id="filters" class="filters">'+searchBox(params.get('q') || '')+'<details class="filter-options" '+(expanded?'open':'')+'><summary>Filtrar y ordenar <span id="filter-count"></span></summary><div class="filter-fields">'+
    select('tienda','Tienda',[['','Todas'],...pairs(stores)],params.get('tienda'))+
    select('genero','Género',[['','Todos'],...pairs(uniq(games.map(g=>g.genre)).sort())],params.get('genero'))+
    select('comparar','Disponibilidad',[['','Todos los juegos'],['si','Dos o más en mi mercado']],params.get('comparar'))+
    select('orden','Ordenar por',[['nombre','Nombre A–Z'],['precio','Menor precio'],['descuento','Mayor descuento'],['tiendas','Más tiendas en mi mercado']],params.get('orden') || (deals?'descuento':'nombre'))+
    '<button class="textbtn" type="reset">Limpiar</button></div></details></form><p role="status" class="count" id="count"></p><div id="results"></div></div>'
}
function refreshResults(sync=false) {
  const f=Object.fromEntries(new FormData(document.querySelector('#filters')))
  const {page,params}=route(), deals=page==='ofertas', query=normalize(f.q)
  const rows=[]
  for (const g of games) {
    if (!searchIndex.get(g.id).includes(query) || (f.genero && g.genre!==f.genero)) continue
    const all=offers(g)
    if (f.comparar==='si' && all.length<2) continue
    const eligible=all.filter(o=>(!f.tienda || o.store===f.tienda) && (!deals || discount(o)>0))
    if (!eligible.length) continue
    const o=f.orden==='descuento'?highestDiscount(eligible):eligible[0]
    rows.push({g,o,stores:all.length})
  }
  if(f.orden==='descuento') rows.sort(compareDiscounts)
  else rows.sort((a,b)=>(f.orden==='precio'?a.o.price-b.o.price:f.orden==='tiendas'?b.stores-a.stores:0) || a.g.title.localeCompare(b.g.title,'es'))
  const pageSize=24,last=Math.max(1,Math.ceil(rows.length/pageSize))
  const n=sync?1:Math.min(last,Math.max(1,parseInt(params.get('pagina'),10)||1))
  function url(i) {
    const p=new URLSearchParams(Object.entries(f).filter(([k,v])=>v && !(k==='orden' && v===(deals?'descuento':'nombre'))))
    p.set('mercado',state.market)
    if(i>1) p.set('pagina',String(i))
    return '#/'+page+(p.toString()?'?'+p:'')
  }
  lastListing=url(n)
  if(sync) history.replaceState(null,'',lastListing)
  const activeFilters=[f.tienda,f.genero,f.comparar].filter(Boolean).length
  document.querySelector('#filter-count').textContent=activeFilters?'('+activeFilters+')':''
  document.querySelector('#count').textContent=rows.length?rows.length+(rows.length===1?' juego':' juegos')+' · Mostrando '+((n-1)*pageSize+1)+'–'+Math.min(n*pageSize,rows.length):'0 juegos'
  const pager=last>1?'<nav class="pager" aria-label="Páginas del catálogo">'+(n>1?'<a class="secondary" href="'+esc(url(n-1))+'">‹ Anterior</a>':'')+'<span>Página '+n+' de '+last+'</span>'+(n<last?'<a class="secondary" href="'+esc(url(n+1))+'">Siguiente ›</a>':'')+'</nav>':''
  document.querySelector('#results').innerHTML=rows.length?'<div class="cards">'+rows.slice((n-1)*pageSize,n*pageSize).map(x=>card(x.g,x.o)).join('')+'</div>'+pager:'<div class="empty"><h2>Sin coincidencias</h2><p>Prueba con otro título o limpia los filtros.</p><button type="reset" form="filters" class="secondary">Ver todos los juegos</button></div>'
}
function offerRows(g,list,lowestLabel='Mejor precio',selectedStore='') {
  const best=list[0]
  return '<ul class="store-list">'+list.map(o=>{
    const lowest=list.length>1 && o.price===best.price
    const hint=lowest?lowestLabel:o.source || 'Tienda oficial'
    const amount=money(o.amount,o.currency)
    const selected=o.store===selectedStore
    return '<li><a class="store-offer'+(selected?' selected-offer':'')+'" href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(g.title+' en '+o.store+', '+amount+', '+markets[o.market].name+(selected?', tienda seleccionada':''))+'">'+
      '<span class="seller-wrap"><span class="store-symbol" data-store="'+esc(o.store)+'" aria-hidden="true"></span><span class="seller"><strong>'+esc(o.store)+'</strong><small class="'+(lowest?'met':'')+'">'+esc(hint)+'</small>'+(selected?'<small class="picked">Tienda seleccionada</small>':'')+'</span></span>'+
      '<span class="offer-price"><b>'+esc(amount)+'</b>'+(discount(o)?'<del>'+esc(money(o.originalRegular,o.currency))+'</del>':'')+(o.equivalent?'<small>≈ '+money(o.price,markets[o.market].currency)+'</small>':'')+'</span>'+
      '<span class="store-go"><span>Ver oferta</span> ↗</span></a></li>'
  }).join('')+'</ul>'
}
function gamePage(g,selectedStore) {
  const list=offers(g), best=list[0], goal=state.alerts.find(a=>a.id===g.id && a.market===state.market)
  const localStores=new Set(list.map(o=>o.store))
  const others=state.market==='US'?[]:offersFor(g,'US').filter(o=>!localStores.has(o.store))
  const summary=best?'<div class="best-summary"><div><span>Menor precio en '+markets[state.market].name+'</span><strong>'+money(best.amount,best.currency)+'</strong><small>'+esc(best.store)+(best.equivalent?' · ≈ '+price(best.price):'')+'</small></div><a class="primary" target="_blank" rel="noopener noreferrer" href="'+esc(best.url)+'">Ver en '+esc(best.store)+' ↗</a></div>':''
  const backLabel=lastListing.startsWith('#/ofertas')?'Volver a ofertas':'Volver al catálogo'
  const intro='<div class="wrap"><a class="back" href="'+esc(lastListing)+'">‹ '+backLabel+'</a><div class="gameintro"><div class="detailart">'+image(g,true)+'</div><div>'+pageHead(g.genre,g.title,[g.developer,g.year,'PC'].filter(Boolean).join(' · '))+summary+'</div></div>'
  const spread=best?list[list.length-1].price-best.price:0
  const reportBody=['Juego: '+g.title,'Mercado: '+markets[state.market].name,'Ficha: https://edisonm22.github.io/gamescout/'+detail(g),'Tienda: ','Precio que aparece en la tienda: '].join('\n')
  const reportLink='mailto:'+contactEmail+'?subject='+encodeURIComponent('Revisión de precio · '+g.title)+'&body='+encodeURIComponent(reportBody)
  const local='<section class="panel price-panel"><h2>Precios en '+esc(markets[state.market].name)+'</h2><p class="quote-meta">'+storeLabel(list.length)+' · '+updated+'</p>'+
    (best?offerRows(g,list,'Mejor precio',selectedStore):'<p>Sin ofertas verificadas para este mercado.</p>')+
    (spread>0?'<p class="savings">Diferencia entre tiendas <strong>'+price(spread)+'</strong></p>':'')+
    (list.some(o=>o.equivalent)?'<p class="rate">Equivalentes en pesos calculados con la TRM de '+money(exchange.usdCop,'USD').replace(' USD','')+' COP por dólar.</p>':'')+'<a class="quiet" href="'+esc(reportLink)+'">Informar de un precio incorrecto</a></section>'
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
  const budget=q.match(/(menos de|hasta|por debajo de|m[áa]ximo(?: de)?|presupuesto de|\$)\s*\$?\s*(\d+(?:[.,]\d+|[ \u00a0]\d{3}\b)*)/i)
  let max=Infinity
  if(budget) {
    const raw=budget[2].replace(/\s/g,'')
    const decimal=raw.match(/[.,](\d{1,2})$/)
    const digits=raw.replace(/[.,]/g,'')
    max=Number(digits)/(decimal?10**decimal[1].length:1)
  }
  const words=normalize(budget?q.replace(budget[0],''):q).split(' ').filter(w=>w && !['juegos','juego','por','de','en','para','cop','usd','eur','euros','pesos','dolares','quiero','un','una','con','hasta'].includes(w))
  const exclusive=/^(menos|por debajo)/i.test(budget?.[0])
  const matches=games.map(g=>({g,o:offers(g)[0]})).filter(({g,o})=>o && (exclusive?o.price<max:o.price<=max) && words.every(w=>searchIndex.get(g.id).includes(w))).sort((a,b)=>a.o.price-b.o.price).slice(0,8)
  document.querySelector('#answer').innerHTML=matches.length?'<h2>Sugerencias</h2><div class="cards smallcards">'+matches.map(x=>card(x.g,x.o)).join('')+'</div>':empty('Sin coincidencias','Prueba otro título o amplía el presupuesto.')
}
function panelPage() {
  const count=shared().length
  return '<div class="wrap narrow">'+pageHead('DATOS DEL CATÁLOGO','Fuentes y precios','Última consulta del '+updated+'.')+'<section class="panel stack"><h2>'+count+' juegos comparables</h2><p>En '+markets[state.market].name+', estos juegos tienen precios en al menos dos tiendas para la misma edición de PC. Los precios regionales proceden de Steam, GOG, Nuuvem y Microsoft Store. CheapShark aporta precios de otras tiendas para Estados Unidos y dirige a cada vendedor. Cada ficha indica el mercado donde se consultó la oferta.</p><p>En Colombia, GOG publica en dólares. Para ordenar las ofertas se usa la TRM vigente del '+exchange.validFrom+' al '+exchange.validTo+'.</p><a class="quiet" href="https://www.datos.gov.co/resource/32sa-8pi3.json" target="_blank" rel="noopener noreferrer">Consultar la fuente de la TRM ↗</a></section><form id="simulator" class="panel stack"><h2>Probar un precio</h2><p>Compara una oferta que hayas encontrado con la más económica del catálogo.</p>'+select('game','Juego',games.filter(g=>offers(g).length).map(g=>[g.id,g.title]),'')+'<label>Precio que encontraste ('+currency()+')<input type="number" name="amount" min="0" max="99999999" step="'+(currency()==='COP'?'1':'0.01')+'" required></label><button class="primary">Comparar mi precio</button><output id="sim-result" aria-live="polite"></output></form></div>'
}
function aboutPage() {
  return '<div class="wrap"><section class="story-intro"><div>'+pageHead('Un proyecto de Estud-IA','Sobre GameScout','Comprar un juego de PC puede implicar abrir varias tiendas, revisar ediciones y convertir monedas. Reunimos esas ofertas en una sola ficha para que puedas elegir con más información.')+'</div><img class="brand-poster" src="./gamescout-social.png" width="1200" height="630" alt="Identidad gráfica de GameScout"></section>'+
    '<div class="story-pair"><section class="story-block">'+icon('compare')+'<h2>Nuestra misión</h2><p>Ayudar a cada jugador a decidir dónde comprar la edición que quiere, con el precio, la tienda y la moneda a la vista. En Colombia, eso incluye poder comparar una oferta en dólares con otra en pesos.</p></section>'+
    '<section class="story-block">'+icon('compass')+'<h2>Nuestra visión</h2><p>Queremos que cualquier persona que juegue en PC en un mercado hispanohablante pueda consultar los precios de su región antes de comprar. Nuestro siguiente paso es ampliar la cobertura de tiendas que publican precios locales.</p></section></div>'+
    '<section class="project-note"><div><h2>El catálogo hoy</h2></div><p>'+games.length+' juegos con precios consultados en '+coverage.stores+' tiendas para Colombia, Estados Unidos y España. Cada ficha indica la fecha de consulta.</p><a class="secondary" href="#/catalogo">Explorar catálogo</a></section></div>'
}
function methodPage() {
  return '<div class="wrap narrow">'+pageHead('GameScout','Cómo comparamos','Una oferta resulta útil cuando sabes qué edición compras, para qué mercado y en qué moneda pagarás.')+
    '<div class="article"><section><h2>Identificamos la edición</h2><p>Cruzamos los identificadores de los catálogos y los nombres de los productos. En las coincidencias de Steam y GOG comprobamos también el tipo de producto y el año. Una edición especial puede tener un precio diferente al juego base.</p></section>'+
    '<section><h2>Respetamos el mercado</h2><p>Tu país determina qué ofertas se muestran primero. Si hay vendedores adicionales en Estados Unidos, aparecen en una sección propia. La disponibilidad y las condiciones de activación se confirman en la tienda.</p></section>'+
    '<section><h2>Ordenamos por precio</h2><p>En cada lista de la ficha ordenamos las ofertas de menor a mayor. Mostramos la moneda original y, cuando corresponde, el equivalente en pesos con la TRM de la consulta. El descuento se calcula con el precio de referencia de esa misma tienda.</p><a class="quiet" href="#/panel">Consultar fuentes y conversión</a></section>'+
    '<section><h2>Independencia comercial</h2><p>Las propuestas de tiendas se evalúan por separado. El orden de los precios se calcula a partir de los importes publicados. Si incorporamos un espacio patrocinado, deberá llevar una identificación visible.</p></section>'+
    '<section><h2>Corregir una oferta</h2><p>Si encuentras otra edición, una moneda incorrecta o un enlace roto, envíanos la ficha, el país y la tienda para que podamos revisarlos.</p><a class="quiet" href="#/contacto">Contactar con el equipo</a></section></div></div>'
}
const contactEmail='videojuegos65@gmail.com'
function tradePage() {
  return '<div class="wrap">'+pageHead('Colaboraciones','Para tiendas y distribuidores','Si vendes juegos de PC, cuéntanos qué catálogo tienes y en qué países está disponible.')+
    '<div class="business-grid"><section class="article"><h2>Qué propuestas estudiamos</h2><h3>Integración de catálogo</h3><p>Buscamos ofertas con edición identificable, mercado de venta, moneda, precio y un enlace estable al producto.</p><h3>Programas de afiliación</h3><p>Podemos evaluar acuerdos que reconozcan una comisión por compras referidas. Para revisarlos necesitamos conocer la atribución, las regiones admitidas y las condiciones del programa.</p><h3>Patrocinios identificados</h3><p>Estudiamos campañas con fechas y mercados definidos. Los espacios comerciales deben distinguirse de la comparación de precios.</p><a class="quiet" href="#/metodo">Ver criterios de comparación</a></section>'+
    '<form id="proposal" class="panel stack"><h2>Prepara una propuesta</h2><label>Nombre de la tienda<input name="store" required maxlength="100" autocomplete="organization"></label>'+select('type','Tipo de propuesta',[['Catálogo','Integración de catálogo'],['Afiliación','Programa de afiliación'],['Patrocinio','Patrocinio']],'Catálogo')+'<label>Mercados, catálogo y condiciones<textarea name="message" rows="5" maxlength="1800" required placeholder="Indica los países, tu web y cómo se consultan los precios."></textarea></label><button class="primary">Preparar correo</button><p class="form-note">Podrás revisar el mensaje en tu aplicación de correo antes de enviarlo.</p><div id="proposal-result" aria-live="polite"></div></form></div></div>'
}
function privacyPage() {
  return '<div class="wrap narrow">'+pageHead('Tus datos','Privacidad','Puedes comparar precios como invitado y controlar lo que GameScout recuerda en este dispositivo.')+
    '<div class="article"><section><h2>Lo que se guarda aquí</h2><p>El alias, el mercado seleccionado y los precios objetivo se guardan en el almacenamiento local del navegador. Las alertas se consultan en este dispositivo.</p><details><summary>Borrar mis datos de GameScout</summary><p>Se eliminarán de este navegador tu alias, tus alertas y tu mercado preferido.</p><button class="secondary" type="button" data-clear-local>Confirmar y borrar mis datos</button></details></section>'+
    '<section><h2>Servicios externos</h2><p>GitHub Pages sirve el sitio y algunas portadas se cargan desde GOG. Al abrir ofertas intervienen la tienda y, en algunos enlaces, CheapShark. Esos servicios pueden recibir datos técnicos de conexión, como tu dirección IP.</p></section>'+
    '<section><h2>Mensajes al equipo</h2><p>El formulario para tiendas prepara un borrador en tu dispositivo. El equipo recibe los datos que decidas enviar por correo o WhatsApp.</p><a class="quiet" href="#/contacto">Ver canales de contacto</a></section></div></div>'
}
function infoPage(contact) {
  if(contact) return '<div class="wrap narrow">'+pageHead('Estud-IA','Contacto','Para revisar un precio, indícanos el juego, el país, la tienda y la diferencia que encontraste.')+'<section class="panel stack"><h2>Escribe al equipo</h2><a class="quiet" href="mailto:'+contactEmail+'">'+contactEmail+'</a><a class="secondary" target="_blank" rel="noopener noreferrer" href="https://wa.me/573057654678">Abrir WhatsApp</a></section><section class="panel stack"><h2>Consultas comerciales</h2><p>Para integrar un catálogo o proponer una colaboración, prepara los datos de tu tienda.</p><a class="quiet" href="#/tiendas">Ir a propuestas para tiendas</a></section></div>'
  const faq=[['¿Cómo se comparan los juegos?','Elige un mercado y abre una ficha. Las tiendas se ordenan por precio para una misma edición de PC.'],['¿Qué precio voy a pagar?','Cada ficha muestra el importe regional de la última consulta. Comprueba la disponibilidad, los impuestos y el total en la tienda antes de comprar.'],['¿Cómo funcionan las alertas?','Cada objetivo tiene un juego, una moneda y un mercado. Abre Mis alertas para ver si el último precio alcanza tu objetivo.'],['¿Dónde están mis datos?','El alias, la región preferida y las alertas se guardan en este navegador.']]
  return '<div class="wrap narrow">'+pageHead('AYUDA','Preguntas frecuentes')+'<div class="panel">'+faq.map(([q,a])=>'<details><summary>'+q+'</summary><p>'+a+'</p></details>').join('')+'</div><p><a class="quiet" href="#/panel">Fuentes y precios</a></p></div>'
}
function render(focus=false,persistRouteMarket=true) {
  const {page,id,params}=route(),g=page==='juego'?byId(id):null
  if(!['catalogo','ofertas','juego'].includes(page)) lastListing='#/catalogo'
  if((g || page==='catalogo' || page==='ofertas') && validMarket(params.get('mercado')) && state.market!==params.get('mercado')) {
    state.market=params.get('mercado')
    assistantQuery=''
    if(persistRouteMarket) save()
  }
  const views={inicio:home,catalogo:()=>catalog(false,params),ofertas:()=>catalog(true,params),alertas:alertsPage,perfil:profilePage,asistente:assistantPage,panel:panelPage,ayuda:()=>infoPage(false),contacto:()=>infoPage(true),nosotros:aboutPage,metodo:methodPage,tiendas:tradePage,privacidad:privacyPage}
  header(page)
  main.innerHTML=g?gamePage(g,params.get('tienda')):Object.prototype.hasOwnProperty.call(views,page)?views[page]():'<div class="wrap">'+empty('Ficha no disponible','Busca otro título en el catálogo oficial.')+'</div>'
  document.title=(g?.title || paths[page] || 'Ficha no disponible')+' · GameScout'
  if(['catalogo','ofertas'].includes(page)) refreshResults()
  if(page==='asistente' && assistantQuery) answer(assistantQuery)
  if(focus) {main.focus({preventScroll:true});window.scrollTo(0,0)}
}
document.addEventListener('submit',e=>{
  e.preventDefault()
  const f=e.target,data=new FormData(f)
  if(f.id==='home-search') location.hash='/catalogo?'+new URLSearchParams({q:data.get('q').trim(),mercado:state.market})
  if(f.id==='filters') refreshResults(true)
  if(f.id==='target-form') {
    state.alerts=state.alerts.filter(a=>a.id!==f.dataset.id || a.market!==state.market)
    state.alerts.push({id:f.dataset.id,market:state.market,target:Number(data.get('target'))})
    save('Alerta guardada');location.hash='/alertas'
  }
  if(f.id==='proposal') {
    const store=String(data.get('store')).trim(), message=String(data.get('message')).trim()
    if(!store || !message) {notice('Completa el nombre de la tienda y la propuesta.');return}
    const subject='GameScout · '+data.get('type')+' · '+store
    const body=['Hola, equipo de GameScout.', '', 'Escribo en nombre de '+store+'.',message].join('\n')
    const link=document.createElement('a')
    link.className='secondary'
    link.href='mailto:'+contactEmail+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)
    link.textContent='Abrir borrador en mi correo'
    const result=document.querySelector('#proposal-result')
    const draft=document.createElement('details')
    const summary=document.createElement('summary')
    summary.textContent='Ver el texto para enviarlo por otro medio'
    const text=document.createElement('textarea')
    text.readOnly=true
    text.rows=6
    text.setAttribute('aria-label','Texto de la propuesta')
    text.value='Para: '+contactEmail+'\nAsunto: '+subject+'\n\n'+body
    draft.append(summary,text)
    result.replaceChildren(link,draft)
    link.focus()
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
document.addEventListener('input',e=>{
  if(e.target.closest('#filters')) refreshResults(true)
  if(e.target.closest('#proposal')) document.querySelector('#proposal-result').replaceChildren()
  if(e.target.closest('#simulator')) document.querySelector('#sim-result').textContent=''
})
document.addEventListener('reset',e=>{
  if(e.target.id!=='filters')return
  e.preventDefault()
  for(const input of e.target.querySelectorAll('input,select')) input.value=input.name==='orden'?(route().page==='ofertas'?'descuento':'nombre'):''
  refreshResults(true)
})
document.addEventListener('change',e=>{
  if(e.target.id!=='market' || !validMarket(e.target.value))return
  state.market=e.target.value;assistantQuery='';save()
  const {page,id,params}=route()
  if(page==='juego' && byId(id)) history.replaceState(null,'',detail(byId(id)))
  if(page==='catalogo' || page==='ofertas') {
    params.set('mercado',state.market)
    params.delete('pagina')
    if(params.has('tienda') && !games.some(g=>offers(g).some(o=>o.store===params.get('tienda')))) params.delete('tienda')
    history.replaceState(null,'','#/'+page+'?'+params)
  }
  render()
  document.querySelector('#market').focus({preventScroll:true})
})
document.addEventListener('click',e=>{
  const b=e.target.closest('button')
  if(!b)return
  if(b.hasAttribute('data-slide')) {const n=featured().length;slide=(slide+Number(b.dataset.slide)+n)%n;document.querySelector('#feature').innerHTML=hero();document.querySelector('[data-slide="'+b.dataset.slide+'"]').focus({preventScroll:true})}
  if(b.hasAttribute('data-remove')){state.alerts=state.alerts.filter(a=>a.id!==b.dataset.remove || a.market!==b.dataset.market);save('Alerta eliminada');render()}
  if(b.hasAttribute('data-signout')){state.name='';save('Perfil de invitado activo');render()}
  if(b.hasAttribute('data-clear-local')){
    try {localStorage.removeItem(key);localStorage.removeItem('gamescout:demo:v1');state=readState();render();notice('Se han borrado tus datos de GameScout.')}
    catch {notice('Tu navegador impidió borrar los datos.')}
  }
  if(b.hasAttribute('data-query')){assistantQuery=b.dataset.query;document.querySelector('#assistant input').value=assistantQuery;answer(assistantQuery)}
})
document.addEventListener('error',e=>{
  if(e.target.tagName==='IMG') {e.target.hidden=true;e.target.parentElement.classList.add('missing-cover')}
},true)
document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();main.focus()})
window.addEventListener('hashchange',()=>render(true))
window.addEventListener('storage',e=>{if(e.key===key || e.key===null){state=readState();render(false,false)}})
render()
