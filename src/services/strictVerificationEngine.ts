import { ChainId } from '../types';
import { getChainInfo, normalizeChainKey, isEvmChain } from '../constants/chains';

export interface VerificationReport {
  contractAddress: string; chainId: ChainId; rawScore: number; maxRawScore: number; trustScore: number;
  securityScore: number; marketMaturityScore: number; verdict: 'APPROVED_LOW_RISK'|'APPROVED_EXCELLENT'|'REJECTED';
  verdictLabel: string; status: 'APPROVED'|'REJECTED'; riskRating: 'LOW'|'HIGH'; recommendation: string;
  actionableRecommendation: string; warnings: string[]; passedSecurity: string[]; passedMarket: string[];
  maturityWarnings: string[]; securityWarnings: string[]; whyNotApproved: string[]; isNewToken: boolean;
  categories: any; providers: any[]; autoRejected: boolean; autoRejectReasons: string[];
  onChainFallback: { contractExists: boolean; isSourceVerified: boolean; deploymentInfo: string; hasFallbackMetadata: boolean };
  securityChecks: { isHoneypot:boolean; isMintable:boolean; isProxy:boolean; isBlacklisted:boolean; isOwnershipRenounced:boolean; isSourceCodeVerified:boolean; buyTaxPct:number; sellTaxPct:number; liquidityLockedPct:number; top10HoldersPct:number; holdersCount:number; pairAgeDays:number };
  summaryText: string; timestamp: string;
}

async function getJson(url:string){ const r=await fetch(url); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }

function category(id:string,name:string,score:number,maxScore:number,details:string){ return {id,name,score,maxScore,weightPct:maxScore,details}; }

export async function verifyToken(address:string, chainId:ChainId, customLogoUrl?:string, blockchainType?:string):Promise<VerificationReport>{
  const chain=normalizeChainKey(chainId);
  const providerEvidence:any[]=[];
  const warnings:string[]=[];
  const passedSecurity:string[]=[];
  const passedMarket:string[]=[];
  const autoRejectReasons:string[]=[];

  let cg:any=null, dex:any=null, gecko:any=null, gp:any=null, honey:any=null;

  await Promise.all([
    (async()=>{ try { const platform=getChainInfo(chainId).coingeckoPlatform; if(!platform) throw new Error('CoinGecko platform unavailable'); const d=await getJson(`https://api.coingecko.com/api/v3/coins/${platform}/contract/${address.toLowerCase()}`); cg={name:d.name||'',symbol:String(d.symbol||'').toUpperCase(),priceUsd:Number(d.market_data?.current_price?.usd||0),marketCapUsd:Number(d.market_data?.market_cap?.usd||0),logoUrl:d.image?.large||d.image?.small||'',status:'verified'}; } catch { cg={name:'',symbol:'',priceUsd:0,marketCapUsd:0,logoUrl:'',status:'failed'}; } })(),
    (async()=>{ try { const d=await getJson(`https://api.dexscreener.com/latest/dex/tokens/${address.toLowerCase()}`); const pairs=(d.pairs||[]).filter((p:any)=>normalizeChainKey(p.chainId)===chain).sort((a:any,b:any)=>Number(b.liquidity?.usd||0)-Number(a.liquidity?.usd||0); const p=pairs[0]; if(!p) throw new Error('No pair'); dex={priceUsd:Number(p.priceUsd||0),liquidityUsd:Number(p.liquidity?.usd||0),volume24h:Number(p.volume?.h24||0),pairAddress:p.pairAddress||'',pairUrl:p.url||'',dexName:p.dexId||'DEX',status:'verified'}; } catch { dex={priceUsd:0,liquidityUsd:0,volume24h:0,status:'failed'}; } })(),
    (async()=>{ try { const network=getChainInfo(chainId).dexScreenerChain; if(!network) throw new Error('Gecko network unavailable'); const d=await getJson(`https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${address.toLowerCase()}`); const a=d.data?.attributes; if(!a) throw new Error('No Gecko data'); gecko={priceUsd:Number(a.price_usd||0),liquidityUsd:Number(a.total_reserve_in_usd||0),volume24h:Number(a.volume_usd?.h24||0),status:'verified'}; } catch { gecko={priceUsd:0,liquidityUsd:0,volume24h:0,status:'failed'}; } })(),
    (async()=>{ if(!isEvmChain(chainId,blockchainType)){ gp={status:'unavailable'}; return; } try { const supported=new Set(['1','56','137','42161','8453','10','43114','42220']); if(!supported.has(chain)) throw new Error('GoPlus chain unsupported'); const d=await getJson(`https://api.gopluslabs.io/api/v1/token_security/${chain}?contract_addresses=${address.toLowerCase()}`); const t=d?.result?.[address.toLowerCase()]; if(!t) throw new Error('No GoPlus result'); const owner=String(t.owner_address||''); gp={status:'verified',isHoneypot:t.is_honeypot==='1',isMintable:t.is_mintable==='1',isProxy:t.is_proxy==='1',isBlacklisted:t.is_in_dex==='0',isOpenSource:t.is_open_source==='1',isRenounced:owner===''||/^0x0{40}$/.test(owner),buyTax:Number(t.buy_tax||0)*100,sellTax:Number(t.sell_tax||0)*100}; } catch { gp={status:'failed',isHoneypot:true,isMintable:false,isProxy:false,isBlacklisted:false,isOpenSource:false,isRenounced:false,buyTax:0,sellTax:0}; } })(),
    (async()=>{ if(!isEvmChain(chainId,blockchainType)){ honey={status:'unavailable',isHoneypot:true}; return; } try { const d=await getJson(`https://api.honeypot.is/v2/IsHoneypot?address=${encodeURIComponent(address)}&chainId=${Number(chain)}`); honey={status:d?.honeypotResult?.isHoneypot?'failed':'verified',isHoneypot:!!d?.honeypotResult?.isHoneypot}; } catch { honey={status:'failed',isHoneypot:true}; } })()
  ]);

  const price=Math.max(Number(dex?.priceUsd||0),Number(cg?.priceUsd||0),Number(gecko?.priceUsd||0));
  const liquidity=Math.max(Number(dex?.liquidityUsd||0),Number(gecko?.liquidityUsd||0));
  const volume=Math.max(Number(dex?.volume24h||0),Number(gecko?.volume24h||0));
  const marketCap=Number(cg?.marketCapUsd||0);
  const honeypot=Boolean(gp?.isHoneypot||honey?.isHoneypot);
  const sourceVerified=gp?.status==='verified' && gp?.isOpenSource===true;
  const metadataOk=Boolean(cg?.name&&cg?.symbol);

  if(!metadataOk) autoRejectReasons.push('Live token metadata could not be independently confirmed.');
  if(honeypot) autoRejectReasons.push('Honeypot or failed sell simulation detected.');
  if(gp?.status!=='verified' || honey?.status!=='verified') autoRejectReasons.push('Required live security provider did not return a verified result.');
  if(!sourceVerified) autoRejectReasons.push('Contract source could not be independently verified by the available security provider.');
  if(price<=0) autoRejectReasons.push('No live token price was confirmed.');
  if(marketCap<=0) autoRejectReasons.push('No live market capitalization was confirmed.');
  if(liquidity<=0) autoRejectReasons.push('No live liquidity was confirmed.');
  if(volume<=0) autoRejectReasons.push('No live 24h trading volume was confirmed.');
  if(Number(gp?.buyTax||0)>10 || Number(gp?.sellTax||0)>10) autoRejectReasons.push('Transaction tax exceeds the maximum allowed threshold.');
  if(gp?.isBlacklisted) autoRejectReasons.push('Security provider flagged blacklist/DEX risk.');

  if(!autoRejectReasons.length){ passedSecurity.push('Live GoPlus security result returned.','Live Honeypot.is simulation returned no honeypot.','Contract metadata was confirmed by live providers.'); passedMarket.push(`Live price confirmed: $${price}`,`Live liquidity confirmed: $${Math.round(liquidity).toLocaleString()}`,`Live 24h volume confirmed: $${Math.round(volume).toLocaleString()}`); }
  else warnings.push(...autoRejectReasons);

  const securityScore=autoRejectReasons.length?0:50;
  const marketScore=autoRejectReasons.length?0:50;
  const trustScore=securityScore+marketScore;
  const approved=!autoRejectReasons.length;
  const logoUrl=customLogoUrl||cg?.logoUrl||'';
  const categories={security:category('security','Security',securityScore?30:0,30,securityScore?'Live security checks passed':'Live security checks failed'),liquidity:category('liquidity','Liquidity',liquidity>0?15:0,15,`$${Math.round(liquidity).toLocaleString()} live liquidity`),marketData:category('marketData','Market Data',marketCap>0?10:0,10,`$${Math.round(marketCap).toLocaleString()} market cap`),tradingActivity:category('tradingActivity','Trading Activity',volume>0?10:0,10,`$${Math.round(volume).toLocaleString()} 24h volume`),holders:category('holders','Holder Distribution',0,10,'Holder concentration not independently available'),blockchainMetadata:category('blockchainMetadata','Blockchain Metadata',metadataOk?10:0,10,metadataOk?'Metadata confirmed':'Metadata unavailable'),contractVerification:category('contractVerification','Contract Verification',sourceVerified?5:0,5,sourceVerified?'Security provider confirms source is open':'Not independently verified'),logoQuality:category('logoQuality','Logo',logoUrl?5:0,5,logoUrl?'Logo available':'No verified logo'),community:category('community','Community',0,5,'No provider-backed community score')};

  providerEvidence.push({providerId:'coingecko',name:'CoinGecko',status:cg.status,score:marketCap>0?15:0,maxScore:15,dataPoints:['price','market cap'],lastChecked:'Just now'}, {providerId:'dexscreener',name:'DexScreener',status:dex.status,score:liquidity>0?20:0,maxScore:20,dataPoints:['liquidity','volume'],lastChecked:'Just now'}, {providerId:'geckoterminal',name:'GeckoTerminal',status:gecko.status,score:liquidity>0?15:0,maxScore:15,dataPoints:['reserve','volume'],lastChecked:'Just now'}, {providerId:'goplus',name:'GoPlus',status:gp.status,score:gp.status==='verified'&&!gp.isHoneypot?25:0,maxScore:25,dataPoints:['honeypot','tax','mint','proxy','blacklist'],lastChecked:'Just now'}, {providerId:'honeypotis',name:'Honeypot.is',status:honey.status,score:honey.status==='verified'&&!honey.isHoneypot?15:0,maxScore:15,dataPoints:['sell simulation'],lastChecked:'Just now'});

  return {contractAddress:address,chainId,rawScore:providerEvidence.reduce((s,p)=>s+p.score,0),maxRawScore:90,trustScore,securityScore,marketMaturityScore:marketScore,verdict:approved?'APPROVED_LOW_RISK':'REJECTED',verdictLabel:approved?'Accepted (Low Risk)':'Rejected',status:approved?'APPROVED':'REJECTED',riskRating:approved?'LOW':'HIGH',recommendation:approved?'Approved for user confirmation':'Rejected',actionableRecommendation:approved?'Verification complete. Nothing has been saved. User confirmation is required before saving.':autoRejectReasons.join(' '),warnings,passedSecurity,passedMarket,maturityWarnings:[],securityWarnings:autoRejectReasons,whyNotApproved:autoRejectReasons,isNewToken:false,categories,providers:providerEvidence,autoRejected:!approved,autoRejectReasons,onChainFallback:{contractExists:metadataOk,isSourceVerified:sourceVerified,deploymentInfo:metadataOk?'Live providers confirmed token metadata':'No live token metadata',hasFallbackMetadata:false},securityChecks:{isHoneypot:honeypot,isMintable:!!gp?.isMintable,isProxy:!!gp?.isProxy,isBlacklisted:!!gp?.isBlacklisted,isOwnershipRenounced:!!gp?.isRenounced,isSourceCodeVerified:sourceVerified,buyTaxPct:Number(gp?.buyTax||0),sellTaxPct:Number(gp?.sellTax||0),liquidityLockedPct:0,top10HoldersPct:100,holdersCount:0,pairAgeDays:0},summaryText:approved?`Verified: live price, market cap, liquidity, volume and security checks passed. Nothing has been saved.`:`Rejected: ${autoRejectReasons.join(' ')}`,timestamp:new Date().toISOString()};
}
