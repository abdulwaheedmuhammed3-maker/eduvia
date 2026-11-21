/* Eduvia first-launch intro. Runs after the existing planner scripts are ready. */
(() => {
  const INTRO_KEY = 'eduvia-intro-complete-v2';
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

  function headerMarkup(showSkip = true) {
    return '<header class="entry-flow-head"><div class="entry-flow-brand"><img src="icon.svg" alt="">Eduvia</div>' +
      (showSkip ? '<button type="button" class="entry-flow-skip" data-flow-action="skip">Skip introduction</button>' : '') +
      '</header>';
  }

  function profileSetupMarkup() {
    const profile = typeof data !== 'undefined' && data.profile ? data.profile : {};
    const countries = countryOptions();
    const countryOptionsHtml = countries.map(country =>
      '<option value="' + escapeHtml(country) + '"' +
      ((profile.country || selectedCountry) === country ? ' selected' : '') + '>' +
      escapeHtml(country) + '</option>'
    ).join('');
    const stages = typeof educationStages === 'function'
      ? educationStages()
      : [['primary','Primary / elementary'],['secondary','Secondary / high school'],['college','College / polytechnic'],['undergraduate','University / undergraduate'],['postgraduate','Postgraduate'],['vocational','Vocational / professional training'],['other','Other / self-directed learning']];
    const stageOptions = stages.map(([value, label]) =>
      '<option value="' + escapeHtml(value) + '"' + (profile.stage === value ? ' selected' : '') + '>' +
      escapeHtml(label) + '</option>'
    ).join('');
    const statusOptions = ['Active','Inactive','Graduated','Deferred'].map(status =>
      '<option value="' + status + '"' + ((profile.studentStatus || 'Active') === status ? ' selected' : '') + '>' + status + '</option>'
    ).join('');
    const days = Array.isArray(profile.studyDays) ? profile.studyDays : [1,2,3,4,5,6];
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const field = (label, name, value, options = {}) => {
      const type = options.type || 'text';
      const required = options.required ? ' required' : '';
      const placeholder = options.placeholder ? ' placeholder="' + escapeHtml(options.placeholder) + '"' : '';
      const maxLength = options.maxLength ? ' maxlength="' + options.maxLength + '"' : '';
      const help = options.help ? '<small>' + options.help + '</small>' : '';
      const full = options.full ? ' entry-profile-field-full' : '';
      return '<label class="entry-profile-field' + full + '"><span>' + label +
        (options.required ? ' <i>Required</i>' : ' <small>Optional</small>') + '</span>' +
        '<input name="' + name + '" type="' + type + '" value="' + escapeHtml(value || '') + '"' +
        required + placeholder + maxLength + '>' + help + '</label>';
    };

    return '<section class="entry-flow-card entry-flow-profile-screen">' +
      headerMarkup(false) +
      '<div class="entry-flow-progress">' +
        slides.map(() => '<i class="is-active"></i>').join('') +
        '<i class="is-active"></i><i class="is-active"></i>' +
      '</div>' +
      '<main class="entry-flow-content entry-flow-profile-content">' +
        '<p class="entry-flow-kicker">YOUR STUDENT PROFILE</p>' +
        '<h1 class="entry-flow-title">Let’s complete your profile.</h1>' +
        '<p class="entry-flow-copy">Enter the details Eduvia needs to organise your courses, timetable and study plan. You can update them later in Student Profile.</p>' +
        '<form id="entryProfileForm" class="entry-profile-form">' +
          '<section class="entry-profile-section">' +
            '<h2>Personal and academic details</h2>' +
            '<p>These details help Eduvia identify your current learning programme.</p>' +
            '<div class="entry-profile-grid">' +
              '<label class="entry-profile-field"><span>Full name <i>Required</i></span><input name="name" type="text" required maxlength="60" autocomplete="name" value="' + escapeHtml(profile.name === 'Student' ? '' : profile.name || '') + '" placeholder="Your full name"></label>' +
              '<label class="entry-profile-field"><span>Country <i>Required</i></span><select name="country" required><option value="">Choose your country</option>' + countryOptionsHtml + '</select></label>' +
              '<label class="entry-profile-field"><span>School, university or provider <i>Required</i></span><input name="institution" type="text" required maxlength="100" value="' + escapeHtml(profile.institution || '') + '" placeholder="Your institution (or Independent learner)"></label>' +
              '<label class="entry-profile-field"><span>Learning stage <i>Required</i></span><select name="stage" required><option value="">Choose your learning stage</option>' + stageOptions + '</select></label>' +
              '<label class="entry-profile-field"><span>Programme, course or subject <i>Required</i></span><input name="degreeProgramme" type="text" required maxlength="120" value="' + escapeHtml(profile.degreeProgramme || profile.programme || '') + '" placeholder="e.g. B.Sc. Computer Science"></label>' +
              '<label class="entry-profile-field"><span>Level, grade or year <i>Required</i></span><input name="level" type="text" required maxlength="40" value="' + escapeHtml(profile.level || '') + '" placeholder="e.g. 300 Level or Year 2"></label>' +
              '<label class="entry-profile-field"><span>Academic session <i>Required</i></span><input name="academicSession" type="text" required maxlength="40" value="' + escapeHtml(profile.academicSession || profile.term || '') + '" placeholder="e.g. 2026/2027"></label>' +
              '<label class="entry-profile-field"><span>Semester or term <small>Optional</small></span><input name="semester" type="text" maxlength="50" value="' + escapeHtml(profile.semester || '') + '" placeholder="e.g. First semester"></label>' +
              field('Faculty', 'faculty', profile.faculty, {maxLength:120, placeholder:'Your faculty'}) +
              field('Department', 'department', profile.department || '', {maxLength:100, placeholder:'Your department'}) +
              field('Matriculation or student number', 'matricNumber', profile.matricNumber, {maxLength:40, placeholder:'Your student number'}) +
              field('Specialization', 'specialization', profile.specialization, {maxLength:100, placeholder:'Your specialization'}) +
              field('Mode of study', 'studyMode', profile.studyMode, {maxLength:80, placeholder:'e.g. Full-time, part-time or online'}) +
              '<label class="entry-profile-field"><span>Student status <i>Required</i></span><select name="studentStatus" required>' + statusOptions + '</select></label>' +
              '<label class="entry-profile-field"><span>Email address <small>Optional</small></span><input name="email" type="email" maxlength="120" autocomplete="email" value="' + escapeHtml(profile.email || '') + '" placeholder="you@example.com"></label>' +
              '<label class="entry-profile-field"><span>Profile photo <small>Optional</small></span><input id="profilePhotoFile" name="profilePhotoFile" type="file" accept="image/*"><small>You can also add or change this later.</small></label>' +
            '</div>' +
          '</section>' +
          '<section class="entry-profile-section">' +
            '<h2>Your study routine</h2>' +
            '<p>Set a starting routine. You can change it whenever your timetable changes.</p>' +
            '<div class="entry-profile-grid">' +
              '<label class="entry-profile-field"><span>Study goal per week <i>Required</i></span><input name="weeklyGoal" type="number" min="1" max="30" required value="' + escapeHtml(profile.weeklyGoal || 5) + '"></label>' +
              '<label class="entry-profile-field"><span>Preferred session length <i>Required</i></span><select name="planSessionMinutes" required>' + [25,30,45,60,75,90].map(n => '<option value="' + n + '"' + (Number(profile.planSessionMinutes || 45) === n ? ' selected' : '') + '>' + n + ' minutes</option>').join('') + '</select></label>' +
              '<label class="entry-profile-field"><span>Usual study start time <i>Required</i></span><input name="studyStart" type="time" required value="' + escapeHtml(profile.studyStart || '17:00') + '"></label>' +
              '<label class="entry-profile-field"><span>Usual study end time <i>Required</i></span><input name="studyEnd" type="time" required value="' + escapeHtml(profile.studyEnd || '21:00') + '"></label>' +
              '<label class="entry-profile-field entry-profile-field-full"><span>Usual exam or test format <small>Optional</small></span><input name="examStyle" type="text" maxlength="160" value="' + escapeHtml(profile.examStyle || '') + '" placeholder="e.g. Multiple choice, essays, short answers or practicals"></label>' +
            '</div>' +
            '<div class="entry-profile-days"><strong>Which days can you usually study? <i>Choose at least one</i></strong><div class="entry-profile-day-list">' +
              dayNames.map((day, index) => '<label><input type="checkbox" name="studyDay" value="' + index + '"' + (days.includes(index) ? ' checked' : '') + '><span>' + day.slice(0,3) + '</span></label>').join('') +
            '</div></div>' +
          '</section>' +
          '<p id="entryProfileError" class="entry-flow-error" role="alert"></p>' +
          '<div class="entry-profile-actions"><span>Your profile and study data stay on this device.</span><button class="entry-flow-primary" type="submit">Complete profile and open Eduvia <span aria-hidden="true">→</span></button></div>' +
        '</form>' +
      '</main>' +
    '</section>';
  }

  function renderSlide() {
    const isCountry = currentStep === slides.length;
    const isProfile = currentStep === slides.length + 1;
    if (isProfile) {
      root.innerHTML = profileSetupMarkup();
      return;
    }
    if (isCountry) {
      const options = countryOptions().map(country =>
        '<option value="' + escapeHtml(country) + '"' + (selectedCountry === country ? ' selected' : '') + '>' +
        escapeHtml(country) + '</option>'
      ).join('');
      root.innerHTML = '<section class="entry-flow-card entry-flow-country-screen">' +
        headerMarkup(false) +
        '<div class="entry-flow-progress">' + slides.map(() => '<i class="is-active"></i>').join('') + '<i class="is-active"></i><i></i></div>' +
        '<main class="entry-flow-content">' +
          '<p class="entry-flow-kicker">PERSONALISE YOUR LEARNING SPACE</p>' +
          '<h1 class="entry-flow-title">Which country are you studying in?</h1>' +
          '<p class="entry-flow-copy">Choose your country, then complete your student profile before entering Eduvia.</p>' +
          '<div class="entry-flow-country-wrap">' +
            '<label class="entry-flow-country-label" for="entryCountry">Select your country</label>' +
            '<select id="entryCountry" class="entry-flow-country" required>' +
              '<option value="">Choose your country</option>' + options +
            '</select>' +
            '<p id="entryFlowError" class="entry-flow-error" role="alert"></p>' +
          '</div>' +
        '</main>' +
        '<footer class="entry-flow-footer">' +
          '<button type="button" class="entry-flow-primary" data-flow-action="profile">Continue to profile <span aria-hidden="true">→</span></button>' +
          '<button type="button" class="entry-flow-back" data-flow-action="back">← Back</button>' +
          '<p class="entry-flow-privacy">Your planner and learning materials stay on this device.</p>' +
        '</footer></section>';
      const select = document.getElementById('entryCountry');
      if (select) select.value = selectedCountry;
      return;
    }

    const slide = slides[currentStep];
    root.innerHTML = '<section class="entry-flow-card">' + headerMarkup(true) +
      '<div class="entry-flow-progress">' + slides.map((_, i) =>
        '<i class="' + (i <= currentStep ? 'is-active' : '') + '"></i>'
      ).join('') + '<i></i><i></i></div>' +
      '<main class="entry-flow-content">' +
        '<div class="entry-flow-art">' + artwork(slide.art) + '</div>' +
        '<p class="entry-flow-kicker">' + slide.kicker + '</p>' +
        '<h1 class="entry-flow-title">' + slide.title + '</h1>' +
        '<p class="entry-flow-copy">' + slide.copy + '</p>' +
      '</main>' +
      '<footer class="entry-flow-footer">' +
        '<div class="entry-flow-dots" aria-label="Introduction page ' + (currentStep + 1) + ' of ' + (slides.length + 2) + '">' +
          slides.map((_, i) => '<i class="' + (i === currentStep ? 'is-active' : '') + '"></i>').join('') +
          '<i></i><i></i>' +
        '</div>' +
        '<button type="button" class="entry-flow-primary" data-flow-action="next">' + slide.action + ' <span aria-hidden="true">→</span></button>' +
        '<p class="entry-flow-privacy">A private, practical space for your learning.</p>' +
      '</footer></section>';
  }

  function saveCountryAndContinue(country) {
    const chosen = String(country || '').trim();
    const error = document.getElementById('entryFlowError');
    if (!chosen) {
      if (error) error.textContent = 'Please choose your country to continue.';
      return;
    }
    selectedCountry = chosen;
    if (typeof data !== 'undefined' && data.profile) {
      data.profile.country = chosen;
      if (typeof save === 'function') save();
      else if (typeof STORE_KEY !== 'undefined') localStorage.setItem(STORE_KEY, JSON.stringify(data));
    }
    try {
      localStorage.setItem(COUNTRY_KEY, chosen);
      localStorage.setItem(INTRO_KEY, '1');
    } catch {}
    currentStep = slides.length + 1;
    renderSlide();
  }

  function completeProfile(form) {
    const formData = new FormData(form);
    const chosenCountry = String(formData.get('country') || selectedCountry || '').trim();
    const fullName = String(formData.get('name') || '').trim();
    const stage = String(formData.get('stage') || '').trim();
    const institution = String(formData.get('institution') || '').trim();
    const programme = String(formData.get('degreeProgramme') || '').trim();
    const level = String(formData.get('level') || '').trim();
    const academicSession = String(formData.get('academicSession') || '').trim();
    const days = formData.getAll('studyDay').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
    const start = String(formData.get('studyStart') || '');
    const end = String(formData.get('studyEnd') || '');
    const error = document.getElementById('entryProfileError');
    if (!chosenCountry || !fullName || !stage || !institution || !programme || !level || !academicSession) {
      if (error) error.textContent = 'Complete every required personal and academic field before continuing.';
      return;
    }
    if (!days.length) {
      if (error) error.textContent = 'Choose at least one day you can study.';
      return;
    }
    if (!start || !end || start >= end) {
      if (error) error.textContent = 'Choose a valid study time. The end time must be later than the start time.';
      return;
    }

    Object.assign(data.profile, {
      name: fullName,
      country: chosenCountry,
      institution,
      stage,
      department: String(formData.get('department') || '').trim(),
      matricNumber: String(formData.get('matricNumber') || '').trim(),
      faculty: String(formData.get('faculty') || '').trim(),
      specialization: String(formData.get('specialization') || '').trim(),
      studyMode: String(formData.get('studyMode') || '').trim(),
      studentStatus: String(formData.get('studentStatus') || 'Active').trim(),
      level,
      academicSession,
      term: academicSession,
      semester: String(formData.get('semester') || '').trim(),
      degreeProgramme: programme,
      programme,
      email: String(formData.get('email') || '').trim(),
      examStyle: String(formData.get('examStyle') || '').trim(),
      weeklyGoal: Math.min(30, Math.max(1, Number(formData.get('weeklyGoal')) || 5)),
      planSessionMinutes: Number(formData.get('planSessionMinutes')) || 45,
      sessionMinutes: Number(formData.get('planSessionMinutes')) || 45,
      studyStart: start,
      studyEnd: end,
      studyDays: days,
      setupComplete: true,
      setupAt: typeof todayISO === 'function' ? todayISO() : new Date().toLocaleDateString('en-CA')
    });

    selectedCountry = chosenCountry;
    try {
      localStorage.setItem(COUNTRY_KEY, chosenCountry);
      localStorage.setItem(INTRO_KEY, '1');
    } catch {}
    if (typeof save === 'function') save();
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof setPage === 'function') setPage('today');
    else if (typeof render === 'function') render();
    root.classList.add('is-leaving');
    if (typeof toast === 'function') toast('Your profile is complete. Welcome to Eduvia.');
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
      currentStep = slides.length;
      renderSlide();
    } else if (action === 'back') {
      if (currentStep > slides.length) currentStep = slides.length;
      else currentStep = Math.max(0, currentStep - 1);
      renderSlide();
    } else if (action === 'profile') {
      const select = document.getElementById('entryCountry');
      saveCountryAndContinue(select?.value || selectedCountry);
    }
  });

  root.addEventListener('change', event => {
    if (event.target?.id === 'entryCountry') selectedCountry = event.target.value;
  });

  root.addEventListener('submit', event => {
    if (event.target?.id !== 'entryProfileForm') return;
    event.preventDefault();
    completeProfile(event.target);
  });

  startupTimer = window.setTimeout(() => {
    let hasCompletedIntro = false;
    try { hasCompletedIntro = localStorage.getItem(INTRO_KEY) === '1'; } catch {}
    const profileComplete = Boolean(typeof data !== 'undefined' && data.profile?.setupComplete);
    if (profileComplete) {
      dismissExistingUserSplash();
      return;
    }
    if (hasCompletedIntro) {
      currentStep = selectedCountry ? slides.length + 1 : slides.length;
      renderSlide();
      return;
    }
    currentStep = 0;
    renderSlide();
  }, 950);

  window.addEventListener('pagehide', () => window.clearTimeout(startupTimer), { once: true });
})();
