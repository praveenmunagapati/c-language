// ═══════════════════════════════════════════════════
// C PROGRAMMING MASTERCLASS — Engine v2
// Auto syntax highlighting, navigation, interactions
// ═══════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Syntax Highlighter ───
  function highlightC(code) {
    // Escape HTML first
    let text = code;
    // Process in order: comments first, then strings, then the rest
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      // Single-line comment
      if (text[i] === '/' && text[i+1] === '/') {
        let end = text.indexOf('\n', i);
        if (end === -1) end = text.length;
        tokens.push({ type: 'cmt', val: text.slice(i, end) });
        i = end;
      }
      // Multi-line comment
      else if (text[i] === '/' && text[i+1] === '*') {
        let end = text.indexOf('*/', i + 2);
        if (end === -1) end = text.length; else end += 2;
        tokens.push({ type: 'cmt', val: text.slice(i, end) });
        i = end;
      }
      // String
      else if (text[i] === '"') {
        let end = i + 1;
        while (end < text.length && text[end] !== '"') {
          if (text[end] === '\\') end++;
          end++;
        }
        end++;
        tokens.push({ type: 'str', val: text.slice(i, end) });
        i = end;
      }
      // Char
      else if (text[i] === "'" && (i === 0 || /[\s,;({\[=!<>+\-*/%&|^~?:]/.test(text[i-1]))) {
        let end = i + 1;
        while (end < text.length && text[end] !== "'") {
          if (text[end] === '\\') end++;
          end++;
        }
        end++;
        tokens.push({ type: 'str', val: text.slice(i, end) });
        i = end;
      }
      // Preprocessor
      else if (text[i] === '#' && (i === 0 || text[i-1] === '\n')) {
        let end = i;
        while (end < text.length && text[end] !== '\n') {
          if (text[end] === '\\' && text[end+1] === '\n') end += 2;
          else end++;
        }
        tokens.push({ type: 'pp', val: text.slice(i, end) });
        i = end;
      }
      // Number
      else if (/[0-9]/.test(text[i]) && (i === 0 || /[\s,;({\[=!<>+\-*/%&|^~?:]/.test(text[i-1]))) {
        let end = i;
        while (end < text.length && /[0-9.xXa-fA-FLlUu]/.test(text[end])) end++;
        tokens.push({ type: 'num', val: text.slice(i, end) });
        i = end;
      }
      // Word (keyword/type/function/identifier)
      else if (/[a-zA-Z_]/.test(text[i])) {
        let end = i;
        while (end < text.length && /[a-zA-Z0-9_]/.test(text[end])) end++;
        const word = text.slice(i, end);
        // Check if followed by ( → function
        let afterSpaces = end;
        while (afterSpaces < text.length && text[afterSpaces] === ' ') afterSpaces++;
        
        const keywords = ['if','else','for','while','do','switch','case','default','break','continue','return','goto','sizeof','typedef','struct','union','enum','const','volatile','static','extern','register','auto','inline','signed','unsigned','restrict'];
        const types = ['int','char','float','double','void','short','long','FILE','NULL','size_t','bool','true','false'];
        
        if (keywords.includes(word)) tokens.push({ type: 'kw', val: word });
        else if (types.includes(word)) tokens.push({ type: 'type', val: word });
        else if (text[afterSpaces] === '(') tokens.push({ type: 'fn', val: word });
        else if (word === word.toUpperCase() && word.length > 1 && /[A-Z]/.test(word[0])) tokens.push({ type: 'pp', val: word }); // MACRO
        else tokens.push({ type: 'id', val: word });
        i = end;
      }
      else {
        tokens.push({ type: 'plain', val: text[i] });
        i++;
      }
    }
    
    // Build highlighted HTML
    return tokens.map(t => {
      const escaped = t.val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      switch(t.type) {
        case 'kw': return `<span class="hl-kw">${escaped}</span>`;
        case 'type': return `<span class="hl-type">${escaped}</span>`;
        case 'fn': return `<span class="hl-fn">${escaped}</span>`;
        case 'str': return `<span class="hl-str">${escaped}</span>`;
        case 'num': return `<span class="hl-num">${escaped}</span>`;
        case 'cmt': return `<span class="hl-cmt">${escaped}</span>`;
        case 'pp': return `<span class="hl-pp">${escaped}</span>`;
        default: return escaped;
      }
    }).join('');
  }

  // Apply highlighting to all code blocks
  function highlightAll() {
    document.querySelectorAll('.code-body pre').forEach(pre => {
      if (pre.dataset.highlighted) return;
      const raw = pre.textContent;
      pre.innerHTML = highlightC(raw);
      pre.dataset.highlighted = '1';
    });
  }

  // ─── State ───
  const state = { currentSlide: 0, totalSlides: 0, isTransitioning: false, tocOpen: false };

  // ─── DOM ───
  const slides = document.querySelectorAll('.slide');
  const progressBar = document.getElementById('progressBar');
  const slideInfo = document.getElementById('slideInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const tocBtn = document.getElementById('tocBtn');
  const tocOverlay = document.getElementById('tocOverlay');
  const tocClose = document.getElementById('tocClose');
  const tocList = document.getElementById('tocList');

  state.totalSlides = slides.length;

  // ─── TOC ───
  function buildTOC() {
    tocList.innerHTML = '';
    slides.forEach((slide, index) => {
      const title = slide.getAttribute('data-title') || `Slide ${index + 1}`;
      const isPart = slide.querySelector('.part-divider') !== null;
      const li = document.createElement('li');
      li.className = `toc-item${index === state.currentSlide ? ' active' : ''}${isPart ? ' part-entry' : ''}`;
      li.innerHTML = `<span class="toc-item-num">${index + 1}</span><span class="toc-item-title">${title}</span>`;
      li.addEventListener('click', () => { goToSlide(index); closeTOC(); });
      tocList.appendChild(li);
    });
  }

  // ─── Navigation ───
  function goToSlide(index) {
    if (state.isTransitioning) return;
    if (index === state.currentSlide) return;
    if (index < 0 || index >= state.totalSlides) return;

    state.isTransitioning = true;
    const forward = index > state.currentSlide;
    const curr = slides[state.currentSlide];
    const next = slides[index];

    // Hide current
    curr.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    curr.style.opacity = '0';
    curr.style.transform = forward ? 'translateX(-40px)' : 'translateX(40px)';

    // Prepare next
    next.style.transition = 'none';
    next.style.transform = forward ? 'translateX(40px)' : 'translateX(-40px)';
    next.style.opacity = '0';
    next.style.visibility = 'visible';

    // Small delay then animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        next.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        next.classList.add('active');
        next.style.opacity = '1';
        next.style.transform = 'translateX(0)';
      });
    });

    setTimeout(() => {
      curr.classList.remove('active');
      curr.style.visibility = 'hidden';
      curr.style.opacity = '';
      curr.style.transform = '';
      curr.style.transition = '';
      state.isTransitioning = false;
    }, 450);

    state.currentSlide = index;
    updateUI();
    next.scrollTop = 0;
  }

  function nextSlide() {
    if (state.currentSlide < state.totalSlides - 1) goToSlide(state.currentSlide + 1);
  }
  function prevSlide() {
    if (state.currentSlide > 0) goToSlide(state.currentSlide - 1);
  }
  window.nextSlide = nextSlide;

  // ─── UI ───
  function updateUI() {
    const progress = ((state.currentSlide + 1) / state.totalSlides) * 100;
    progressBar.style.width = progress + '%';
    slideInfo.textContent = `${state.currentSlide + 1} / ${state.totalSlides}`;
    prevBtn.style.opacity = state.currentSlide === 0 ? '0.3' : '1';
    prevBtn.style.pointerEvents = state.currentSlide === 0 ? 'none' : 'auto';
    nextBtn.style.opacity = state.currentSlide === state.totalSlides - 1 ? '0.3' : '1';
    nextBtn.style.pointerEvents = state.currentSlide === state.totalSlides - 1 ? 'none' : 'auto';
    // Update TOC
    tocList.querySelectorAll('.toc-item').forEach((item, i) => {
      item.classList.toggle('active', i === state.currentSlide);
    });
  }

  // ─── TOC Modal ───
  function openTOC() {
    state.tocOpen = true;
    tocOverlay.classList.add('open');
    setTimeout(() => {
      const a = tocList.querySelector('.toc-item.active');
      if (a) a.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 200);
  }
  function closeTOC() {
    state.tocOpen = false;
    tocOverlay.classList.remove('open');
  }

  // ─── Fullscreen ───
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  // ─── Event Listeners ───
  document.addEventListener('keydown', (e) => {
    if (state.tocOpen) { if (e.key === 'Escape') closeTOC(); return; }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': e.preventDefault(); nextSlide(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': e.preventDefault(); prevSlide(); break;
      case 'Home': e.preventDefault(); goToSlide(0); break;
      case 'End': e.preventDefault(); goToSlide(state.totalSlides - 1); break;
      case 'f': case 'F': e.preventDefault(); toggleFullscreen(); break;
      case 'Escape': if (document.fullscreenElement) document.exitFullscreen(); break;
      case 't': case 'T': e.preventDefault(); openTOC(); break;
    }
  });

  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  tocBtn.addEventListener('click', openTOC);
  tocClose.addEventListener('click', closeTOC);
  tocOverlay.addEventListener('click', (e) => { if (e.target === tocOverlay) closeTOC(); });

  // Touch/Swipe
  let touchStartX = 0;
  document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(dx) > 60) { dx > 0 ? prevSlide() : nextSlide(); }
  }, { passive: true });

  // Fullscreen change
  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? '⊡' : '⛶';
  });

  // ─── Reveal Answers ───
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('reveal-btn') || e.target.closest('.reveal-btn')) {
      const btn = e.target.classList.contains('reveal-btn') ? e.target : e.target.closest('.reveal-btn');
      const content = btn.nextElementSibling;
      if (content && content.classList.contains('reveal-content')) {
        content.classList.toggle('show');
        btn.textContent = content.classList.contains('show') ? '🔽 Hide Answer' : '👉 Show Answer';
      }
    }
  });

  // ─── Init ───
  highlightAll();
  buildTOC();
  updateUI();

  // Fade in
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';
  const ready = () => { document.body.style.opacity = '1'; };
  if (document.readyState === 'complete') ready();
  else window.addEventListener('load', ready);

})();
