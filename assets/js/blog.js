  document.querySelector('.menu-btn')?.addEventListener('click',()=>{
    const l=document.querySelector('.nav-links');
    const open=l.style.display==='flex';
    l.style.cssText=open?'':'display:flex;position:absolute;top:76px;left:0;right:0;flex-direction:column;background:#1a2340;padding:22px 26px;gap:18px;border-bottom:1px solid rgba(255,255,255,.08)';
  });
