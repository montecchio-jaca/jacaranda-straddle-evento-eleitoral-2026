import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://montecchio-jaca.github.io/jacaranda-straddle-evento-eleitoral-2026/';
const OUT='artifacts/e2e';
await fs.mkdir(OUT,{recursive:true});

function assert(cond,msg){if(!cond)throw new Error('ASSERT: '+msg)}
function near(a,b,tol=.02){return Math.abs(Number(a)-Number(b))<=tol}
function jpegDimensions(buf){
  if(buf[0]!==0xFF||buf[1]!==0xD8)throw new Error('Arquivo baixado não é JPEG');
  let i=2;
  while(i<buf.length){
    if(buf[i]!==0xFF){i++;continue}
    while(buf[i]===0xFF)i++;
    const marker=buf[i++];
    if(marker===0xD8||marker===0xD9)continue;
    const len=buf.readUInt16BE(i);i+=2;
    if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)){
      return {height:buf.readUInt16BE(i+1),width:buf.readUInt16BE(i+3)};
    }
    i+=len-2;
  }
  throw new Error('Dimensões JPEG não encontradas');
}
async function waitReady(page){
  await page.waitForSelector('#strategySelect option[value="long_call"]',{timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('#assetSelect option').length>10,{timeout:30000});
  await page.waitForFunction(()=>Number(document.querySelector('#spotInput')?.value)>0,{timeout:30000});
}
async function selectStrategy(page,id,count,hasStock=false){
  await page.selectOption('#strategySelect',id);
  await page.waitForFunction(n=>document.querySelectorAll('.leg-card').length===n,count);
  const got=await page.locator('.leg-card').count();
  assert(got===count,id+': esperado '+count+' pernas, obtido '+got);
  const stock=await page.locator('#stockLeg').evaluate(el=>el.classList.contains('show'));
  assert(stock===hasStock,id+': perna no ativo divergente');
  const result=await page.evaluate(()=>{
    updateAll();
    const m=model(),r=analyzeRisk(m);
    drawChart(m,r);
    return {spot:m.S,legs:state.legs.length,stockQty:m.stockQty,range:chartRange(m,r)};
  });
  assert(result.legs===count,id+': model() não preservou contagem de pernas');
}
async function fillLeg(page,i,values){
  const card=page.locator('.leg-card').nth(i);
  if(values.strike!=null)await card.locator('[data-f="strike"]').fill(String(values.strike));
  if(values.code!=null)await card.locator('[data-f="code"]').fill(values.code);
  if(values.price!=null)await card.locator('[data-f="price"]').fill(String(values.price));
}
async function canvasStats(page,id){
  return page.evaluate((id)=>{
    const c=document.getElementById(id),ctx=c.getContext('2d');
    const w=c.width,h=c.height,data=ctx.getImageData(0,0,w,h).data;
    let nonTransparent=0,changes=0,prev=null;
    const step=Math.max(4,Math.floor((w*h)/12000))*4;
    for(let i=0;i<data.length;i+=step){
      const sig=data[i]+','+data[i+1]+','+data[i+2]+','+data[i+3];
      if(data[i+3]>0)nonTransparent++;
      if(prev!==null&&sig!==prev)changes++;
      prev=sig;
    }
    return {w,h,nonTransparent,changes};
  },id);
}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:1440,height:1000},
  acceptDownloads:true,
  locale:'pt-BR'
});
const page=await context.newPage();
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(String(e)));
page.on('console',msg=>{if(msg.type()==='error')console.log('BROWSER_CONSOLE_ERROR',msg.text())});

let quotePrice=50.00;
await page.route('**/data/quotes.json*',async route=>{
  const body={
    generated_at_utc:'2026-10-04T20:00:00Z',
    universe_count:368,
    quotes:{
      PETR4:{
        symbol:'PETR4',price:quotePrice,provider:'E2E fixed quote',
        market_time_utc:'2026-10-04T19:55:00Z'
      }
    },
    errors:{}
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});

console.log('E2E TARGET',BASE);
await page.goto(BASE+'?e2e='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
await waitReady(page);
await page.evaluate(()=>localStorage.removeItem('jacaranda.options.comparator.v1'));

// 1. Book <-> Spot 100% e persistência.
await selectStrategy(page,'long_call',1,false);
await page.locator('#spotInput').fill('50');
await page.selectOption('#pricingMode','book');
assert(await page.locator('#pricingMode').inputValue()==='book','modo Book não selecionou');
await page.selectOption('#pricingMode','spot_pct');
assert(await page.locator('#pricingMode').inputValue()==='spot_pct','modo Spot 100 não selecionou');
assert((await page.locator('#pricingModeNote').innerText()).includes('Spot = 100%'),'nota Spot 100 ausente');
await page.reload({waitUntil:'domcontentloaded'});
await waitReady(page);
assert(await page.locator('#pricingMode').inputValue()==='spot_pct','preferência Spot 100 não persistiu após reload');
console.log('PASS toggle Book <-> Spot 100 + persistência');

// 2. Conversão bidirecional strike/prêmio.
await selectStrategy(page,'long_call',1,false);
await page.locator('#spotInput').fill('50');
await page.selectOption('#pricingMode','book');
let leg=page.locator('.leg-card').first();
await leg.locator('[data-f="strike"]').fill('52.50');
assert(near(await leg.locator('[data-f="strikePct"]').inputValue(),105,0.01),'Strike R$ -> % incorreto');
await leg.locator('[data-f="price"]').fill('1.25');
assert(near(await leg.locator('[data-f="pricePct"]').inputValue(),2.5,0.01),'Prêmio R$ -> % incorreto');
await page.selectOption('#pricingMode','spot_pct');
await leg.locator('[data-f="strikePct"]').fill('110');
await leg.locator('[data-f="strikePct"]').dispatchEvent('change');
assert(near(await leg.locator('[data-f="strike"]').inputValue(),55,0.01),'Strike % -> R$ incorreto');
await leg.locator('[data-f="pricePct"]').fill('3');
await leg.locator('[data-f="pricePct"]').dispatchEvent('change');
assert(near(await leg.locator('[data-f="price"]').inputValue(),1.5,0.01),'Prêmio % -> R$ incorreto');
console.log('PASS edição bidirecional R$ <-> %');

// 3. Refresh do spot preserva série/código/prêmio.
await leg.locator('[data-f="strike"]').fill('52');
await leg.locator('[data-f="code"]').fill('PETRTEST');
await leg.locator('[data-f="price"]').fill('1.10');
quotePrice=51.25;
await page.click('#refreshQuote');
await page.waitForFunction(()=>Math.abs(Number(document.querySelector('#spotInput').value)-51.25)<.001);
leg=page.locator('.leg-card').first();
assert(near(await leg.locator('[data-f="strike"]').inputValue(),52,0.001),'refresh alterou strike real');
assert((await leg.locator('[data-f="code"]').inputValue())==='PETRTEST','refresh perdeu código da série');
assert(near(await leg.locator('[data-f="price"]').inputValue(),1.10,0.001),'refresh alterou prêmio');
assert(near(await leg.locator('[data-f="strikePct"]').inputValue(),52/51.25*100,0.02),'refresh não recalculou strike %');
console.log('PASS atualização do spot preservando série/código/prêmio');

// 4. Estruturas 1-4 pernas e com ativo.
await selectStrategy(page,'long_call',1,false);
await selectStrategy(page,'bull_call_spread',2,false);
await selectStrategy(page,'call_butterfly',3,false);
await selectStrategy(page,'iron_condor',4,false);
await selectStrategy(page,'covered_call',1,true);
console.log('PASS estruturas 1,2,3,4 pernas + estrutura com ativo');

// Exercita render/cálculo/factsheet para as seis estruturas definidas no aceite.
const acceptance=[
  ['long_call',1,false],
  ['short_put',1,false],
  ['covered_call',1,true],
  ['bull_call_spread',2,false],
  ['call_butterfly',3,false],
  ['long_strangle',2,false]
];
for(const entry of acceptance){
  const id=entry[0],count=entry[1],stock=entry[2];
  await selectStrategy(page,id,count,stock);
  await page.locator('#spotInput').fill('50');
  for(let i=0;i<count;i++){
    const c=page.locator('.leg-card').nth(i);
    const side=await c.locator('[data-f="side"]').inputValue();
    const type=await c.locator('[data-f="type"]').inputValue();
    const strike=Number(await c.locator('[data-f="strike"]').inputValue());
    await c.locator('[data-f="price"]').fill(String((0.65+i*.20).toFixed(2)));
    await c.locator('[data-f="code"]').fill(id.toUpperCase().slice(0,6)+(i+1));
    assert(strike>0,id+': strike sugerido inválido');
    assert(['buy','sell'].includes(side)&&['call','put'].includes(type),id+': perna inválida');
  }
  const r=await page.evaluate(()=>{
    updateAll();drawFactsheet();
    const m=model(),risk=analyzeRisk(m),pm=buildPresentationModel();
    return {
      pricingComplete:m.pricingComplete,
      factsheet:[document.querySelector('#factsheetCanvas').width,document.querySelector('#factsheetCanvas').height],
      low:pm.range.lowPct,high:pm.range.highPct,
      rows:pm.tableRows.length
    };
  });
  assert(r.pricingComplete,id+': precificação não ficou completa');
  assert(r.factsheet[0]===1920&&r.factsheet[1]===1080,id+': factsheet não está 1920x1080');
  assert(r.low<=-20&&r.high>=20,id+': range de apresentação insuficiente');
  assert(r.rows>=5,id+': matriz nominal insuficiente');
}
console.log('PASS render/calculo/factsheet em Call, Put, Covered Call, Trava, Borboleta e Strangle');

// 5. Envio ao Comparador.
await selectStrategy(page,'long_call',1,false);
await page.locator('#spotInput').fill('50');
await page.selectOption('#pricingMode','spot_pct');
await fillLeg(page,0,{strike:52.5,price:1.25,code:'PETRTEST'});
page.once('dialog',d=>d.dismiss());
await page.click('#addComparator');
const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('jacaranda.options.comparator.v1')||'[]'));
assert(stored.length===1,'estrutura não foi persistida no Comparador');
assert(stored[0].strategyId==='long_call'&&stored[0].asset==='PETR4','payload do Comparador divergente');
await page.goto(BASE+'comparador.html?e2e='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForSelector('.card',{timeout:20000});
const compText=await page.locator('.card').first().innerText();
assert(compText.includes('Compra de Call')&&compText.includes('PETR4'),'Comparador não exibiu estrutura enviada');
await page.screenshot({path:path.join(OUT,'comparador.png'),fullPage:true});
console.log('PASS envio e leitura no Comparador');

// 6. Tela x gráfico x matriz x Factsheet JPG.
await page.goto(BASE+'?e2e=final-'+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
await waitReady(page);
await selectStrategy(page,'long_call',1,false);
await page.locator('#spotInput').fill('50');
await page.selectOption('#pricingMode','spot_pct');
await fillLeg(page,0,{strike:52.5,price:1.25,code:'PETRTEST'});
await page.locator('#moveRange').evaluate((el)=>{el.value='20';el.dispatchEvent(new Event('input',{bubbles:true}))});
await page.waitForTimeout(100);

const compare=await page.evaluate(()=>{
  updateAll();
  const m=model(),risk=analyzeRisk(m),screen=chartSeries(m,risk),pm=buildPresentationModel();
  const tableRows=[...document.querySelectorAll('#scenarioTable tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent.trim()));
  const zero=tableRows.find(r=>r[0].startsWith('100'));
  const nearest=(arr,x)=>arr.reduce((best,v,i)=>Math.abs(v-x)<Math.abs(arr[best]-x)?i:best,0);
  const i0=nearest(screen.xs,0),j0=nearest(pm.xs,0);
  return {
    screenExpiry0:screen.expiry[i0],
    presentationExpiry0:pm.expiry[j0],
    pm,
    zero,
    screenTexts:{
      simSpot:document.querySelector('#simSpot').textContent.trim(),
      initialFlow:document.querySelector('#initialFlow').textContent.trim(),
      maxLoss:document.querySelector('#maxLoss').textContent.trim(),
      maxGain:document.querySelector('#maxGain').textContent.trim(),
      breakevens:document.querySelector('#breakevens').textContent.trim()
    }
  };
});
assert(near(compare.screenExpiry0,compare.presentationExpiry0,2),'gráfico tela e gráfico de apresentação divergem no spot');
assert(compare.pm.presentationMode==='nominal','presentation model não está nominal');
assert(compare.pm.range.highPct>=30,'Compra de Call ilimitada não abriu range acima de 15%');
assert(compare.zero&&compare.zero[1].includes('R$ 50,00'),'matriz da tela não preservou spot nominal no nível 100%');

await page.evaluate(()=>{
  window.__factText=[];
  const original=window.cText;
  window.cText=function(ctx,text,...rest){window.__factText.push(String(text));return original(ctx,text,...rest)};
  drawFactsheet();
});
const factsheetText=await page.evaluate(()=>window.__factText);
assert(factsheetText.includes('ATIVO (R$)'),'Factsheet não usa tabela nominal');
assert(factsheetText.includes('PAYOFF DA ESTRUTURA · P/L TOTAL (R$)'),'Factsheet não usa gráfico nominal');
assert(factsheetText.some(t=>t.includes('apresentação nominal em R$')),'Factsheet não sinaliza apresentação nominal');
assert(!factsheetText.includes('SPOT 100%'),'Factsheet cliente herdou indevidamente linguagem Spot 100%');

const screenCanvas=await canvasStats(page,'chart');
const factCanvas=await canvasStats(page,'factsheetCanvas');
assert(screenCanvas.changes>20,'gráfico da tela aparenta vazio');
assert(factCanvas.w===1920&&factCanvas.h===1080&&factCanvas.changes>20,'gráfico/factsheet aparenta vazio ou resolução incorreta');

await page.screenshot({path:path.join(OUT,'estrategias.png'),fullPage:true});
await page.click('#generateJpg');
await page.screenshot({path:path.join(OUT,'factsheet-preview.png'),fullPage:false});
const downloadPromise=page.waitForEvent('download',{timeout:15000});
await page.click('#downloadJpg');
const download=await downloadPromise;
const jpgPath=path.join(OUT,'factsheet.jpg');
await download.saveAs(jpgPath);
const buf=await fs.readFile(jpgPath),dim=jpegDimensions(buf);
assert(dim.width===1920&&dim.height===1080,'JPG baixado '+dim.width+'x'+dim.height+', esperado 1920x1080');
assert(buf.length>50000,'JPG muito pequeno ('+buf.length+' bytes)');
console.log('PASS tela x gráfico x matriz x JPG nominal 1920x1080');
console.log('FACTSHEET_RANGE',JSON.stringify(compare.pm.range));
console.log('SCREEN_KPIS',JSON.stringify(compare.screenTexts));
console.log('JPEG',JSON.stringify({bytes:buf.length,width:dim.width,height:dim.height}));

if(pageErrors.length)throw new Error('Erros JavaScript no navegador: '+pageErrors.join(' | '));
await browser.close();
console.log('E2E ACCEPTANCE PASS');
