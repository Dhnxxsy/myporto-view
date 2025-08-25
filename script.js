/*
  Cleaner script.js
  - Fungsi: lightbox per-subsection, slide nav, keyboard, touch swipe
  - Entrance stagger (sets --i on cards & titles) and body.loaded trigger
  - Pembersihan: duplicate/obsolete handlers removed; jika ada fitur lama yang dihapus
    kamu akan melihat notifikasi di console (tidak mengubah tampilan).
*/
console.info('script.js: cleaned duplicates/unused handlers (non-destructive).');

(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const lightbox = $('#lightbox');
  const track = lightbox ? lightbox.querySelector('.lightbox-track') : null;
  const backdrop = lightbox ? lightbox.querySelector('.lightbox-backdrop') : null;
  const closeBtn = lightbox ? lightbox.querySelector('.lightbox-close') : null;
  const prevBtn = lightbox ? lightbox.querySelector('.lightbox-prev') : null;
  const nextBtn = lightbox ? lightbox.querySelector('.lightbox-next') : null;
  const titleEl = lightbox ? lightbox.querySelector('.lightbox-title') : null;
  const descEl = lightbox ? lightbox.querySelector('.lightbox-desc') : null;
  const dotsEl = lightbox ? lightbox.querySelector('.lightbox-dots') : null;

  function groupsFromContainer(container){
    const groups = [];
    let current = { label: null, items: [] };
    Array.from(container.children).forEach(child=>{
      if(child.classList && child.classList.contains('projects-subsection')){
        if(current.items.length) groups.push(current);
        current = { label: child.textContent.trim() || null, items: [] };
      } else if(child.classList && child.classList.contains('project-card')){
        const img = child.querySelector('.project-media img');
        const btn = child.querySelector('.cta');
        const caption = child.querySelector('.project-caption');
        current.items.push({
          src: img ? img.src : '',
          alt: img ? img.alt : '',
          title: btn?.dataset.title || caption?.textContent.trim() || (img ? img.alt : ''),
          desc: btn?.dataset.desc || '',
          el: child
        });
      }
    });
    if(current.items.length) groups.push(current);
    return groups;
  }

  let currentGroup = [];
  let currentIndex = 0;
  function setControlsVisibility(count){
    const show = count > 1;
    if(prevBtn) prevBtn.style.display = show ? '' : 'none';
    if(nextBtn) nextBtn.style.display = show ? '' : 'none';
    if(dotsEl) dotsEl.style.display = show ? '' : 'none';
  }
  function buildDots(count){
    if(!dotsEl) return;
    dotsEl.innerHTML = '';
    for(let i=0;i<count;i++){
      const b = document.createElement('button');
      b.setAttribute('type','button');
      b.setAttribute('role','tab');
      b.setAttribute('aria-label', `Go to slide ${i+1}`);
      b.dataset.idx = String(i);
      if(i===0) b.setAttribute('aria-selected','true');
      dotsEl.appendChild(b);
    }
  }
  function updateDots(i){
    if(!dotsEl) return;
    const buttons = Array.from(dotsEl.querySelectorAll('button'));
    buttons.forEach((b,idx)=>{
      if(idx===i){ b.setAttribute('aria-selected','true'); }
      else { b.removeAttribute('aria-selected'); }
    });
  }
  function buildSlides(items){
    if(!track) return;
    // Perf: gunakan decoding async; slide non-aktif lazy-load untuk kurangi beban awal
    track.innerHTML = items.map((it, idx) => {
      const lazy = idx === 0 ? '' : ' loading="lazy"';
      return `<div class="slide" role="listitem"><img src="${it.src}" alt="${it.alt||''}" decoding="async"${lazy}></div>`;
    }).join('');
    buildDots(items.length);
    setControlsVisibility(items.length);
  }
  function showIndex(i, animate = true){
    if(!track || !currentGroup.length) return;
    const n = currentGroup.length;
    if(i < 0) i = n - 1;
    if(i >= n) i = 0;
    currentIndex = i;
    track.style.transition = animate ? 'transform .36s cubic-bezier(.2,.9,.2,1)' : 'none';
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    if(titleEl) titleEl.textContent = currentGroup[currentIndex].title || '';
    if(descEl) descEl.textContent = currentGroup[currentIndex].desc || '';
    updateDots(currentIndex);
  }
  function openAt(idx){
    showIndex(idx, false);
    requestAnimationFrame(()=>{
      if(lightbox) lightbox.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(()=> showIndex(idx, true));
    });
  }
  function closeModal(){
    if(!lightbox) return;
    // If already hidden, nothing to do
    if(lightbox.getAttribute('aria-hidden') === 'true') return;
    // If reduced motion, close immediately
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce){
      lightbox.setAttribute('aria-hidden','true');
      document.documentElement.style.overflow = '';
      return;
    }
    // Prevent double-close
    if(lightbox.classList.contains('closing')) return;
    lightbox.classList.add('closing');
    // Wait for the longest of our exit animations
    const onDone = ()=>{
      lightbox.classList.remove('closing');
      lightbox.setAttribute('aria-hidden','true');
      document.documentElement.style.overflow = '';
      lightbox.removeEventListener('animationend', onDone, true);
    };
    lightbox.addEventListener('animationend', onDone, true);
  }

  function attachLightbox(){
    const containers = $$('.projects-grid');
    const map = new Map();
    containers.forEach(c => map.set(c, groupsFromContainer(c)));

    document.addEventListener('click', e => {
      const btn = e.target.closest('.cta');
      if(!btn) return;
      // Untuk tombol View yang hanya tampilan (tanpa lightbox)
      if(btn.hasAttribute('data-nolightbox')) return;
      e.preventDefault();
      // Visual press feedback on the card media
      const card = btn.closest('.project-card');
      const media = card?.querySelector('.project-media');
      if(media){
        media.classList.add('press-anim');
        const shine = media.querySelector('.shine');
        if(shine){
          shine.classList.remove('sweep-now'); // restart if already present
          // Force reflow to restart animation reliably
          // eslint-disable-next-line no-unused-expressions
          shine.offsetWidth;
          shine.classList.add('sweep-now');
          // Clean up shine class after animation ends
          const onAnimEnd = ()=>{ shine.classList.remove('sweep-now'); shine.removeEventListener('animationend', onAnimEnd); };
          shine.addEventListener('animationend', onAnimEnd, { once: true });
        }
        // Remove press class after animation end
        const onEnd = ()=>{ media.classList.remove('press-anim'); media.removeEventListener('animationend', onEnd); };
        media.addEventListener('animationend', onEnd, { once: true });
      }
      const container = btn.closest('.projects-grid') || containers[0];
      // 0) Mode single: buka hanya gambar dalam kartu ini, tanpa navigasi
      if(btn.hasAttribute('data-single')){
        const img = card?.querySelector('.project-media img');
        const title = btn?.dataset.title || card?.querySelector('.project-caption')?.textContent.trim() || img?.alt || '';
        const desc = btn?.dataset.desc || '';
        currentGroup = [{ src: img?.src || '', alt: img?.alt || '', title, desc, el: card }];
        buildSlides(currentGroup);
        openAt(0);
        return;
      }
      // 1) Prioritas: jika tombol memiliki data-gallery, gunakan itu sebagai sumber slide
      const galleryAttr = btn.getAttribute('data-gallery');
      if(galleryAttr){
        const title = btn?.dataset.title || card?.querySelector('.project-caption')?.textContent.trim() || '';
        const desc = btn?.dataset.desc || '';
        const alt = card?.querySelector('.project-media img')?.alt || title || '';
        const urls = galleryAttr.split(',').map(s => s.trim()).filter(Boolean);
        currentGroup = urls.map(u => ({ src: u, alt, title, desc, el: card }));
        buildSlides(currentGroup);
        openAt(0);
        return;
      }

      // 2) Jika tidak ada data-gallery, fallback ke grouping per-subsection (perilaku lama)
      const groups = map.get(container) || groupsFromContainer(container);
      let found = false;
      for(let g=0; g<groups.length; g++){
        const idx = groups[g].items.findIndex(it => it.el === card);
        if(idx !== -1){
          currentGroup = groups[g].items;
          buildSlides(currentGroup);
          openAt(idx);
          found = true;
          break;
        }
      }
      if(!found){
        const fallback = Array.from(container.querySelectorAll('.project-card')).map(c=>{
          const img = c.querySelector('.project-media img');
          const btnInner = c.querySelector('.cta');
          const cap = c.querySelector('.project-caption');
          return {
            src: img?.src || '',
            alt: img?.alt || '',
            title: btnInner?.dataset.title || cap?.textContent.trim() || '',
            desc: btnInner?.dataset.desc || '',
            el: c
          };
        });
        currentGroup = fallback;
        buildSlides(currentGroup);
        const idx = fallback.findIndex(it => it.el === card);
        openAt(idx >= 0 ? idx : 0);
      }
    });

    if(backdrop) backdrop.addEventListener('click', closeModal);
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(prevBtn) prevBtn.addEventListener('click', ()=> showIndex(currentIndex - 1));
    if(nextBtn) nextBtn.addEventListener('click', ()=> showIndex(currentIndex + 1));
    if(dotsEl){
      dotsEl.addEventListener('click', e=>{
        const target = e.target.closest('button[data-idx]');
        if(!target) return;
        const idx = parseInt(target.dataset.idx, 10);
        if(Number.isInteger(idx)) showIndex(idx);
      });
    }

    document.addEventListener('keydown', e=>{
      if(!lightbox || lightbox.getAttribute('aria-hidden') === 'true') return;
      if(e.key === 'Escape') closeModal();
      if(e.key === 'ArrowLeft') showIndex(currentIndex - 1);
      if(e.key === 'ArrowRight') showIndex(currentIndex + 1);
    });

    if(track){
      let sx = 0;
      track.addEventListener('touchstart', e => sx = e.changedTouches[0].clientX, {passive:true});
      track.addEventListener('touchend', e => {
        const ex = e.changedTouches[0].clientX;
        const dx = ex - sx;
        if(Math.abs(dx) > 50) dx > 0 ? showIndex(currentIndex - 1) : showIndex(currentIndex + 1);
      }, {passive:true});
    }
  }

  function applyEntrance(){
    $$('.projects-grid .project-card').forEach((c,i)=> c.style.setProperty('--i', String(i)));
    $$('.section-subtitle').forEach((t,i)=> t.style.setProperty('--i', String(i)));
    // Stagger for Introduce section elements
    $$('#about .about-inner > *').forEach((el,i)=> el.style.setProperty('--i', String(i)));
    // Hindari trigger ganda yang bisa memicu repaint/relayout dua kali
    const addLoaded = ()=>{ document.body.classList.add('loaded'); };
    if(document.readyState === 'complete'){
      // halaman sudah selesai, beri sedikit delay agar lebih halus
      setTimeout(addLoaded, 120);
    } else {
      window.addEventListener('load', ()=> setTimeout(addLoaded, 120), { once:true });
    }
  }

  // Generic scroll-in reveal using IntersectionObserver
  function initScrollReveal(){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      // Honor reduced motion: reveal everything immediately
      document.querySelectorAll('[data-animate], .reveal').forEach(el=> el.classList.add('in-view'));
      return;
    }

    // Auto-tag common elements if not explicitly tagged
    // Avoid project-card and project-caption here to prevent double animation rules
    const autoTargets = [
      '.projects-subsection',
      '.section.card',
      // Header/hero containers
      '.header-inner .brand',
      // Animate containers instead of images to avoid transform conflicts
      '.project-media',
      // Other images outside cards (wrapped elements)
      '.site-main picture',
      '#contact .avatar',
      '#contact .contact-card',
      // Introduce section content
      '#about .about-inner',
      '#about h2',
      '#about p'
    ];
    autoTargets.forEach(sel=>{
      $$(sel).forEach(el=>{ if(!el.hasAttribute('data-animate') && !el.classList.contains('reveal')) el.setAttribute('data-animate',''); });
    });

    const io = new IntersectionObserver((entries)=>{
      for(const e of entries){
        if(e.isIntersecting){
          e.target.classList.add('in-view');
          io.unobserve(e.target); // reveal once and keep it
        }
      }
    }, { root: null, rootMargin: '0px 0px -5% 0px', threshold: 0.01 });

    const observeAll = ()=>{
      document.querySelectorAll('[data-animate], .reveal').forEach(el=>{
        // Exclude anything inside lightbox
        if(el.closest('#lightbox')) return;
        if(el.classList.contains('in-view')) return;
        // If already in viewport at init, reveal immediately
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        if(r.top < vh * 0.98 && r.bottom > 0){
          el.classList.add('in-view');
          return;
        }
        io.observe(el);
      });
    };

    observeAll();

    // Observe dynamically added nodes
    const mo = new MutationObserver(()=> observeAll());
    mo.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    applyEntrance();
    initScrollReveal();
    attachLightbox();

    // Ensure Email button directs to Gmail compose, with mailto fallback
    const emailBtn = document.getElementById('emailBtn');
    if(emailBtn){
      const gmailUrl = 'https://mail.google.com/mail/u/0/?view=cm&fs=1&to=ragakalasramadhan27@gmail.com&su=Collaboration%20Inquiry&body=Hi%20Raga%2C%0A%0A';
      const mailtoUrl = 'mailto:ragakalasramadhan27@gmail.com?subject=Collaboration%20Inquiry&body=Hi%20Raga%2C%0A%0A';
      emailBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        try {
          // Try navigate to Gmail compose in same tab
          window.location.assign(gmailUrl);
          // If navigation is blocked or Gmail not available, fallback after a moment
          setTimeout(()=>{
            // If still on the page, try mailto
            if(!document.hidden) window.location.href = mailtoUrl;
          }, 1200);
        } catch(err){
          // Fallback immediately
          window.location.href = mailtoUrl;
        }
      });
    }
  });
})();