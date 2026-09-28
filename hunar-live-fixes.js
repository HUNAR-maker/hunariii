/* HUNAR live UI fixes — mobile account menu, service title contrast, and responsive 3D motion. */
(function(){
  'use strict';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }

  function profileMenuHtmlFixed(){
    if(!window.me) return '';
    const users=window.S?.users||[];
    const u=users.find(x=>x.id===window.me.id)||{};
    const d=typeof window.currentProfile==='function'?(window.currentProfile()||{}):{};
    const esc=window.esc||function(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))};
    const initials=window.initials||function(v){return String(v||'U').trim().slice(0,2).toUpperCase()};
    const open=!!window.profileMenuOpen;
    return `<div class="profileMenuWrap hunarProfileWrap"><button class="profileTrigger hunarMobileProfileTrigger" aria-label="Open profile menu" title="Profile" type="button" onclick="event.stopPropagation();toggleProfileMenu()"><span class="headerAvatar">${d.photo?`<img src="${esc(d.photo)}" alt="">`:initials(d.n||u.n||u.email||'User')}</span></button>${open?`<div class="profileMenu hunarMobileProfileMenu" role="menu" aria-label="Profile menu"><div class="profileMenuHead"><b>${esc(d.n||u.n||'Hunar member')}</b><small>${window.me.role==='freelancer'?'Freelancer':'Client'}</small></div><button type="button" role="menuitem" onclick="profileMenuOpen=false;go('profile')">Profile</button><button type="button" role="menuitem" onclick="profileMenuOpen=false;go('performance')">Performance</button><button type="button" role="menuitem" onclick="profileMenuOpen=false;go('identity-verification')">Identity Verification</button><button type="button" role="menuitem" onclick="profileMenuOpen=false;go('help')">Help / Support</button><button type="button" role="menuitem" onclick="profileMenuOpen=false;go('settings')">Settings</button><button type="button" role="menuitem" onclick="profileMenuOpen=false;go('account')">Account</button><button class="logoutItem" role="menuitem" type="button" onclick="logout()">Log Out</button></div>`:''}</div>`;
  }

  function install(){
    if(typeof window.profileMenuHtml==='function') window.profileMenuHtml=profileMenuHtmlFixed;
    const style=document.getElementById('hunar-live-fixes-style')||document.createElement('style');
    style.id='hunar-live-fixes-style';
    style.textContent=`
      .hunarMobileProfileMenu{z-index:99999!important;max-height:calc(100vh - 76px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;}
      .hunarMobileProfileMenu button{display:block!important;width:100%!important;min-height:44px!important;color:#111815!important;background:transparent!important;white-space:nowrap!important;writing-mode:horizontal-tb!important;}
      .hunarMobileProfileMenu .logoutItem{color:#b54747!important;}
      .myServicesHero h1,.myServicesHero h2,.myServicesHero .servicePageTitle{color:#fff!important;}
      .myServicesHero p.muted{color:#e3ebe5!important;}
      .hunarPeopleRebuild .hprOrbitTwo{opacity:.18!important;transform:rotateX(72deg) rotateZ(-28deg) scale(.82)!important;}
      .hunarPeopleRebuild .hprOrbitOne{border-style:dashed!important;animation-duration:17s!important;}
      .hunarPeopleRebuild .hprCore{border-radius:50%!important;transform:rotateX(18deg) rotateY(-16deg)!important;box-shadow:0 24px 60px rgba(15,29,20,.25),inset 0 0 0 1px rgba(223,255,155,.14)!important;}
      .hunarPeopleRebuild .hprNode{transition:transform .35s ease,box-shadow .35s ease!important;}
      .hunarPeopleRebuild .hprNode:nth-of-type(1){transform:translateY(-3px) rotate(-2deg);}
      .hunarPeopleRebuild .hprNode:nth-of-type(2){transform:translateY(3px) rotate(2deg);}
      .hunarPeopleRebuild .hprNode:nth-of-type(3){transform:translateY(2px) rotate(1deg);}
      .hunarPeopleRebuild .hprNode:nth-of-type(4){transform:translateY(-2px) rotate(-1deg);}
      .hunar-drag-orb{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important;}

      /* ONLY THE HOMEPAGE PEOPLE SECTION: real registered freelancer cards, horizontal swipe, circular photos. */
      .hunarPeopleRebuild .hprPeopleGrid{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;gap:16px!important;overflow-x:auto!important;overflow-y:hidden!important;scroll-snap-type:x mandatory!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-x!important;padding:4px 2px 12px!important;}
      .hunarPeopleRebuild .hprPeopleGrid::-webkit-scrollbar{display:none!important;}
      .hunarPeopleRebuild .hprPeopleGrid>.card{flex:0 0 calc((100% - 32px)/3)!important;min-width:0!important;scroll-snap-align:start!important;border-radius:22px!important;overflow:hidden!important;transition:transform .25s ease,box-shadow .25s ease!important;}
      .hunarPeopleRebuild .hprPeopleGrid>.card:hover{transform:translateY(-3px)!important;box-shadow:0 14px 34px rgba(20,34,27,.09)!important;}
      .hunarPeopleRebuild .hprPeopleGrid>.card .avatar{width:82px!important;height:82px!important;min-width:82px!important;max-width:82px!important;min-height:82px!important;max-height:82px!important;aspect-ratio:1/1!important;border-radius:50%!important;overflow:hidden!important;display:grid!important;place-items:center!important;border:3px solid #fff!important;box-shadow:0 0 0 1px #dfe7e2,0 8px 20px rgba(20,34,27,.10)!important;background:linear-gradient(145deg,#d9eee4,#bcdaca)!important;}
      .hunarPeopleRebuild .hprPeopleGrid>.card .avatar img{width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important;border-radius:50%!important;display:block!important;}
      @media(max-width:900px){.hunarPeopleRebuild .hprPeopleGrid>.card{flex-basis:calc((100% - 16px)/2)!important;}}
      @media(max-width:600px){.hunarPeopleRebuild .hprPeopleGrid>.card{flex-basis:88%!important;}}

      /* CLIENT FIND FREELANCER ONLY: the result-card profile avatar is always a real circle. */
      #devgrid > .card .avatar,#devgrid > .card .freelancerAvatar,#devgrid > .card .profileAvatar,#devgrid > .card .profilePhoto,#devgrid .row > .avatar{width:76px!important;height:76px!important;min-width:76px!important;max-width:76px!important;min-height:76px!important;max-height:76px!important;flex:0 0 76px!important;aspect-ratio:1/1!important;border-radius:50%!important;overflow:hidden!important;display:grid!important;place-items:center!important;border:3px solid #fff!important;box-shadow:0 0 0 1px #dfe7e2,0 8px 22px rgba(20,34,27,.10)!important;background:linear-gradient(145deg,#d9eee4,#bcdaca)!important;}
      #devgrid > .card .avatar img,#devgrid > .card .freelancerAvatar img,#devgrid > .card .profileAvatar img,#devgrid > .card .profilePhoto img,#devgrid .row > .avatar img{width:100%!important;height:100%!important;min-width:100%!important;max-width:none!important;min-height:100%!important;max-height:none!important;object-fit:cover!important;border-radius:50%!important;display:block!important;}

      /* SERVICES PAGE — visual presentation only. */
      .serviceProShell{background:linear-gradient(180deg,#f5f8f4 0%,#ffffff 34%,#f5f8f4 100%)!important;padding-top:28px!important;padding-bottom:60px!important;}
      .serviceProShell .serviceProHero{position:relative!important;overflow:hidden!important;padding:30px 30px 32px!important;border-radius:26px!important;background:radial-gradient(circle at 84% 18%,rgba(199,255,91,.22),transparent 24%),radial-gradient(circle at 8% 120%,rgba(116,169,91,.16),transparent 30%),linear-gradient(135deg,#13261a 0%,#1d3b25 55%,#29482c 100%)!important;color:#fff!important;border:1px solid rgba(255,255,255,.10)!important;box-shadow:0 24px 60px rgba(20,50,28,.16)!important;}
      .serviceProShell .serviceProHero:before{content:"";position:absolute;right:7%;top:50%;width:145px;height:145px;transform:translateY(-50%);border-radius:50%;border:1px solid rgba(220,255,150,.28);box-shadow:0 0 0 18px rgba(220,255,150,.035),0 0 0 38px rgba(220,255,150,.025);pointer-events:none;}
      .serviceProShell .serviceProHero:after{content:"H";right:34px;bottom:-55px;font-size:190px;line-height:1;font-weight:950;color:rgba(255,255,255,.055)!important;}
      .serviceProShell .serviceProHero .tag{position:relative;z-index:2;background:rgba(214,255,104,.15)!important;color:#ddff91!important;border:1px solid rgba(214,255,104,.25)!important;}
      .serviceProShell .serviceProHero h1{position:relative;z-index:2;color:#fff!important;font-size:clamp(34px,5vw,58px)!important;line-height:1!important;margin:12px 0 8px!important;letter-spacing:-.045em!important;}
      .serviceProShell .serviceProHero .sectionLead{position:relative;z-index:2;color:rgba(235,244,237,.78)!important;font-size:15px!important;max-width:600px!important;}
      .serviceProShell .serviceProGrid{display:grid!important;grid-template-columns:minmax(0,1.7fr) minmax(150px,.75fr) minmax(120px,.55fr) auto!important;gap:9px!important;align-items:center!important;padding:10px!important;margin:18px 0!important;border-radius:18px!important;background:rgba(255,255,255,.94)!important;border:1px solid #dce5de!important;box-shadow:0 12px 32px rgba(20,35,26,.055)!important;}
      .serviceProShell .serviceProGrid input:not([type="checkbox"]),.serviceProShell .serviceProGrid select{min-height:44px!important;border:1px solid #d7e0da!important;border-radius:12px!important;background:#fbfdfb!important;color:#18221b!important;padding:10px 12px!important;box-shadow:none!important;}
      .serviceProShell .serviceProGrid input:focus,.serviceProShell .serviceProGrid select:focus{border-color:#8ebc62!important;box-shadow:0 0 0 3px rgba(142,188,98,.13)!important;transform:none!important;}
      .serviceProShell .serviceProGrid .chip{min-height:44px!important;margin:0!important;padding:0 13px!important;border:1px solid #dce6d6!important;background:#f1f8df!important;color:#35452d!important;border-radius:12px!important;font-weight:800!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;white-space:nowrap!important;}
      .serviceProShell .serviceProGrid .chip input[type="checkbox"]{width:18px!important;height:18px!important;margin:0!important;accent-color:#79a94a!important;}
      .serviceProShell #servicegrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:15px!important;align-items:stretch!important;}
      .serviceProShell #servicegrid .serviceProCard{display:flex!important;flex-direction:column!important;min-width:0!important;min-height:390px!important;padding:14px!important;border-radius:20px!important;border:1px solid #dce5de!important;background:linear-gradient(145deg,#fff,#f7faf7)!important;box-shadow:0 10px 28px rgba(20,35,26,.055)!important;overflow:hidden!important;}
      .serviceProShell #servicegrid .serviceProCard .thumb{height:150px!important;min-height:150px!important;margin:-14px -14px 13px!important;border-radius:20px 20px 12px 12px!important;background:linear-gradient(135deg,#eef5e9,#dce8d9)!important;display:grid!important;place-items:center!important;font-size:42px!important;font-weight:950!important;color:#557347!important;overflow:hidden!important;}
      .serviceProShell #servicegrid .serviceProCard p.muted{margin:0 0 4px!important;color:#58705d!important;font-size:11px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.07em!important;}
      .serviceProShell #servicegrid .serviceProCard h3{margin:3px 0 8px!important;font-size:19px!important;line-height:1.25!important;letter-spacing:-.025em!important;color:#17231b!important;}
      .serviceProShell #servicegrid .serviceProCard > p:not(.muted){color:#5d6962!important;font-size:12px!important;line-height:1.55!important;display:-webkit-box!important;-webkit-line-clamp:3!important;-webkit-box-orient:vertical!important;overflow:hidden!important;min-height:56px!important;margin:0 0 12px!important;}
      .serviceProShell #servicegrid .serviceProCard .row{margin-top:auto!important;padding-top:11px!important;border-top:1px solid #edf1ed!important;}
      .serviceProShell #servicegrid .serviceProCard .row b{font-size:13px!important;color:#18231b!important}.serviceProShell #servicegrid .serviceProCard .row span{font-size:11px!important;color:#68756e!important;}
      .serviceProShell #servicegrid .serviceProCard > p:last-of-type{min-height:25px!important;margin:8px 0 0!important;color:#56655d!important;font-size:11px!important;}
      .serviceProShell #servicegrid .serviceProCard .actions{margin:10px 0 0!important;display:flex!important;gap:8px!important;}
      .serviceProShell #servicegrid .serviceProCard .actions .btn{width:100%!important;justify-content:center!important;}
      .serviceProShell #servicegrid .serviceProCard:hover{transform:translateY(-5px)!important;box-shadow:0 20px 42px rgba(20,35,26,.10)!important;}
      .serviceProShell #servicegrid > .card:not(.serviceProCard){grid-column:1/-1!important;min-height:150px!important;display:grid!important;place-items:center!important;text-align:center!important;border:1px dashed #cbd7cf!important;border-radius:20px!important;background:rgba(255,255,255,.78)!important;color:#506057!important;box-shadow:none!important;}
      @media(max-width:900px){.serviceProShell .serviceProGrid{grid-template-columns:1fr 1fr!important;}.serviceProShell .serviceProGrid input.grow{grid-column:1/-1!important;}.serviceProShell #servicegrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}
      @media(max-width:600px){.serviceProShell{padding-top:18px!important;padding-bottom:42px!important;}.serviceProShell .serviceProHero{padding:23px 19px 26px!important;border-radius:20px!important;}.serviceProShell .serviceProHero:before{width:105px;height:105px;right:-8px;}.serviceProShell .serviceProHero:after{font-size:120px;right:8px;}.serviceProShell .serviceProHero h1{font-size:36px!important;}.serviceProShell .serviceProGrid{grid-template-columns:1fr!important;padding:9px!important;}.serviceProShell .serviceProGrid input.grow{grid-column:auto!important;}.serviceProShell #servicegrid{grid-template-columns:1fr!important;gap:12px!important;}.serviceProShell #servicegrid .serviceProCard{min-height:0!important;}.serviceProShell #servicegrid .serviceProCard .thumb{height:155px!important;min-height:155px!important;}}

      /* MARKETPLACE ONLY — make the 3D scene compact and remove the oversized mobile footprint. */
      .mkFuture .mkHero{min-height:0!important;height:auto!important;padding:0!important;overflow:hidden!important;}
      .mkFuture .mkHeroInner{min-height:0!important;height:auto!important;grid-template-columns:minmax(0,1.1fr) minmax(240px,.9fr)!important;}
      .mkFuture .mkHeroScene{height:240px!important;min-height:240px!important;max-height:240px!important;overflow:hidden!important;position:relative!important;}
      .mkFuture .mkOrb{width:82px!important;height:82px!important;}
      .mkFuture .mkOrbit.o1{width:135px!important;height:135px!important;}
      .mkFuture .mkOrbit.o2{width:180px!important;height:90px!important;}
      .mkFuture .mkOrbit.o3{width:220px!important;height:220px!important;}
      .mkFuture .mkFloat{font-size:10px!important;padding:5px 7px!important;}
      .mkFuture .mkBody{padding-bottom:28px!important;}
      .mkFuture .mkHeroCopy{padding:24px 0!important;}

      /* Marketplace Back area ONLY — the whole strip uses the same dark board color. */
      #app.marketplace-active .backBar,
      #app.marketplace-active > .backBar,
      #app.marketplace-active .backBar:first-child{
        background:#0d1711!important;
        background-color:#0d1711!important;
        border:0!important;
        box-shadow:none!important;
        margin:0!important;
        padding:10px 24px 12px!important;
        min-height:76px!important;
      }
      #app.marketplace-active .backBar .btn{
        background:#111412!important;
        color:#c8ff3d!important;
        border-color:#111412!important;
        box-shadow:0 4px 0 rgba(0,0,0,.88),0 10px 22px rgba(17,20,18,.18)!important;
      }
      #app.marketplace-active .backBar .btn:hover{background:#171b18!important;color:#d7ff72!important;}
      #app.marketplace-active .mkFuture{margin-top:0!important;border-top:0!important;}

      /* Keep duplicate-back protection limited to the Marketplace state. */
      #app.marketplace-active > .backBar~.backBar{display:none!important;}
      #app.marketplace-active .backBar .backBar{display:none!important;}

      @media(max-width:800px){
        .mkFuture .mkHeroInner{display:flex!important;flex-direction:column!important;min-height:0!important;gap:0!important;}
        .mkFuture .mkHeroScene{order:-1!important;width:100%!important;height:180px!important;min-height:180px!important;max-height:180px!important;margin:0!important;}
        .mkFuture .mkHeroCopy{padding:18px 0 22px!important;}
        .mkFuture .mkHero h1{font-size:40px!important;letter-spacing:-2px!important;margin:10px 0 9px!important;}
        .mkFuture .mkHero p{font-size:13px!important;line-height:1.5!important;}
        .mkFuture .mkSearch{margin:15px 0 9px!important;}
        .mkFuture .mkOrb{width:64px!important;height:64px!important;}
        .mkFuture .mkOrb b{font-size:25px!important;}
        .mkFuture .mkOrbit.o1{width:108px!important;height:108px!important;}
        .mkFuture .mkOrbit.o2{width:145px!important;height:72px!important;}
        .mkFuture .mkOrbit.o3{width:175px!important;height:175px!important;}
        .mkFuture .mkParticle{width:3px!important;height:3px!important;}
        .mkFuture .mkFloat{display:none!important;}
        #app.marketplace-active .backBar,
        #app.marketplace-active > .backBar,
        #app.marketplace-active .backBar:first-child{min-height:62px!important;padding:8px 14px 9px!important;background:#0d1711!important;}
      }
      @media(max-width:470px){
        .mkFuture .mkHeroScene{height:150px!important;min-height:150px!important;max-height:150px!important;}
        .mkFuture .mkHeroCopy{padding:16px 0 20px!important;}
        .mkFuture .mkHero h1{font-size:35px!important;}
        .mkFuture .mkOrb{width:58px!important;height:58px!important;}
        .mkFuture .mkOrb b{font-size:22px!important;}
        .mkFuture .mkOrbit.o1{width:96px!important;height:96px!important;}
        .mkFuture .mkOrbit.o2{width:128px!important;height:64px!important;}
        .mkFuture .mkOrbit.o3{width:154px!important;height:154px!important;}
      }
    `;
    document.head.appendChild(style);
    const app=document.getElementById('app');
    if(app){
      const isMarketplace=!!app.querySelector('.mkFuture');
      app.classList.toggle('marketplace-active',isMarketplace);
      const bars=Array.from(app.children).filter(el=>el.classList&&el.classList.contains('backBar'));
      bars.forEach((bar,index)=>{bar.style.display=isMarketplace?(index===0?'':'none'):'';});
    }
  }

  function fixFindFreelancerCircles(){
    const rail=document.getElementById('devgrid');
    if(!rail) return;
    rail.querySelectorAll(':scope > .card .avatar, :scope > .card .freelancerAvatar, :scope > .card .profileAvatar, :scope > .card .profilePhoto').forEach(el=>{
      el.style.cssText += ';width:76px!important;height:76px!important;min-width:76px!important;max-width:76px!important;min-height:76px!important;max-height:76px!important;flex:0 0 76px!important;aspect-ratio:1/1!important;border-radius:50%!important;overflow:hidden!important;display:grid!important;place-items:center!important;border:3px solid #fff!important;box-shadow:0 0 0 1px #dfe7e2,0 8px 22px rgba(20,34,27,.10)!important;background:linear-gradient(145deg,#d9eee4,#bcdaca)!important;';
      const img=el.querySelector('img');
      if(img) img.style.cssText += ';width:100%!important;height:100%!important;min-width:100%!important;max-width:none!important;min-height:100%!important;max-height:none!important;object-fit:cover!important;border-radius:50%!important;display:block!important;';
    });
  }

  function fixMarketplaceAndBackButtons(){
    const styleId='hunar-marketplace-back-fix-style';
    let style=document.getElementById(styleId);
    if(!style){
      style=document.createElement('style');
      style.id=styleId;
      document.head.appendChild(style);
    }
    const app=document.getElementById('app');
    if(app){
      const isMarketplace=!!app.querySelector('.mkFuture');
      app.classList.toggle('marketplace-active',isMarketplace);
      const bars=Array.from(app.children).filter(el=>el.classList&&el.classList.contains('backBar'));
      bars.forEach((bar,index)=>{bar.style.display=isMarketplace?(index===0?'':'none'):'';});
    }
  }

  ready(install);
  ready(function(){
    fixFindFreelancerCircles();
    fixMarketplaceAndBackButtons();
    const observer=new MutationObserver(function(){fixFindFreelancerCircles();fixMarketplaceAndBackButtons();});
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',fixFindFreelancerCircles,{passive:true});
    window.addEventListener('resize',fixMarketplaceAndBackButtons,{passive:true});
  });
  const oldRender=window.render;
  if(typeof oldRender==='function') window.render=function(){const result=oldRender.apply(this,arguments);setTimeout(install,0);setTimeout(install,80);setTimeout(fixFindFreelancerCircles,0);setTimeout(fixFindFreelancerCircles,120);setTimeout(fixMarketplaceAndBackButtons,0);setTimeout(fixMarketplaceAndBackButtons,120);return result;};
  window.addEventListener('resize',()=>{setTimeout(install,0);setTimeout(fixMarketplaceAndBackButtons,0);},{passive:true});
})();
