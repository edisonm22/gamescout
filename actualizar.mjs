// Ejecutar con Node 22 o posterior. Solo reemplaza el catálogo si pasa las comprobaciones.
import { readFile, rename, writeFile } from 'node:fs/promises'
import { setTimeout as pause } from 'node:timers/promises'
import { addStores } from './tiendas.mjs'

const output = new URL('./catalogo.js', import.meta.url)
const markets = { CO: 'COP', US: 'USD', ES: 'EUR' }
const stamp = new Date().toISOString()
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(stamp))
const groups = (list, n) => Array.from({length: Math.ceil(list.length / n)}, (_, i) => list.slice(i*n, (i+1)*n))
async function json(base, params = {}) {
  const url = new URL(base)
  url.search = new URLSearchParams(params)
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {signal: AbortSignal.timeout(20000), headers: {'User-Agent':'GameScout/2.0 (https://github.com/edisonm22/gamescout)'}})
      if (!res.ok) throw new Error(url.hostname + ' HTTP ' + res.status)
      return await res.json()
    } catch (error) {
      if (attempt === 3) throw error
      await pause(1200 * 2 ** attempt)
    }
  }
}
const clean = s => s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replace(/&#0?39;|&apos;/g, "'").replaceAll('&nbsp;', ' ')
const identity = s => clean(s).normalize('NFD').replace(/\p{M}|[™®©]/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')
const genres = {'Role-playing':'Rol',Adventure:'Aventura',Action:'Acción',Strategy:'Estrategia',Simulation:'Simulación',Shooter:'Disparos',Puzzle:'Puzles',Racing:'Carreras',Sports:'Deportes',Horror:'Terror',Platformer:'Plataformas',Fighting:'Lucha',Arcade:'Arcade',Indie:'Independiente'}

async function discover() {
  const gog = new Map(), candidates = new Map()
  for (let page=0; page<55; page++) {
    const [products, ids] = await Promise.all([
      json('https://catalog.gog.com/v1/catalog',{productType:'in:game',countryCode:'US',currencyCode:'USD',locale:'en-US',order:'desc:bestselling',page:page+1,limit:48}),
      json('https://www.cheapshark.com/api/1.0/deals',{storeID:7,sortBy:'Metacritic',pageSize:60,pageNumber:page})
    ])
    for (const g of products.products) {
      if (g.productType==='game' && g.operatingSystems.includes('windows') && g.price) gog.set(identity(g.title),g)
    }
    // CheapShark sugiere IDs. Los nombres, el tipo de producto y los precios se comprueban en las tiendas.
    for (const entry of ids) if (entry.steamAppID) candidates.set(identity(entry.title),String(entry.steamAppID))
    const joined = [...gog].filter(([key])=>candidates.has(key))
    if (page%5===0) console.log('Páginas',page+1,'candidatos',joined.length)
    if (joined.length<475 && page<54) { await pause(650); continue }
    const result = new Map()
    for (const chunk of groups(joined,40)) {
      const ids = chunk.map(([k])=>({appid:Number(candidates.get(k))}))
      const details = await json('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/',{input_json:JSON.stringify({ids,context:{language:'english',country_code:'US'},data_request:{include_release:true,include_basic_info:true}})})
      const lookup = new Map(details.response.store_items.map(i=>[String(i.id),i]))
      for (const [k,g] of chunk) {
        const id=candidates.get(k), item=lookup.get(id)
        if (!item?.visible || item.type!==0 || identity(item.name)!==k || /soundtrack|season pass|artbook|\bDLC\b/i.test(g.title)) continue
        const year=Number(g.releaseDate.slice(0,4))
        const steamYear=new Date((item.release?.original_release_date || item.release?.steam_release_date || 0)*1000).getUTCFullYear()
        if (Math.abs(year-steamYear)>1) continue
        if (!g.storeLink.startsWith('https://www.gog.com/') || !g.coverHorizontal?.startsWith('https://images.gog-statics.com/')) continue
        result.set(id,{id:'steam-'+id,steam:id,gog:g.id,title:g.title,genre:genres[g.genres[0]?.name] || g.genres[0]?.name || 'PC',year,developer:item.basic_info?.developers?.[0]?.name || '',art:g.coverHorizontal,gogUrl:g.storeLink})
      }
    }
    return [...result.values()]
  }
}
const sourceGames = [
  ['red-dead-redemption-2','1174180','Aventura','west'],
  ['spider-man-2','2651280','Acción','spider'],['among-us','945360','Deducción social','among'],
  ['poppy-playtime','1721470','Terror','poppy'],['counter-strike','730','Táctico','counter'],
  ['call-of-duty','2519060','Acción','cod']
]
async function main() {
  let items = []
  try {
    const previous = await readFile(output,'utf8')
    items = JSON.parse(previous.slice('export const snapshot = '.length)).games.filter(g=>g.gog)
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (items.length < 220 || process.argv.includes('--descubrir')) {
    const found = await discover()
    items = [...new Map([...items,...found].map(g=>[g.steam,g])).values()]
  }
  for (const [id, steam, genre, art] of sourceGames) {
    const details = (await json('https://store.steampowered.com/api/appdetails',{appids:steam,cc:'co',l:'spanish'}))[steam]
    if (!details.success || details.data.type !== 'game') continue
    const g = items.find(g=>g.steam===steam) || {}
    if (!g.steam) items.push(g)
    Object.assign(g,{id,steam,title:details.data.name,genre,art:'./'+art+'.jpg',free:details.data.is_free})
  }
  const mc = {id:'minecraft',title:'Minecraft: Java & Bedrock Edition for PC',genre:'Construcción',art:'./minecraft.jpg'}
  items.push(mc)
  for (const g of items) g.offers = []
  const trm = await json('https://www.datos.gov.co/resource/32sa-8pi3.json',{'$where':"vigenciadesde <= '"+date+"T00:00:00' AND vigenciahasta >= '"+date+"T00:00:00'",'$limit':1})
  const rate = Number(trm[0]?.valor)
  if (!(rate > 0)) throw new Error('Sin TRM vigente para '+date)
  for (const [market, currency] of Object.entries(markets)) {
    const steamGames = items.filter(g=>g.steam)
    for (const chunk of groups(steamGames,50)) {
      const prices = await json('https://store.steampowered.com/api/appdetails',{appids:chunk.map(g=>g.steam).join(','),cc:market.toLowerCase(),filters:'price_overview'})
      for (const g of chunk) {
        const entry=prices[g.steam], p=entry?.data?.price_overview
        if (!entry?.success || (!p && !g.free) || (p && p.currency!==currency)) continue
        g.offers.push({store:'Steam',market,currency,amount:(p?.final || 0)/100,regular:(p?.initial || p?.final || 0)/100,url:'https://store.steampowered.com/app/'+g.steam+'/?cc='+market.toLowerCase()})
      }
      await pause(180)
    }
    const gogCurrency = market==='CO'?'USD':currency
    for (const chunk of groups(items.filter(g=>g.gog),40)) {
      const data = await json('https://api.gog.com/products/prices',{ids:chunk.map(g=>g.gog).join(','),countryCode:market,currency:gogCurrency})
      const prices = new Map(data._embedded.items.map(i=>[String(i._embedded.product.id),i._embedded.prices.find(p=>p.currency.code===gogCurrency)]))
      for (const g of chunk) {
        const p = prices.get(g.gog)
        if (!p) continue
        const amount = Number(p.finalPrice.split(' ')[0])/100, regular = Number(p.basePrice.split(' ')[0])/100
        g.offers.push({store:'GOG',market,currency:gogCurrency,amount,regular,url:g.gogUrl})
      }
    }
    const x = await json('https://displaycatalog.mp.microsoft.com/v7.0/products',{bigIds:'9NXP44L49SHJ',market,languages:'en-US'})
    const product = x.Products?.find(p=>p.ProductId==='9NXP44L49SHJ')
    const prices = product?.DisplaySkuAvailabilities.flatMap(s=>s.Availabilities).filter(a=>a.Actions?.includes('Purchase') && a.OrderManagementData?.Price?.CurrencyCode===currency)
    const p = prices?.[0]?.OrderManagementData.Price
    if (p) mc.offers.push({store:'Microsoft Store',market,currency,amount:p.ListPrice,regular:p.MSRP,url:'https://www.xbox.com/'+({CO:'es-CO',US:'en-US',ES:'es-ES'}[market])+'/games/store/minecraft-java-bedrock-edition-for-pc/9NXP44L49SHJ'})
    const matched = items.filter(g=>new Set(g.offers.filter(o=>o.market===market).map(o=>o.store)).size>=2)
    console.log(market,matched.length,'juegos con comparación')
    if (new Set(matched.map(g=>identity(g.title))).size < 200) throw new Error('Cobertura insuficiente en '+market)
  }
  await addStores(items,json)
  const games = items.filter(g=>g.offers.length)
  for (const g of games) for (const o of g.offers) {
    if (!Number.isFinite(o.amount) || !Number.isFinite(o.regular) || o.amount<0 || o.regular<o.amount || !/^https:\/\//.test(o.url)) throw new Error('Oferta inválida: '+g.title)
  }
  const data = {checkedAt:stamp,exchange:{usdCop:rate,validFrom:trm[0].vigenciadesde.slice(0,10),validTo:trm[0].vigenciahasta.slice(0,10)},games}
  const temp = new URL('./catalogo.'+process.pid+'.tmp',import.meta.url)
  await writeFile(temp,'export const snapshot = '+JSON.stringify(data)+'\n')
  await rename(temp,output)
  console.log(games.length,'juegos,',games.reduce((n,g)=>n+g.offers.length,0),'precios')
}
await main()
