(function(global){
  'use strict';

  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
  const sideSign=side=>side==='buy'?1:-1;

  function years(a,b){
    if(!a||!b)return 0;
    return Math.max(0,(new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000/365);
  }

  function normCDF(x){
    const a1=.319381530,a2=-.356563782,a3=1.781477937,a4=-1.821255978,a5=1.330274429;
    const L=Math.abs(x),k=1/(1+.2316419*L);
    const w=1-1/Math.sqrt(2*Math.PI)*Math.exp(-L*L/2)*(a1*k+a2*k*k+a3*k**3+a4*k**4+a5*k**5);
    return x<0?1-w:w;
  }

  function bsm(type,S,K,T,r,q,sigma){
    S=n(S);K=n(K);T=n(T);r=n(r);q=n(q);sigma=n(sigma);
    if(!(S>0&&K>0))return 0;
    if(T<=0||sigma<=0)return intrinsic(type,S,K);
    const sq=Math.sqrt(T);
    const d1=(Math.log(S/K)+(r-q+.5*sigma*sigma)*T)/(sigma*sq),d2=d1-sigma*sq;
    return type==='call'
      ? S*Math.exp(-q*T)*normCDF(d1)-K*Math.exp(-r*T)*normCDF(d2)
      : K*Math.exp(-r*T)*normCDF(-d2)-S*Math.exp(-q*T)*normCDF(-d1);
  }

  function intrinsic(type,S,K){
    S=n(S);K=n(K);
    return type==='call'?Math.max(S-K,0):Math.max(K-S,0);
  }

  function impliedVolLeg(type,S,K,T,price,r,q){
    S=n(S);K=n(K);T=n(T);price=n(price);r=n(r);q=n(q);
    if(!(price>0&&S>0&&K>0&&T>0))return 0;
    const intr=intrinsic(type,S,K);
    if(price<intr-1e-8)return 0;
    let lo=.0001,hi=5;
    for(let i=0;i<90;i++){
      const mid=(lo+hi)/2,v=bsm(type,S,K,T,r,q,mid);
      if(v>price)hi=mid;else lo=mid;
    }
    return (lo+hi)/2;
  }

  function normalizeStrategy(raw){
    const s=raw||{};
    return {
      spot:n(s.spot??s.S),
      units:Math.max(1,n(s.units)||1),
      entryCost:Math.max(0,n(s.entryCost)),
      exitCost:Math.max(0,n(s.exitCost)),
      stockQty:n(s.stockQty),
      rate:n(s.rate??s.r),
      dividendYield:n(s.dividendYield??s.q),
      entryDate:s.entryDate||null,
      expiryDate:s.expiryDate||null,
      scenarioDate:s.scenarioDate||null,
      ivFallback:Math.max(.0001,n(s.ivFallback)||.40),
      legs:(s.legs||[]).map(l=>({
        side:l.side==='sell'?'sell':'buy',
        type:l.type==='put'?'put':'call',
        qty:Math.max(1,n(l.qty)||1),
        strike:n(l.strike),
        price:Math.max(0,n(l.price)),
        iv:Math.max(0,n(l.iv))
      }))
    };
  }

  function expiryPnlPerUnit(raw,Sf){
    const s=normalizeStrategy(raw);
    let p=s.stockQty*(n(Sf)-s.spot);
    s.legs.forEach(l=>{
      p+=sideSign(l.side)*(intrinsic(l.type,n(Sf),l.strike)-l.price)*l.qty;
    });
    return p;
  }

  function expiryPnlTotal(raw,Sf){
    const s=normalizeStrategy(raw);
    return expiryPnlPerUnit(s,Sf)*s.units-s.entryCost;
  }

  function highSlope(raw){
    const s=normalizeStrategy(raw);
    let slope=s.stockQty;
    s.legs.forEach(l=>{if(l.type==='call')slope+=sideSign(l.side)*l.qty});
    return slope;
  }

  function analyzeRisk(raw){
    const s=normalizeStrategy(raw);
    if(!(s.spot>0&&s.legs.length))return {maxGain:null,maxLoss:null,bes:[],highSlope:0};
    const ks=s.legs.map(l=>l.strike).filter(v=>v>0).sort((a,b)=>a-b);
    const pts=Array.from(new Set([0,...ks]));
    const last=pts[pts.length-1]||s.spot,slope=highSlope(s);
    const far=Math.max(s.spot*4,last*3,s.spot+100);
    const evalPts=[...pts,far],vals=evalPts.map(x=>expiryPnlTotal(s,x));
    const max=Math.max(...vals),min=Math.min(...vals);
    const bes=[],seg=[...pts,far].sort((a,b)=>a-b);
    for(let i=0;i<seg.length-1;i++){
      const x1=seg[i],x2=seg[i+1],y1=expiryPnlTotal(s,x1),y2=expiryPnlTotal(s,x2);
      if(Math.abs(y1)<1e-7)bes.push(x1);
      if(y1*y2<0){
        const root=x1+(0-y1)*(x2-x1)/(y2-y1);
        if(root>=0)bes.push(root);
      }
    }
    const xL=pts[pts.length-1]||0,yL=expiryPnlTotal(s,xL);
    if(Math.abs(slope)>1e-9){
      const root=xL-yL/(slope*s.units);
      if(root>xL)bes.push(root);
    }
    const dedup=[];
    bes.sort((a,b)=>a-b).forEach(v=>{if(!dedup.length||Math.abs(v-dedup[dedup.length-1])>.01)dedup.push(v)});
    return {
      maxGain:slope>1e-9?Infinity:max,
      maxLoss:slope<-1e-9?-Infinity:min,
      bes:dedup,
      highSlope:slope
    };
  }

  function calibrateLegIVs(raw){
    const s=normalizeStrategy(raw);
    const T=years(s.entryDate,s.expiryDate);
    return s.legs.map(l=>l.iv>0?l.iv:impliedVolLeg(l.type,s.spot,l.strike,T,l.price,s.rate,s.dividendYield));
  }

  function scenarioOptionNetValuePerUnit(raw,Sf,ivRatio){
    const s=normalizeStrategy(raw),ratio=Math.max(.01,n(ivRatio)||1);
    const T=years(s.scenarioDate,s.expiryDate),ivs=calibrateLegIVs(s);
    let v=0;
    s.legs.forEach((l,i)=>{
      const base=ivs[i]>0?ivs[i]:s.ivFallback;
      const px=bsm(l.type,n(Sf),l.strike,T,s.rate,s.dividendYield,Math.max(.0001,base*ratio));
      v+=sideSign(l.side)*px*l.qty;
    });
    return v;
  }

  function mtmPnlTotal(raw,Sf,ivRatio){
    const s=normalizeStrategy(raw);
    let p=s.stockQty*(n(Sf)-s.spot);
    const netNow=scenarioOptionNetValuePerUnit(s,Sf,ivRatio);
    const entryOptionValue=s.legs.reduce((a,l)=>a+sideSign(l.side)*l.price*l.qty,0);
    p+=(netNow-entryOptionValue);
    return p*s.units-s.entryCost-s.exitCost;
  }

  function autoRange(raw){
    const s=normalizeStrategy(raw),risk=analyzeRisk(s);
    let need=10;
    s.legs.forEach(l=>{if(s.spot>0)need=Math.max(need,Math.abs((l.strike/s.spot-1)*100))});
    (risk.bes||[]).forEach(v=>{if(s.spot>0)need=Math.max(need,Math.abs((v/s.spot-1)*100))});
    return Math.max(10,Math.min(80,Math.ceil((need*1.4)/5)*5));
  }

function presentationRange(raw){
    const s=normalizeStrategy(raw),risk=analyzeRisk(s);
    let low=-20,high=20;
    let lowSlope=s.stockQty,highSlope=s.stockQty;
    s.legs.forEach(l=>{
      const sign=sideSign(l.side)*l.qty;
      if(l.type==='put')lowSlope-=sign;
      if(l.type==='call')highSlope+=sign;
    });

    // Estruturas com exposição relevante nas caudas precisam de espaço visual
    // adicional para que a convexidade/assimetria fique evidente ao cliente.
    if(Math.abs(lowSlope)>1e-9)low=-30;
    if(Math.abs(highSlope)>1e-9)high=30;
    if(Math.abs(lowSlope)>1e-9&&Math.abs(highSlope)>1e-9){low=-30;high=30}
    if(risk.maxGain===Infinity||risk.maxLoss===-Infinity)high=Math.max(high,30);

    const anchors=[];
    s.legs.forEach(l=>{if(l.strike>0)anchors.push(l.strike)});
    (risk.bes||[]).forEach(v=>{if(v>0)anchors.push(v)});
    anchors.forEach(v=>{
      if(!(s.spot>0))return;
      const p=(v/s.spot-1)*100;
      const pad=Math.max(5,Math.abs(p)*.30);
      if(p<0)low=Math.min(low,p-pad);
      else high=Math.max(high,p+pad);
    });

    low=Math.max(-60,Math.floor(low/5)*5);
    high=Math.min(60,Math.ceil(high/5)*5);
    if(low>-20)low=-20;
    if(high<20)high=20;
    return {lowPct:low,highPct:high,lowSlope,highSlope};
  }

  global.OptionEngine={
    sideSign,years,normCDF,bsm,intrinsic,impliedVolLeg,normalizeStrategy,
    expiryPnlPerUnit,expiryPnlTotal,highSlope,analyzeRisk,calibrateLegIVs,
    scenarioOptionNetValuePerUnit,mtmPnlTotal,autoRange,presentationRange
  };
})(window);
