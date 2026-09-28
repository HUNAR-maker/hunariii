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

  function goRoute(route){
    closeMenu();
    if(typeof window.go==='function')window.go(route);
  }

  function openMenu(e){
    if(e){e.preventDefault();e.stopImmediatePropagation();}
    closeMenu();
    var b=document.querySelector('.profileTrigger');
    if(!b)return;

    var m=document.createElement('div');
    m.id=MENU_ID;
    m.setAttribute('role','menu');
    m.setAttribute('aria-label','HUNAR profile menu');
    m.innerHTML='<div class="hpm-head"><strong>My HUNAR</strong><span>Account menu</span></div>'+
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
