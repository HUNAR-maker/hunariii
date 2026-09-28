/* HUNAR profile menu fix - isolated UI layer only.
   Keeps the existing application/navigation/auth code untouched. */
(function(){
  'use strict';
  var MENU_ID='hunar-profile-menu-portal';
  var STYLE_ID='hunar-profile-menu-portal-style';

  function closeMenu(){
    var m=document.getElementById(MENU_ID);
    if(m)m.remove();
    document.removeEventListener('click',outside,true);
    window.removeEventListener('resize',reposition);
    window.removeEventListener('scroll',reposition,true);
  }

  function outside(e){
    var m=document.getElementById(MENU_ID);
    var t=e.target;
    if(m && !m.contains(t) && !t.closest('.profileTrigger')) closeMenu();
  }

  function reposition(){
    var m=document.getElementById(MENU_ID), b=document.querySelector('.profileTrigger');
    if(!m||!b)return;
    var r=b.getBoundingClientRect();
    var w=Math.min(250,window.innerWidth-20);
    m.style.width=w+'px';
    var left=Math.max(10,Math.min(r.right-w,window.innerWidth-w-10));
    var top=r.bottom+8;
    if(top+300>window.innerHeight)top=Math.max(10,r.top-308);
    m.style.left=left+'px';
    m.style.top=top+'px';
  }

  function accountInfo(){
    var user=window.me||null;
    var profile=null;
    try{ if(typeof window.currentProfile==='function') profile=window.currentProfile()||null; }catch(e){}
    try{
      if(!profile && window.S && Array.isArray(window.S.profiles) && user){
        profile=window.S.profiles.find(function(x){return String(x.id)===String(user.id)})||null;
      }
    }catch(e){}
    try{
      if(!profile && window.S && Array.isArray(window.S.users) && user){
        profile=window.S.users.find(function(x){return String(x.id)===String(user.id)})||null;
      }
    }catch(e){}
    var name=(profile&&(profile.n||profile.name||profile.full_name))||(user&&(user.n||user.name||user.full_name))||(user&&user.email)||'HUNAR Account';
    var role=user&&user.role==='freelancer'?'Freelancer':user&&user.role==='client'?'Client':'';
    return {name:String(name),role:role};
  }

  function goRoute(route){
    closeMenu();
    if(typeof window.go==='function')window.go(route);
  }

  function openMenu(e){
    if(e){e.preventDefault();e.stopImmediatePropagation();}
    closeMenu();
    var b=document.querySelector('.profileTrigger');
    if(!b)return;
    var info=accountInfo();

    var m=document.createElement('div');
    m.id=MENU_ID;
    m.setAttribute('role','menu');
    m.setAttribute('aria-label','HUNAR profile menu');
    m.innerHTML='<div class="hpm-head"><strong>'+escapeHtml(info.name)+'</strong>'+ (info.role?'<span>'+info.role+'</span>':'') +'</div>'+ 
      '<button type="button" data-route="profile">Profile</button>'+ 
      '<button type="button" data-route="performance">Performance</button>'+ 
      '<button type="button" data-route="identity-verification">Identity Verification</button>'+ 
      '<button type="button" data-route="help">Help / Support</button>'+ 
      '<button type="button" data-route="settings">Settings</button>'+ 
      '<button type="button" data-route="account">Account</button>'+ 
      '<button type="button" class="hpm-logout" data-logout="1">Log Out</button>';
    document.body.appendChild(m);

    m.querySelectorAll('button[data-route]').forEach(function(x){
      x.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();goRoute(x.getAttribute('data-route'));});
    });
    m.querySelector('[data-logout]').addEventListener('click',function(ev){
      ev.preventDefault();ev.stopPropagation();closeMenu();
      if(typeof window.logout==='function')window.logout();
    });

    reposition();
    document.addEventListener('click',outside,true);
    window.addEventListener('resize',reposition);
    window.addEventListener('scroll',reposition,true);
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch];});
  }

  function install(){
    if(!document.getElementById(STYLE_ID)){
      var st=document.createElement('style');
      st.id=STYLE_ID;
      st.textContent='#'+MENU_ID+'{position:fixed!important;display:block!important;visibility:visible!important;opacity:1!important;z-index:2147483647!important;background:#fff!important;color:#14221b!important;border:1px solid #dfe7e2!important;border-radius:14px!important;box-shadow:0 18px 55px rgba(20,34,27,.18)!important;padding:7px!important;font-family:"Plus Jakarta Sans","Noto Sans Ethiopic",system-ui,sans-serif!important;pointer-events:auto!important}#'+MENU_ID+' .hpm-head{padding:10px 11px 8px;border-bottom:1px solid #edf1ee;margin-bottom:4px}#'+MENU_ID+' .hpm-head strong{display:block;font-size:13px}#'+MENU_ID+' .hpm-head span{display:block;font-size:10px;color:#66736d;margin-top:2px}#'+MENU_ID+' button{display:block!important;visibility:visible!important;opacity:1!important;width:100%!important;text-align:left!important;background:transparent!important;color:#14221b!important;border:0!important;border-radius:9px!important;padding:10px 11px!important;font-size:13px!important;font-weight:700!important;cursor:pointer!important}#'+MENU_ID+' button:hover{background:#edf5f0!important}#'+MENU_ID+' .hpm-logout{color:#b54747!important;border-top:1px solid #edf1ee!important;margin-top:4px!important;border-radius:0 0 9px 9px!important}';
      document.head.appendChild(st);
    }
    document.removeEventListener('click',capture,true);
    document.addEventListener('click',capture,true);
  }

  function capture(e){
    var t=e.target&&e.target.closest?e.target.closest('.profileTrigger'):null;
    if(t){openMenu(e);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();

/* Targeted marketplace/back-button visual correction only. */
(function(){
  'use strict';
  var STYLE_ID='hunar-marketplace-back-fix-style';
  function apply(){
    var app=document.getElementById('app');
    if(!app)return;
    var bars=[].slice.call(app.querySelectorAll(':scope > .backBar'));
    bars.slice(1).forEach(function(x){x.remove();});
    var bar=bars[0]||app.querySelector(':scope > .backBar');
    var page=bar&&bar.nextElementSibling;
    if(bar){bar.classList.toggle('marketBackBar',!!(page&&page.classList.contains('marketPage')));}
    var backs=[].slice.call(app.querySelectorAll('button')).filter(function(b){return String(b.textContent||'').trim()==='← Back';});
    if(backs.length>1){
      backs.slice(1).forEach(function(b){
        var holder=b.closest('.backBar');
        if(holder && holder!==bar) holder.remove(); else if(!holder)b.remove();
      });
    }
  }
  function install(){
    if(!document.getElementById(STYLE_ID)){
      var st=document.createElement('style');
      st.id=STYLE_ID;
      st.textContent=`
        .marketBackBar{max-width:none!important;margin:0!important;padding:12px max(18px,calc((100vw - 1240px)/2 + 22px)) 12px!important;background:linear-gradient(135deg,#101510,#172019 58%,#202b21)!important;}
        .marketBackBar .btn{background:#a6dc69!important;color:#172019!important;border-color:#a6dc69!important;box-shadow:0 5px 0 rgba(8,15,10,.55),0 12px 26px rgba(0,0,0,.18)!important;border-radius:12px!important;font-weight:900!important;}
        .marketBackBar .btn:hover{background:#b8e982!important;border-color:#b8e982!important;color:#172019!important;}
        @media(max-width:700px){
          .marketBackBar{padding:9px 14px!important;}
          .marketBackBar .btn{padding:9px 13px!important;font-size:13px!important;border-radius:10px!important;}
          .mkHeroScene{height:172px!important;min-height:172px!important;margin:0 auto!important;transform:none!important;}
          .mkOrb{width:74px!important;height:74px!important;box-shadow:inset -10px -12px 22px rgba(0,0,0,.38),0 16px 38px rgba(0,0,0,.28)!important;animation:mkFloat 4.5s ease-in-out infinite,marketOrbTilt 7s ease-in-out infinite!important;transform-style:preserve-3d!important;}
          .mkOrb b{font-size:27px!important;}
          .mkOrb:before{inset:9px!important;}
          .mkOrb i{width:7px!important;height:7px!important;right:12px!important;top:12px!important;}
          .mkOrbit.o1{width:122px!important;height:122px!important;animation-duration:10s!important;}
          .mkOrbit.o2{width:156px!important;height:78px!important;animation-duration:13s!important;}
          .mkOrbit.o3{width:190px!important;height:190px!important;opacity:.42!important;animation-duration:17s!important;}
          .mkParticle{width:4px!important;height:4px!important;}
          .mkParticle.p1{left:18%!important;top:29%!important}.mkParticle.p2{right:17%!important;top:31%!important}.mkParticle.p3{left:28%!important;bottom:19%!important}.mkParticle.p4{right:27%!important;bottom:18%!important}
        }
        @keyframes marketOrbTilt{0%,100%{transform:rotateX(8deg) rotateY(-8deg) translateY(0)}50%{transform:rotateX(-7deg) rotateY(10deg) translateY(-4px)}}
      `;
      document.head.appendChild(st);
    }
    apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  var mo=new MutationObserver(apply);mo.observe(document.body,{childList:true,subtree:true});
})();
