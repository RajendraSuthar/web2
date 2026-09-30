  document.querySelector('.menu-btn')?.addEventListener('click',()=>{
    const l=document.querySelector('.nav-links');
    const open=l.style.display==='flex';
    l.style.cssText=open?'':'display:flex;position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:flex-start;background:#141b30;padding:22px 26px;gap:18px;border-bottom:1px solid rgba(59,130,246,.2);z-index:99';
  });
