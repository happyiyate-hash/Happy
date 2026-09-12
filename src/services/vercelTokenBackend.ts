/** Central token backend gateway. Saving is explicit and reward crediting is authoritative in Supabase. */
import { getChainInfo } from '../constants/chains';
import { resolveChainLogo } from './chainLogos';
import { notifyBackendError, extractBackendErrorMessage } from './toastManager';
import { getAllTokens as getWorkerExploreTokens, getTokensByUser as getWorkerUserTokens, WORKER_URL } from './localBackendService';
import { getSupabase } from '../lib/supabase';

export const VERCEL_TOKEN_GATEWAY_URL='https://token-save-backend-p74bbibkg-happyiyate-hashs-projects.vercel.app/api/token';
export const LOCAL_TOKEN_GATEWAY_URL='/api/token';
export const VERCEL_SAVE_TOKEN_URL=VERCEL_TOKEN_GATEWAY_URL;
export const LOCAL_PROXY_GATEWAY_URL=LOCAL_TOKEN_GATEWAY_URL;
export const LOCAL_PROXY_SAVE_URL=LOCAL_TOKEN_GATEWAY_URL;

export interface BackendTokenItem { blockchain:string; blockchainSymbol:string; chainId:number; contractAddress:string; tokenName:string; tokenSymbol:string; logoUrl:string; }
export interface BackendSavePayload { userId:string; tokens:BackendTokenItem[]; }
export interface SaveTokenBackendResponse { success:boolean; partial?:boolean; message?:string; error?:string; saved?:any[]; rejected?:any[]; reward?:{amount:number;symbol:string;credited?:boolean;[key:string]:unknown}; notification?:any; [key:string]:unknown; }

export function formatTokenForBackend(token:any,fallbackChainId?:string|number):BackendTokenItem{
 const chainIdInput=token.chainId??token.metadata?.chainId??fallbackChainId??'137'; const chainMeta=getChainInfo(String(chainIdInput)); const chainNetwork=resolveChainLogo(token.blockchain??token.metadata?.blockchainName??chainMeta.name,String(chainIdInput));
 const blockchain=token.blockchain||token.metadata?.blockchainName||token.metadata?.chainName||chainMeta.name||chainNetwork.name||'Polygon'; const blockchainSymbol=token.blockchainSymbol||token.metadata?.chainSymbol||chainMeta.symbol||chainNetwork.symbol||'MATIC';
 let numericChainId=Number(token.chainId??chainMeta.id??chainIdInput??chainNetwork.id??137); if(!Number.isFinite(numericChainId)||numericChainId<=0)numericChainId=137;
 return {blockchain,blockchainSymbol,chainId:numericChainId,contractAddress:String(token.contractAddress??token.address??token.id??token.metadata?.address??'').trim(),tokenName:token.tokenName||token.name||token.metadata?.name||'Unknown Token',tokenSymbol:String(token.tokenSymbol||token.symbol||token.metadata?.symbol||'TOK').toUpperCase(),logoUrl:token.logoUrl||token.metadata?.logoUrl||''};
}

async function post(url:string,payload:any,timeoutMs=15000){const c=new AbortController();const timer=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:c.signal});const j=await r.json().catch(()=>null);return {ok:r.ok,status:r.status,json:j};}finally{clearTimeout(timer);}}

export async function fetchExploreTokensFromBackend():Promise<any[]>{try{const r=await getWorkerExploreTokens();if(r?.success&&Array.isArray(r.tokens)&&r.tokens.length)return r.tokens;}catch{}const r=await post(LOCAL_TOKEN_GATEWAY_URL,{action:'getAllTokens'});if(!r.ok||r.json?.success===false){notifyBackendError(r.status,r.json,'Explore: getAllTokens');throw Object.assign(new Error(extractBackendErrorMessage(r.status,r.json)),{status:r.status,backendResponse:r.json});}return Array.isArray(r.json?.tokens)?r.json.tokens:[];}
export async function fetchTokensByUserFromBackend(userId:string):Promise<any[]>{if(!userId?.trim())return[];try{const r=await getWorkerUserTokens(userId.trim());if(r?.success&&Array.isArray(r.tokens))return r.tokens;}catch{}const r=await post(LOCAL_TOKEN_GATEWAY_URL,{action:'getTokensByUser',userId:userId.trim()});if(!r.ok||r.json?.success===false){notifyBackendError(r.status,r.json,'Tokens: getTokensByUser');throw Object.assign(new Error(extractBackendErrorMessage(r.status,r.json)),{status:r.status,backendResponse:r.json});}return Array.isArray(r.json?.tokens)?r.json.tokens:[];}

/** Explicit SAVE operation. Verification happens before this function is called. */
export async function saveTokensToBackend(userId:string,tokens:any[]):Promise<SaveTokenBackendResponse>{
 if(!tokens?.length)return{success:false,message:'No tokens provided to save.'};
 const supabase=getSupabase(); const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return{success:false,error:'AUTH_REQUIRED',message:'You must be signed in to save tokens.'};
 if(user.id!==userId)return{success:false,error:'USER_MISMATCH',message:'Authenticated user does not match the save request.'};
 const formatted=tokens.map(t=>formatTokenForBackend(t));
 if(formatted.some(t=>!t.contractAddress))return{success:false,error:'INVALID_TOKEN',message:'A token is missing its contract address.'};
 try{
   const payload={action:formatted.length===1?'submit':'batchSaveTokens',userId:user.id,...(formatted.length===1?{name:formatted[0].tokenName,symbol:formatted[0].tokenSymbol,contractAddress:formatted[0].contractAddress,blockchain:formatted[0].blockchain,logoUrl:formatted[0].logoUrl}:{tokens:formatted.map(t=>({name:t.tokenName,symbol:t.tokenSymbol,contractAddress:t.contractAddress,blockchain:t.blockchain,logoUrl:t.logoUrl}))})};
   const worker=await post(WORKER_URL,payload);
   if(!worker.ok||worker.json?.success===false)return{success:false,error:worker.json?.error||`HTTP ${worker.status}`,message:worker.json?.message||'Token save was rejected by the save service.'};
   const savedCount=formatted.length===1?1:Number(worker.json?.saved??formatted.length);
   if(!Number.isFinite(savedCount)||savedCount<1)return{success:true,partial:true,saved:[],rejected:formatted,message:'No new token was saved; no reward was credited.'};
   const actualSaved=formatted.slice(0,savedCount);
   const requestId=`token-save:${user.id}:${actualSaved.map(t=>`${t.blockchain}:${t.contractAddress.toLowerCase()}`).sort().join('|')}`;
   const tokenPayload=actualSaved.length===1?{symbol:actualSaved[0].tokenSymbol,address:actualSaved[0].contractAddress,blockchain:actualSaved[0].blockchain}:actualSaved.map(t=>({symbol:t.tokenSymbol,address:t.contractAddress,blockchain:t.blockchain}));
   const {data:reward,error:rewardError}=await supabase.rpc('grant_token_donation_reward',{p_user_id:user.id,p_amount:actualSaved.length*15,p_token:tokenPayload,p_request_id:requestId});
   if(rewardError||!reward?.credited&&!reward?.duplicate)return{success:false,error:'REWARD_CREDIT_FAILED',message:'Token save completed, but the authoritative Supabase reward credit failed. No local reward was created.',saved:actualSaved,rejected:[]};
   return{success:true,message:`Successfully saved ${actualSaved.length} token(s). Earned ${Number(reward.amount||0)} TC.`,saved:actualSaved,rejected:[],reward:{amount:Number(reward.amount||0),symbol:'TC',credited:Boolean(reward.credited||reward.duplicate),...reward},notification:reward.notification_id?{id:reward.notification_id}:undefined};
 }catch(err:any){const message=err?.message||'Failed to communicate with the token save service.';notifyBackendError(0,{error:'Network Connection Failure',message},'Donate: save-token');return{success:false,error:'NETWORK_ERROR',message};}
}
