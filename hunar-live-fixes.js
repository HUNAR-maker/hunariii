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

      /* TARGETED HOMEPAGE PEOPLE ONLY: real registered freelancer profiles, circular avatars, and a polished horizontal slider. */
      .hunarPeopleRebuild .hprPeopleGrid{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;gap:16px!important;overflow-x:auto!important;overflow-y:hidden!important;scroll-snap-type:x mandatory!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-x!important;padding:4px 2px 10px!important;}
      .hunarPeopleRebuild .hprPeopleGrid::-webkit-scrollbar{display:none!important;}
      .hunarPeopleRebuild .hprPeopleGrid>.card{flex:0 0 calc((100% - 32px)/3)!important;min-width:0!important;scroll-snap-align:start!important;border-radius:22px!important;overflow:hidden!important;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease!important;}
      .hunarPeopleRebuild .hprPeopleGrid>.card:hover{transform:translateY(-3px)!important;box-shadow:0 14px 34px rgba(20,34,27,.09)!important;}
      .hunarPeopleRebuild .hprPeopleGrid>.card .avatar{width:82px!important;height:82px!important;min-width:82px!important;max-width:82px!important;aspect-ratio:1/1!important;border-radius:50%!important;overflow:hidden!important;display:grid!important;place-items:center!important;border:3px solid #fff!important;box-shadow:0 0 0 1px #dfe7e2,0 8px 20px rgba(20,34,27,.10)!important;background:linear-gradient(145deg,#d9eee4,#bcdaca)!important;}
      .hunarPeopleRebuild .hprPeopleGrid>.card .avatar img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important;display:block!important;}
      @media(max-width:900px){.hunarPeopleRebuild .hprPeopleGrid>.card{flex-basis:calc((100% - 16px)/2)!important;}}
      @media(max-width:600px){.hunarPeopleRebuild .hprPeopleGrid>.card{flex-basis:88%!important;}}

      /* CLIENT FIND-FREELANCER ONLY: clean circular profile photos; remove the stretched/oval treatment. */
      .hunarFindFreelancerPage .avatar,
      .hunarFindFreelancerPage .freelancerAvatar,
      .hunarFindFreelancerPage .freelancer-card .avatar,
      .hunarFindFreelancerPage .freelancerCard .avatar,
      .hunarFindFreelancerPage .profileAvatar,
      .hunarFindFreelancerPage .profilePhoto{width:72px!important;height:72px!important;min-width:72px!important;max-width:72px!important;min-height:72px!important;max-height:72px!important;aspect-ratio:1/1!important;border-radius:50%!important;overflow:hidden!important;display:grid!important;place-items:center!important;flex:0 0 72px!important;border:3px solid #fff!important;box-shadow:0 0 0 1px #dfe7e2,0 8px 22px rgba(20,34,27,.10)!important;background:linear-gradient(145deg,#d9eee4,#bcdaca)!important;}
      .hunarFindFreelancerPage .avatar img,
      .hunarFindFreelancerPage .freelancerAvatar img,
      .hunarFindFreelancerPage .profileAvatar img,
      .hunarFindFreelancerPage .profilePhoto img{width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important;border-radius:50%!important;display:block!important;}

      @media (max-width:900px){
        .hunarProfileWrap,.hunarMobileProfileTrigger,.profileTrigger{display:inline-flex!important;visibility:visible!important;opacity:1!important;position:relative!important;}
        .hunarMobileProfileTrigger{min-width:42px!important;min-height:42px!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;z-index:100000!important;}
        .hunarMobileProfileMenu{position:fixed!important;right:10px!important;top:58px!important;width:min(280px,calc(100vw - 20px))!important;min-width:0!important;display:block!important;}
        .hunarPeopleRebuild .hprOrbitOne{width:330px!important;height:135px!important;animation-duration:13s!important;}
        .hunarPeopleRebuild .hprOrbitTwo{width:410px!important;height:170px!important;opacity:.10!important;animation-duration:18s!important;}
        .hunarPeopleRebuild .hprCore{animation:hprFloat 3.6s ease-in-out infinite!important;}
        .hunarPeopleRebuild .hprNode{animation:hunarNodeFloat 4.8s ease-in-out infinite!important;}
        .hunarPeopleRebuild .hprNode:nth-of-type(2){animation-delay:-1.2s!important;}
        .hunarPeopleRebuild .hprNode:nth-of-type(3){animation-delay:-2.4s!important;}
        .hunarPeopleRebuild .hprNode:nth-of-type(4){animation-delay:-3.6s!important;}
        .hunarPeopleRebuild .hprBeam{display:block!important;opacity:.35!important;}
        .hunarServicesRebuild .hsrRing{animation-duration:8s!important;}
        .hunarServicesRebuild .hsrDot{animation-duration:2.7s!important;}
      }
      @keyframes hunarNodeFloat{0%,100%{translate:0 0}50%{translate:0 -6px}}
    `;
    document.head.appendChild(style);
    if(typeof window.nav==='function') window.nav();
  }

  function enforceHomepagePeople(){
    const rail=document.querySelector('.hunarPeopleRebuild .hprPeopleGrid');
    if(!rail) return;
    const cards=[...rail.querySelectorAll(':scope > .card')];
    cards.slice(3).forEach(card=>card.remove());
    rail.style.display='flex';
    rail.style.flexDirection='row';
    rail.style.flexWrap='nowrap';
    rail.style.overflowX='auto';
    rail.style.overflowY='hidden';
    rail.style.scrollSnapType='x mandatory';
    rail.style.touchAction='pan-x';
    cards.slice(0,3).forEach(card=>{
      const avatar=card.querySelector('.avatar');
      if(avatar){avatar.style.width='82px';avatar.style.height='82px';avatar.style.minWidth='82px';avatar.style.maxWidth='82px';avatar.style.borderRadius='50%';avatar.style.overflow='hidden';}
      const img=avatar?.querySelector('img');
      if(img){img.style.width='100%';img.style.height='100%';img.style.objectFit='cover';img.style.borderRadius='50%';}
    });
  }

  function makeCircle(el){
    el.style.width='76px';el.style.height='76px';el.style.minWidth='76px';el.style.maxWidth='76px';el.style.minHeight='76px';el.style.maxHeight='76px';el.style.aspectRatio='1 / 1';el.style.borderRadius='50%';el.style.overflow='hidden';el.style.flex='0 0 76px';el.style.display='grid';el.style.placeItems='center';
    const img=el.querySelector('img');
    if(img){img.style.width='100%';img.style.height='100%';img.style.minWidth='100%';img.style.maxWidth='none';img.style.objectFit='cover';img.style.borderRadius='50%';img.style.display='block';}
  }

  function enforceFindFreelancerAvatars(){
    const root=[...document.querySelectorAll('main,section,[role="main"],body')].find(el=>{
      const t=(el.innerText||'').replace(/\s+/g,' ').toLowerCase();
      return /find (a )?freelancers?|find freelancer/.test(t) && /(freelancer|talent|services)/.test(t);
    });
    if(!root) return;
    root.classList.add('hunarFindFreelancerPage');
    root.querySelectorAll('.avatar,.freelancerAvatar,.profileAvatar,.profilePhoto').forEach(makeCircle);

    /* Some Find Freelancer cards render the initials in an unclassified wide element.
       Only correct wide, short initials inside this page, leaving all other UI untouched. */
    root.querySelectorAll('*').forEach(node=>{
      if(node.children.length!==0) return;
      const txt=(node.textContent||'').trim();
      if(!/^[A-Za-z]{1,3}$/.test(txt)) return;
      const rect=node.getBoundingClientRect();
      if(rect.height<40 || rect.height>220 || rect.width<rect.height*1.35) return;
      const parent=node.parentElement;
      if(!parent) return;
      const pr=parent.getBoundingClientRect();
      if(pr.height<40 || pr.height>240 || pr.width<pr.height*1.35) return;
      makeCircle(parent);
    });
  }

  ready(install);
  ready(function(){
    enforceHomepagePeople();
    enforceFindFreelancerAvatars();
    const observer=new MutationObserver(function(){enforceHomepagePeople();enforceFindFreelancerAvatars();});
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',function(){enforceHomepagePeople();enforceFindFreelancerAvatars();},{passive:true});
  });
  const oldRender=window.render;
  if(typeof oldRender==='function') window.render=function(){const result=oldRender.apply(this,arguments);setTimeout(install,0);setTimeout(install,80);setTimeout(enforceHomepagePeople,0);setTimeout(enforceHomepagePeople,120);setTimeout(enforceFindFreelancerAvatars,0);setTimeout(enforceFindFreelancerAvatars,120);return result;};
  window.addEventListener('resize',()=>setTimeout(install,0),{passive:true});
})();
