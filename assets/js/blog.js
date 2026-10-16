  document.querySelector('.menu-btn')?.addEventListener('click',()=>{
    const l=document.querySelector('.nav-links');
    const open=l.style.display==='flex';
    l.style.cssText=open?'':'display:flex;position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:flex-start;background:#141b30;padding:22px 26px;gap:18px;border-bottom:1px solid rgba(59,130,246,.2);z-index:99';
  });

  // Solutions menu: with a mouse it opens on hover and "Solutions" goes to the home-page section;
  // in the ☰ menu and on touch screens a tap on "Solutions" opens and closes the list instead
  document.querySelectorAll('.drop-toggle').forEach(t=>{
    t.addEventListener('click',e=>{
      if(!matchMedia('(max-width:1180px), (hover:none)').matches) return;
      e.preventDefault();
      t.setAttribute('aria-expanded',t.parentElement.classList.toggle('open'));
    });
  });
  document.addEventListener('click',e=>{
    document.querySelectorAll('.has-drop.open').forEach(d=>{
      if(d.contains(e.target)) return;
      d.classList.remove('open');
      d.querySelector('.drop-toggle').setAttribute('aria-expanded','false');
    });
  });

  // Video thumbnails: hide the cover and play on click, bring it back when the video ends
  document.querySelectorAll('.video-cover').forEach(btn=>{
    const media=btn.closest('.update-media'), video=media.querySelector('video');
    btn.addEventListener('click',()=>{media.classList.add('playing');video.play();});
    video.addEventListener('ended',()=>media.classList.remove('playing'));
  });

  // SEO URLs are written relative in the HTML — resolve them against the current domain (local, staging or live)
  const abs=u=>new URL(u,location.href).href;
  document.querySelectorAll('link[rel="canonical"],meta[property="og:url"],meta[property="og:image"],meta[name="twitter:image"]').forEach(el=>{
    const attr=el.hasAttribute('href')?'href':'content';
    el.setAttribute(attr,abs(el.getAttribute(attr)));
  });
  document.querySelectorAll('script[type="application/ld+json"]').forEach(el=>{
    el.textContent=JSON.stringify(JSON.parse(el.textContent),(k,v)=>['url','logo','image','mainEntityOfPage','item'].includes(k)&&typeof v==='string'?abs(v):v,2);
  });
