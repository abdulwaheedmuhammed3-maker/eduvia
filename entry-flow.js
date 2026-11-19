/* Eduvia first-launch intro. Runs after the existing planner scripts are ready. */
(() => {
  const INTRO_KEY = 'eduvia-intro-complete-v1';
  const COUNTRY_KEY = 'eduvia-selected-country-v1';
  const root = document.getElementById('entryFlow');
  if (!root) return;

  const fallbackCountries = [
    'Australia','Benin','Botswana','Brazil','Canada','China','Egypt','France','Germany',
    'Ghana','India','Ireland','Italy','Japan','Kenya','Mauritius','Netherlands',
    'New Zealand','Nigeria','Portugal','Rwanda','Saudi Arabia','Senegal',
    'Sierra Leone','South Africa','Spain','Tanzania','Togo','Uganda',
    'United Arab Emirates','United Kingdom','United States','Zambia','Zimbabwe'
  ];

  const readProfileCountry = () => {
    try {
      if (typeof data !== 'undefined' && data.profile?.country) return String(data.profile.country);
    } catch {}
    try { return localStorage.getItem(COUNTRY_KEY) || ''; } catch { return ''; }
  };

  const countryOptions = () => {
    let countries = fallbackCountries;
    try {
      if (typeof STUDIO_COUNTRIES !== 'undefined' && Array.isArray(STUDIO_COUNTRIES) && STUDIO_COUNTRIES.length) {
        countries = STUDIO_COUNTRIES;
      }
    } catch {}
    return [...new Set(countries)].sort((a, b) => a.localeCompare(b));
  };

  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  let currentStep = 0;
  let selectedCountry = readProfileCountry();
  let startupTimer = null;

  const slides = [
    {
      key: 'welcome',
      kicker: 'WELCOME TO EDUVIA',
      title: 'Your smart study companion',
      copy: 'Keep your courses, classes, study materials and practice in one calm learning space.',
      action: 'Continue',
      art: 'books'
    },
    {
      key: 'learn',
      kicker: 'LEARN',
      title: 'Learn at your own pace',
      copy: 'Organise your real courses and timetable, then make space for focused study sessions.',
      action: 'Next',
      art: 'learn'
    },
    {
      key: 'practice',
      kicker: 'PRACTICE',
      title: 'Practice with purpose',
      copy: 'Use your course topics and learning materials to create practice that supports what you are studying.',
      action: 'Next',
      art: 'practice'
    },
    {
      key: 'progress',
      kicker: 'PROGRESS',
      title: 'See how far you have come',
      copy: 'Build a steady study habit, mark your sessions complete and celebrate consistent progress.',
      action: 'Choose country',
      art: 'progress'
    }
  ];

  function artwork(kind) {
    const svgStart = '<svg viewBox="0 0 200 170" role="img" aria-label="">';
    const end = '</svg>';
    const purple = '#9b72ff';
    const violet = '#7147d9';
    if (kind === 'books') return svgStart +
      '<ellipse cx="100" cy="145" rx="76" ry="11" fill="#080512" opacity=".55"/>' +
      '<path d="M35 109h117l-12 23H23z" fill="#4c2a9d"/><path d="M28 103h124l-10 20H20z" fill="#7950d4"/>' +
      '<path d="M42 77h108l-9 23H33z" fill="#2e1d5c"/><path d="M38 72h112l-8 19H30z" fill="#8f64ef"/>' +
      '<path d="m100 20 59 19-59 22-59-22z" fill="#a987ff"/>' +
      '<path d="M62 46v26c20 13 56 13 76 0V46L100 61z" fill="#5a34b5"/>' +
      '<path d="M158 39v34" stroke="#f7c46b" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M151 73h14l-7 13z" fill="#f7c46b"/>' +
      '<circle cx="100" cy="39" r="5" fill="#e8dfff"/>' + end;
    if (kind === 'learn') return svgStart +
      '<rect x="32" y="22" width="136" height="91" rx="12" fill="#3a286b" stroke="' + purple + '" stroke-width="5"/>' +
      '<rect x="41" y="31" width="118" height="72" rx="6" fill="#171027"/>' +
      '<circle cx="100" cy="67" r="22" fill="' + violet + '"/>' +
      '<path d="m94 54 21 13-21 13z" fill="#fff"/>' +
      '<path d="M19 122h162l-14 15H33z" fill="#8d65e8"/>' +
      '<path d="M72 126h56" stroke="#d8c8ff" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M82 141h36" stroke="#6e48c4" stroke-width="4" stroke-linecap="round"/>' + end;
    if (kind === 'practice') return svgStart +
      '<rect x="38" y="21" width="112" height="132" rx="13" transform="rotate(-6 38 21)" fill="#e9e1ff"/>' +
      '<path d="m57 56 9 9 17-20M54 91l9 9 17-20M51 126l9 9 17-20" fill="none" stroke="#38b98d" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M93 57h35M90 91h35M87 126h28" stroke="#8d7cae" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="m132 24 12 9-44 93-15 12 3-19z" fill="#9b72ff"/>' +
      '<path d="m85 138 15-12-13-6z" fill="#f4c46e"/>' + end;
    return svgStart +
      '<path d="M29 137h143" stroke="#6d5b91" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="42" y="91" width="25" height="46" rx="6" fill="#51318f"/>' +
      '<rect x="87" y="67" width="25" height="70" rx="6" fill="#7449cf"/>' +
      '<rect x="132" y="39" width="25" height="98" rx="6" fill="#9b72ff"/>' +
      '<path d="m43 78 39-19 24-3 42-34" fill="none" stroke="#c2a5ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="m133 22 18-3-4 18" fill="none" stroke="#c2a5ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="m143 10 6-6 6 6-6 6z" fill="#f4c46e"/>' + end;
  }

  function headerMarkup() {
    return '<header class="entry-flow-head"><div class="entry-flow-brand"><img src="icon.svg" alt="">Eduvia</div>' +
      '<button type="button" class="entry-flow-skip" data-flow-action="skip">Skip intro</button></header>';
  }

  function renderSlide() {
    const isCountry = currentStep === slides.length;
    if (isCountry) {
      const options = countryOptions().map(country =>
        '<option value="' + escapeHtml(country) + '"' + (selectedCountry === country ? ' selected' : '') + '>' +
        escapeHtml(country) + '</option>'
      ).join('');
      root.innerHTML = '<section class="entry-flow-card entry-flow-country-screen">' +
        headerMarkup() +
        '<div class="entry-flow-progress">' + slides.map((_, i) =>
          '<i class="' + (i <= currentStep - 1 ? 'is-active' : '') + '"></i>'
        ).join('') + '<i class="is-active"></i></div>' +
        '<main class="entry-flow-content">' +
          '<p class="entry-flow-kicker">ONE QUICK STEP</p>' +
          '<h1 class="entry-flow-title">Which country are you studying in?</h1>' +
          '<p class="entry-flow-copy">Choose your country so Eduvia can keep your study setup relevant. You can change it later in your study profile.</p>' +
          '<div class="entry-flow-country-wrap">' +
            '<label class="entry-flow-country-label" for="entryCountry">Select your country</label>' +
            '<select id="entryCountry" class="entry-flow-country" required>' +
              '<option value="">Choose your country</option>' + options +
            '</select>' +
            '<p class="entry-flow-country-hint">Only your country is requested here. No ethnicity or nickname fields.</p>' +
            '<p id="entryFlowError" class="entry-flow-error" role="alert"></p>' +
          '</div>' +
        '</main>' +
        '<footer class="entry-flow-footer">' +
          '<button type="button" class="entry-flow-primary" data-flow-action="finish">Continue to Eduvia <span aria-hidden="true">→</span></button>' +
          '<button type="button" class="entry-flow-back" data-flow-action="back">← Back</button>' +
          '<p class="entry-flow-privacy">Your planner and learning materials stay on this device.</p>' +
        '</footer></section>';
      const select = document.getElementById('entryCountry');
      if (select) select.value = selectedCountry;
      return;
    }

    const slide = slides[currentStep];
    root.innerHTML = '<section class="entry-flow-card">' + headerMarkup() +
      '<div class="entry-flow-progress">' + slides.map((_, i) =>
        '<i class="' + (i <= currentStep ? 'is-active' : '') + '"></i>'
      ).join('') + '</div>' +
      '<main class="entry-flow-content">' +
        '<div class="entry-flow-art">' + artwork(slide.art) + '</div>' +
        '<p class="entry-flow-kicker">' + slide.kicker + '</p>' +
        '<h1 class="entry-flow-title">' + slide.title + '</h1>' +
        '<p class="entry-flow-copy">' + slide.copy + '</p>' +
      '</main>' +
      '<footer class="entry-flow-footer">' +
        '<div class="entry-flow-dots" aria-label="Introduction page ' + (currentStep + 1) + ' of ' + (slides.length + 1) + '">' +
          slides.map((_, i) => '<i class="' + (i === currentStep ? 'is-active' : '') + '"></i>').join('') +
          '<i></i>' +
        '</div>' +
        '<button type="button" class="entry-flow-primary" data-flow-action="next">' + slide.action + ' <span aria-hidden="true">→</span></button>' +
        '<p class="entry-flow-privacy">A private, practical space for your learning.</p>' +
      '</footer></section>';
  }

  function completeFlow(country) {
    const chosen = String(country || selectedCountry || '').trim();
    if (!chosen) {
      const error = document.getElementById('entryFlowError');
      if (error) error.textContent = 'Please choose your country to continue.';
      return;
    }
    selectedCountry = chosen;
    try { localStorage.setItem(COUNTRY_KEY, chosen); } catch {}
    try { localStorage.setItem(INTRO_KEY, '1'); } catch {}
    try {
      if (typeof data !== 'undefined' && data.profile) {
        data.profile.country = chosen;
        if (typeof STORE_KEY !== 'undefined') localStorage.setItem(STORE_KEY, JSON.stringify(data));
      }
    } catch {}
    root.classList.add('is-leaving');
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof render === 'function') render();
    window.setTimeout(() => root.remove(), 430);
  }

  function dismissExistingUserSplash() {
    root.classList.add('is-leaving');
    window.setTimeout(() => root.remove(), 430);
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-flow-action]');
    if (!button) return;
    const action = button.dataset.flowAction;
    if (action === 'next') {
      if (currentStep < slides.length) currentStep += 1;
      renderSlide();
    } else if (action === 'skip') {
      if (selectedCountry) completeFlow(selectedCountry);
      else {
        currentStep = slides.length;
        renderSlide();
      }
    } else if (action === 'back') {
      currentStep = Math.max(0, currentStep - 1);
      renderSlide();
    } else if (action === 'finish') {
      const select = document.getElementById('entryCountry');
      completeFlow(select?.value || selectedCountry);
    }
  });

  root.addEventListener('change', event => {
    if (event.target?.id === 'entryCountry') selectedCountry = event.target.value;
  });

  startupTimer = window.setTimeout(() => {
    let hasCompleted = false;
    try { hasCompleted = localStorage.getItem(INTRO_KEY) === '1'; } catch {}
    if (hasCompleted) {
      dismissExistingUserSplash();
      return;
    }
    currentStep = 0;
    renderSlide();
  }, 950);

  window.addEventListener('pagehide', () => window.clearTimeout(startupTimer), { once: true });
})();
