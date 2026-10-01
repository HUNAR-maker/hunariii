/* HUNAR targeted payment-return fix: Chapa must never leave a contract payment return on localhost. */
(function(){
  'use strict';
  try{
    var host=location.hostname||'';
    var hash=location.hash||'';
    var localHost=host==='localhost'||host==='127.0.0.1'||host==='0.0.0.0';
    var contractMatch=hash.match(/^#contract\/([^?]+)(?:\?(.*))?$/i);
    if(localHost&&contractMatch){
      var query=contractMatch[2]||'';
      var params=new URLSearchParams(query);
      var paymentReturn=params.has('payment')||params.has('tx_ref')||params.has('trx_ref')||params.has('ref_id')||params.has('status');
      if(paymentReturn){
        var target='https://hunar-maker.github.io/hunariii/'+hash;
        if(location.href!==target) location.replace(target);
        return;
      }
    }
  }catch(e){console.warn('HUNAR payment return redirect:',e&&e.message||e);}
})();

/* HUNAR homepage-only fix: show existing registered freelancer profiles on first public visit. */
(function(){
  'use strict';
  var done=false,busy=false,timer=null;
  function onHome(){var h=(location.hash.slice(1)||'home').split('?')[0];return !h||h==='home';}
  async function load(){
    if(done||busy||!onHome()) return;
    if(typeof S==='undefined'||!window.HunarData||!window.HunarData.freelancers||typeof window.HunarData.freelancers.public!=='function'||!window.supabaseClient) return;
    var grid=document.querySelector('.hunarPeopleRebuild .hprPeopleGrid');
    if(!grid) return;
    if(Array.isArray(S.profiles)&&S.profiles.some(function(p){return p&&p.id;})){done=true;return;}
    busy=true;
    try{
      var data=await window.HunarData.freelancers.public();
      var accounts=Array.isArray(data&&data.accounts)?data.accounts:[];
      var profiles=Array.isArray(data&&data.profiles)?data.profiles:[];
      var byId=new Map(profiles.map(function(p){return [String(p.account_id),p];}));
      var people=accounts.filter(function(a){return a&&a.id&&a.role==='freelancer';}).map(function(a){
        var fp=byId.get(String(a.id))||{};
        return {id:a.id,n:a.full_name||'Freelancer',t:fp.professional_title||fp.profession||'Freelancer',profession:fp.profession||'Freelancer',l:a.city||'Ethiopia',r:a.region||'',city:a.city||'',photo:a.photo_url||'',bio:a.bio||'',v:a.verification_status==='verified',rating:'New',completed:0,price:Number(fp.starting_price_etb||0),cats:Array.isArray(fp.categories)?fp.categories:[],skills:Array.isArray(fp.skills)?fp.skills:[],availability:fp.availability||'',experience:fp.experience||'',languages:Array.isArray(fp.languages)?fp.languages:[],certificates:Array.isArray(fp.certificates)?fp.certificates:[]};
      });
      if(!people.length||typeof window.devCard!=='function') return;
      S.profiles=people;
      grid.innerHTML=people.slice(0,6).map(window.devCard).join('');
      done=true;
    }catch(e){console.warn('HUNAR homepage freelancer load:',e&&e.message||e);}
    finally{busy=false;}
  }
  function start(){
    if(timer) return;
    timer=setInterval(function(){
      if(done){clearInterval(timer);timer=null;return;}
      load();
    },300);
    setTimeout(load,80);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
  window.addEventListener('hashchange',function(){done=false;setTimeout(load,80);});

  /* HUNAR withdrawal-status fix: whenever the wallet page reads withdrawals,
     verify any processing payout with Chapa and refresh the final status. */
  function installWithdrawalStatusFix(){
    try{
      if(!window.HunarData||!window.HunarData.wallet||typeof window.HunarData.wallet.withdrawals!=='function') return false;
      if(window.HunarData.wallet.__withdrawalStatusFixInstalled) return true;
      var original=window.HunarData.wallet.withdrawals.bind(window.HunarData.wallet);
      var checking=false;
      window.HunarData.wallet.withdrawals=async function(limit,offset){
        var rows=await original(limit,offset);
        if(checking||!Array.isArray(rows)||!rows.length||!window.supabaseClient) return rows;
        var processing=rows.filter(function(r){return String(r&&r.status||'').toLowerCase()==='processing'&&r&&r.id;});
        if(!processing.length||!window.supabaseClient.functions) return rows;
        checking=true;
        try{
          await Promise.all(processing.map(async function(row){
            try{
              await window.supabaseClient.functions.invoke('hunar-chapa-payments',{body:{action:'verify_withdrawal',withdrawal_id:row.id}});
            }catch(e){console.warn('HUNAR withdrawal status check:',e&&e.message||e);}
          }));
          return await original(limit,offset);
        }finally{checking=false;}
      };
      window.HunarData.wallet.__withdrawalStatusFixInstalled=true;
      return true;
    }catch(e){console.warn('HUNAR withdrawal status fix install:',e&&e.message||e);return false;}
  }
  var installTimer=setInterval(function(){if(installWithdrawalStatusFix()){clearInterval(installTimer);}},300);
  setTimeout(installWithdrawalStatusFix,100);

  /* Preserve all existing HUNAR UI fixes by loading the previous live-fixes file. */
  var s=document.createElement('script');
  s.src='./hunar-live-fixes-base.js?v=1';
  s.async=false;
  document.head.appendChild(s);
})();