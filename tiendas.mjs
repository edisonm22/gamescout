import { setTimeout as pause } from 'node:timers/promises'

const split = (items, size) => Array.from({length: Math.ceil(items.length / size)}, (_, i) => items.slice(i*size,(i+1)*size))
const normalize = text => text.normalize('NFD').toLowerCase().replace(/[™®©]|\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'')
const decode = text => text.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&')
const locales = {CO:'es-CO',US:'en-US',ES:'es-ES'}
const currencies = {CO:'COP',US:'USD',ES:'EUR'}
const cheap = 'https://www.cheapshark.com'

async function usStores(games,json) {
  const stores = await json(cheap+'/api/1.0/stores')
  const names = new Map(stores.filter(s=>s.isActive && !['1','7'].includes(s.storeID)).map(s=>[s.storeID,s.storeName==='GreenManGaming'?'Green Man Gaming':s.storeName]))
  const wanted = new Map(games.filter(g=>g.steam).map(g=>[g.steam,g]))
  const remember = (row,title) => {
    const g=wanted.get(row.steamAppID)
    if(g && normalize(g.title)===normalize(title)) g.cheapId=row.gameID
  }
  if (games.filter(g=>g.cheapId).length<200) {
    for (let page=0;page<35;page++) {
      const rows = await json(cheap+'/api/1.0/deals',{storeID:7,sortBy:'Metacritic',pageSize:60,pageNumber:page})
      rows.forEach(r=>remember(r,r.title))
      if(rows.length<60) break
      await pause(450)
    }
  }
  for(const g of wanted.values()) {
    if(g.cheapId) continue
    const rows=await json(cheap+'/api/1.0/games',{steamAppID:g.steam})
    rows.forEach(r=>remember(r,r.external))
    await pause(450)
  }
  const result=[]
  for(const chunk of split(games.filter(g=>g.cheapId),25)) {
    const lookup=await json(cheap+'/api/1.0/games',{ids:chunk.map(g=>g.cheapId).join(',')})
    for(const g of chunk) {
      const entry=lookup[g.cheapId]
      if(!entry || String(entry.info.steamAppID)!==g.steam || normalize(entry.info.title)!==normalize(g.title)) continue
      for(const deal of entry.deals) {
        const store=names.get(deal.storeID)
        if(!store || !deal.dealID || !/^\d+(\.\d+)?$/.test(deal.price) || !/^\d+(\.\d+)?$/.test(deal.retailPrice)) continue
        const link=new URL('/redirect',cheap)
        link.searchParams.set('dealID',decodeURIComponent(deal.dealID))
        result.push([g,{store,market:'US',currency:'USD',amount:Number(deal.price),regular:Number(deal.retailPrice),url:link.href,source:'CheapShark'}])
      }
    }
    await pause(450)
  }
  return result
}

async function nuuvem(games) {
  const result=[], titles=new Map(games.map(g=>[normalize(g.title),g]))
  const base='https://www.nuuvem.com/co-en/catalog/platforms/pc/sort/bestselling/sort-mode/desc'
  for(let page=1;page<=48;page++) {
    const res=await fetch(base+(page>1?'/page/'+page:''),{signal:AbortSignal.timeout(20000)})
    if(res.status===403 || res.status===429) { console.log('Nuuvem detuvo la paginación en la página', page); break }
    if(!res.ok) throw new Error('Nuuvem HTTP '+res.status)
    const html=await res.text()
    if(!html.includes('data-currency-code="COP"')) throw new Error('Nuuvem no confirmó el mercado colombiano')
    const cards=html.matchAll(/data-ga-events-product-data-param="([^"]+)" href="([^"]+)">\s*<article class="product__available product__purchasable[^>]*>([\s\S]*?)<\/article>/g)
    for(const [,encoded,url,body] of cards) {
      const product=JSON.parse(decode(encoded)), g=titles.get(normalize(product.name))
      const fields=body.match(/data-price="([^"]+)" data-base-price="([^"]+)"/)
      if(!g || !fields || product.currency!=='COP' || !url.startsWith('https://www.nuuvem.com/co-en/item/')) continue
      const amount=JSON.parse(decode(fields[1])).v/100, regular=JSON.parse(decode(fields[2])).v/100
      if(Math.abs(product.price-amount)>.01) continue
      result.push([g,{store:'Nuuvem',market:'CO',currency:'COP',amount,regular,url}])
    }
    if(!html.includes('rel="next"')) break
    await pause(350)
  }
  return result
}

async function microsoft(games,json) {
  const products='https://displaycatalog.mp.microsoft.com/v7.0/products'
  const pcGames=await json('https://catalog.gamepass.com/sigls/v2',{id:'fdd9e2a7-0fee-49f6-ad69-4354098401ff',language:'en-US',market:'CO'})
  const ids=pcGames.map(row=>row.id).filter(Boolean)
  const titles=new Map(games.map(g=>[normalize(g.title),g]))
  const matched=new Map(), result=[]
  const match=p=>titles.get(normalize(p.LocalizedProperties[0].ProductTitle.replace(/\s*\((?:Windows(?: PC)?|PC)\)\s*$/i,'')))
  for(const chunk of split(ids,25)) {
    const batch=await json(products,{bigIds:chunk.join(','),market:'CO',languages:'en-US',fieldsTemplate:'Browse'})
    for(const p of batch.Products) {
      const g=match(p)
      if(g && g.id!=='minecraft') matched.set(p.ProductId,g)
    }
  }
  const now=Date.now()
  for(const market of Object.keys(currencies)) {
    for(const chunk of split([...matched.keys()],15)) {
      const batch=await json(products,{bigIds:chunk.join(','),market,languages:'en-US'})
      for(const p of batch.Products) {
        const g=matched.get(p.ProductId)
        if(g!==match(p)) continue
        for(const sku of p.DisplaySkuAvailabilities) {
          if(sku.Sku.SkuType!=='full' || sku.Sku.Properties?.IsTrial) continue
          const sale=sku.Availabilities.find(a=>{
            const c=a.Conditions, price=a.OrderManagementData?.Price
            return a.Actions.includes('Purchase') && a.Actions.includes('Fulfill') && a.Markets?.includes(market) &&
              c.ClientConditions?.AllowedPlatforms?.some(x=>x.PlatformName==='Windows.Desktop') &&
              Date.parse(c.StartDate)<=now && Date.parse(c.EndDate)>now && !c.SkuEligibilityConditions &&
              price?.CurrencyCode===currencies[market] && price.ListPrice>0
          })
          if(!sale) continue
          const pinfo=sale.OrderManagementData.Price
          result.push([g,{store:'Microsoft Store',market,currency:pinfo.CurrencyCode,amount:pinfo.ListPrice,regular:pinfo.MSRP,url:'https://www.xbox.com/'+locales[market]+'/games/store/-/'+p.ProductId}])
          break
        }
      }
    }
  }
  return result
}

export async function addStores(games,json) {
  const batches=await Promise.allSettled([usStores(games,json),nuuvem(games),microsoft(games,json)])
  for(const [index,source] of batches.entries()) {
    if(source.status==='rejected') throw new Error(['CheapShark','Nuuvem','Microsoft Store'][index]+': '+source.reason.message)
    const batch=source.value
    console.log(['CheapShark','Nuuvem','Microsoft Store'][index],batch.length,'cotizaciones')
    for(const [g,offer] of batch) {
      if(!Number.isFinite(offer.amount) || offer.amount<0 || !Number.isFinite(offer.regular) || offer.regular<offer.amount) continue
      const i=g.offers.findIndex(o=>o.market===offer.market && o.store===offer.store)
      if(i<0) g.offers.push(offer)
      else if(g.offers[i].amount>offer.amount) g.offers[i]=offer
    }
  }
  if(new Set(games.flatMap(g=>g.offers.filter(o=>o.source==='CheapShark').map(o=>o.store))).size<4) throw new Error('Cobertura de tiendas insuficiente')
}
