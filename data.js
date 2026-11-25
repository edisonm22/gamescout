import { snapshot } from './catalogo.js'

const genreNames = {Fantasy:'Fantasía',Modern:'Contemporáneo','Sci-fi':'Ciencia ficción',Historical:'Histórico',FPP:'Primera persona',TPP:'Tercera persona','Turn-based':'Por turnos',Combat:'Combate'}
export const games = snapshot.games.map(g=>({...g,genre:genreNames[g.genre] || g.genre}))
export const updated = new Intl.DateTimeFormat('es-CO', { dateStyle:'long', timeZone:'America/Bogota' }).format(new Date(snapshot.checkedAt))
export const exchange = snapshot.exchange
export const markets = {
  CO:{name:'Colombia',currency:'COP'},
  US:{name:'Estados Unidos',currency:'USD'},
  ES:{name:'España',currency:'EUR'}
}
export const normalize = text => text.toLowerCase().normalize('NFD').replace(/\p{M}|[™®©’']/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const amounts = [0,2].reduce((cache,digits)=>({...cache,[digits]:new Intl.NumberFormat('es-CO',{maximumFractionDigits:digits,minimumFractionDigits:digits})}),{})
export function money(value, currency = 'COP') {
  if (value === 0) return 'Gratis'
  const digits=currency==='COP' && Number.isInteger(value)?0:2
  return amounts[digits].format(value)+' '+currency
}
export const discount = o => o?.regular > 0 ? Math.max(0,Math.round(100*(1-o.price/o.regular))) : 0
const regionalOffers = new WeakMap()
export function offersFor(game, market) {
  if (!regionalOffers.has(game)) regionalOffers.set(game,new Map())
  const cached=regionalOffers.get(game)
  if(cached.has(market)) return cached.get(market)
  const local = markets[market].currency
  const offers=game.offers.filter(o=>o.market===market).map(o=>{
    const equivalent = o.currency !== local
    const convert = v => equivalent ? Math.round(v*exchange.usdCop) : v
    return {...o,platform:'PC',equivalent,originalRegular:o.regular,price:convert(o.amount),regular:convert(o.regular)}
  }).sort((a,b)=>a.price-b.price || a.store.localeCompare(b.store))
  cached.set(market,offers)
  return offers
}
