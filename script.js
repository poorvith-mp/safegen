const passwordField = document.getElementById('password');
const copyBtn = document.getElementById('copyBtn');
const generateBtn = document.getElementById('generateBtn');
const refreshBtn = document.getElementById('refreshBtn');
const surpriseBtn = document.getElementById('surpriseBtn');
const lengthInput = document.getElementById('length');
const lengthValue = document.getElementById('lengthValue');
const uppercaseInput = document.getElementById('uppercase');
const lowercaseInput = document.getElementById('lowercase');
const numbersInput = document.getElementById('numbers');
const symbolsInput = document.getElementById('symbols');
const strengthText = document.getElementById('strengthText');
const strengthFill = document.getElementById('strengthFill');
const message = document.getElementById('message');
const toastContainer = document.getElementById('toastContainer');
const pageLoader = document.getElementById('pageLoader');
const views = document.querySelectorAll('.view');
const navigationTargets = document.querySelectorAll('[data-view-target]');
const themeButtons = document.querySelectorAll('[data-theme-choice]');
const accentButtons = document.querySelectorAll('[data-accent]');
const radiusRange = document.getElementById('radiusRange');
const radiusValue = document.getElementById('radiusValue');
const motionRange = document.getElementById('motionRange');
const motionValue = document.getElementById('motionValue');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const shareBtn = document.getElementById('shareBtn');
const creditsBtn = document.getElementById('creditsBtn');
const creditsModal = document.getElementById('creditsModal');
const closeCreditsBtn = document.getElementById('closeCreditsBtn');
const placeholderLinks = document.querySelectorAll('[data-placeholder-link="true"]');
const bottomDock = document.getElementById('bottomDock');
const toTopBtn = document.getElementById('toTopBtn');
const confettiLayer = document.getElementById('confettiLayer');
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
const jumpGeneratorBtn = document.getElementById('jumpGeneratorBtn');
const jumpSettingsBtn = document.getElementById('jumpSettingsBtn');
const generatorSection = document.getElementById('generatorSection');
const entropyValue = document.getElementById('entropyValue');
const mixValue = document.getElementById('mixValue');
const currentLength = document.getElementById('currentLength');
const snapshotLength = document.getElementById('snapshotLength');
const snapshotTypes = document.getElementById('snapshotTypes');
const snapshotStrength = document.getElementById('snapshotStrength');

const STORAGE_KEY = 'safegen-preferences';
const DOCK_COLLAPSE_DELAY = 3600;
let dockTimer;

const sets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+{}[]<>?/|~=-'
};

function randomInt(max) {
  if (window.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / max) * max;
    let randomNumber = 0;

    do {
      window.crypto.getRandomValues(array);
      randomNumber = array[0];
    } while (randomNumber >= limit);

    return randomNumber % max;
  }

  return Math.floor(Math.random() * max);
}

function getRandomChar(chars) {
  return chars[randomInt(chars.length)];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function showToast(text, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = text;
  toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('fade-out');
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function setMessage(text = '', isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

function getSelectedSets() {
  return [
    uppercaseInput.checked ? sets.uppercase : '',
    lowercaseInput.checked ? sets.lowercase : '',
    numbersInput.checked ? sets.numbers : '',
    symbolsInput.checked ? sets.symbols : ''
  ].filter(Boolean);
}

function calculateEntropy(length, selectedSets) {
  const poolSize = selectedSets.join('').length || 1;
  return Math.round(length * Math.log2(poolSize));
}

function updateStrength() {
  const length = Number(lengthInput.value);
  const selectedSets = getSelectedSets();
  const entropy = calculateEntropy(length, selectedSets);
  const selectedCount = selectedSets.length;

  strengthFill.className = 'strength-fill';

  let rating = 'Strong';
  if (entropy < 52 || selectedCount <= 1) {
    strengthFill.classList.add('weak');
    rating = 'Weak';
  } else if (entropy < 72 || selectedCount <= 2) {
    strengthFill.classList.add('medium');
    rating = 'Medium';
  } else {
    strengthFill.classList.add('strong');
    rating = 'Strong';
  }

  strengthText.textContent = rating;
  entropyValue.textContent = `${entropy} bits`;
  mixValue.textContent = `${selectedCount} / 4`;
  currentLength.textContent = length;
  snapshotLength.textContent = length;
  snapshotTypes.textContent = selectedCount;
  snapshotStrength.textContent = rating;
}

function launchConfetti(originElement) {
  const colors = ['#5b6cff', '#10b981', '#f59e0b', '#f43f5e', '#7c3aed', '#22c55e'];
  const originRect = originElement.getBoundingClientRect();
  const originX = originRect.left + originRect.width / 2;
  const originY = originRect.top + originRect.height / 2;

  for (let index = 0; index < 18; index += 1) {
    const piece = document.createElement('span');
    const tx = `${randomInt(260) - 130}px`;
    const ty = `${140 + randomInt(180)}px`;
    const rotation = `${randomInt(720) - 360}deg`;

    piece.className = 'confetti-piece';
    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.background = colors[randomInt(colors.length)];
    piece.style.setProperty('--tx', tx);
    piece.style.setProperty('--ty', ty);
    piece.style.setProperty('--rot', rotation);
    piece.style.animationDelay = `${index * 14}ms`;

    confettiLayer.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1400);
  }
}

function generatePassword(options = {}) {
  const { announce = true, celebrate = false, sourceElement = generateBtn } = options;
  const length = Number(lengthInput.value);
  const selectedSets = getSelectedSets();

  if (!selectedSets.length) {
    passwordField.value = 'Select at least one character type';
    setMessage('Please enable one or more character sets.', true);
    updateStrength();
    if (announce) showToast('Select at least one character type.', 'error');
    return;
  }

  const passwordChars = [];
  let allChars = '';

  selectedSets.forEach((set) => {
    passwordChars.push(getRandomChar(set));
    allChars += set;
  });

  while (passwordChars.length < length) {
    passwordChars.push(getRandomChar(allChars));
  }

  passwordField.value = shuffle(passwordChars).join('');
  setMessage('Fresh password generated.');
  updateStrength();

  if (announce) {
    if (celebrate) {
      showToast('🎉 Safe password generated successfully!', 'celebrate');
      launchConfetti(sourceElement);
    } else {
      showToast('New password generated.');
    }
  }
}

async function copyPassword() {
  const currentPassword = passwordField.value.trim();

  if (!currentPassword || currentPassword.startsWith('Select at least')) {
    setMessage('Generate a password before copying.', true);
    showToast('Generate a password first.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(currentPassword);
    copyBtn.textContent = 'Copied';
    setMessage('Password copied to clipboard.');
    showToast('Password copied to clipboard.');
    window.setTimeout(() => {
      copyBtn.textContent = 'Copy';
    }, 1400);
  } catch {
    passwordField.select();
    document.execCommand('copy');
    setMessage('Password copied to clipboard.');
    showToast('Password copied using fallback.');
  }
}

function activateView(targetId, options = {}) {
  const { scrollTop = true } = options;

  views.forEach((view) => {
    view.classList.toggle('active', view.id === targetId);
  });

  navigationTargets.forEach((button) => {
    if (button.dataset.viewTarget) {
      button.classList.toggle('active', button.dataset.viewTarget === targetId);
    }
  });

  if (scrollTop) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.themeChoice === theme);
  });
}

function applyAccent(accent) {
  document.body.dataset.accent = accent;
  accentButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.accent === accent);
  });
}

function applyRadius(value) {
  document.documentElement.style.setProperty('--radius', `${value}px`);
  radiusValue.textContent = `${value}px`;
  radiusRange.value = value;
}

function applyMotion(value) {
  const factor = Number(value) / 100;
  document.documentElement.style.setProperty('--motion-factor', factor.toString());
  motionValue.textContent = `${value}%`;
  motionRange.value = value;
  document.body.classList.toggle('low-motion', Number(value) === 0);
}

function savePreferences() {
  const preferences = {
    theme: document.body.dataset.theme || 'light',
    accent: document.body.dataset.accent || 'indigo',
    radius: Number(radiusRange.value),
    motion: Number(motionRange.value)
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

function loadPreferences() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    applyTheme('light');
    applyAccent('indigo');
    applyRadius(22);
    applyMotion(70);
    return;
  }

  try {
    const preferences = JSON.parse(raw);
    applyTheme(preferences.theme || 'light');
    applyAccent(preferences.accent || 'indigo');
    applyRadius(preferences.radius || 22);
    applyMotion(preferences.motion ?? 70);
  } catch {
    applyTheme('light');
    applyAccent('indigo');
    applyRadius(22);
    applyMotion(70);
  }
}

async function shareTool() {
  const shareData = {
    title: 'SafeGen',
    text: 'Check out SafeGen, a stylish password generator built with HTML, CSS, and JavaScript.',
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      showToast('Share sheet opened.');
      return;
    }

    await navigator.clipboard.writeText(`${shareData.title} — ${shareData.url}`);
    showToast('Share link copied to clipboard.');
  } catch {
    showToast('Sharing was cancelled or unavailable.', 'error');
  }
}

function openCredits() {
  creditsModal.classList.add('open');
  creditsModal.setAttribute('aria-hidden', 'false');
}

function closeCredits() {
  creditsModal.classList.remove('open');
  creditsModal.setAttribute('aria-hidden', 'true');
}

function randomizePreset() {
  const lengths = [12, 16, 18, 20, 24];
  const accentChoices = ['indigo', 'emerald', 'rose', 'amber'];
  lengthInput.value = lengths[randomInt(lengths.length)];
  lengthValue.textContent = lengthInput.value;

  uppercaseInput.checked = true;
  lowercaseInput.checked = true;
  numbersInput.checked = true;
  symbolsInput.checked = randomInt(2) === 1;

  const accent = accentChoices[randomInt(accentChoices.length)];
  applyAccent(accent);
  savePreferences();
  updateStrength();
  generatePassword({ announce: true, celebrate: true, sourceElement: surpriseBtn });
}

function toggleToTopButton() {
  toTopBtn.classList.toggle('visible', window.scrollY > 180);
}

function expandDockTemporarily() {
  bottomDock.classList.remove('collapsed');
  window.clearTimeout(dockTimer);
  dockTimer = window.setTimeout(() => {
    bottomDock.classList.add('collapsed');
  }, DOCK_COLLAPSE_DELAY);
}

function initCustomCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  document.body.classList.add('has-custom-cursor');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  function animate() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    const scale = cursorRing.classList.contains('active') ? 1.35 : 1;

    cursorDot.style.transform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;
    cursorRing.style.transform = `translate(${ringX - 17}px, ${ringY - 17}px) scale(${scale})`;
    requestAnimationFrame(animate);
  }

  document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    cursorDot.style.opacity = '1';
    cursorRing.style.opacity = '1';
  });

  document.addEventListener('mouseleave', () => {
    cursorDot.style.opacity = '0';
    cursorRing.style.opacity = '0';
  });

  document.addEventListener('mousedown', () => {
    cursorRing.classList.add('active');
  });

  document.addEventListener('mouseup', () => {
    cursorRing.classList.remove('active');
  });

  document.querySelectorAll('button, a, input, label, summary').forEach((element) => {
    element.addEventListener('mouseenter', () => cursorRing.classList.add('active'));
    element.addEventListener('mouseleave', () => cursorRing.classList.remove('active'));
  });

  animate();
}

function hideLoader() {
  window.setTimeout(() => {
    pageLoader.classList.add('hidden');
    document.body.classList.remove('loading');
  }, 950);
}

navigationTargets.forEach((button) => {
  button.addEventListener('click', () => {
    if (!button.dataset.viewTarget) return;
    activateView(button.dataset.viewTarget);
    expandDockTemporarily();
  });
});

jumpGeneratorBtn.addEventListener('click', () => {
  activateView('home', { scrollTop: false });
  generatorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  expandDockTemporarily();
});

jumpSettingsBtn.addEventListener('click', () => {
  activateView('settings');
  expandDockTemporarily();
});

lengthInput.addEventListener('input', () => {
  lengthValue.textContent = lengthInput.value;
  updateStrength();
});

[uppercaseInput, lowercaseInput, numbersInput, symbolsInput].forEach((input) => {
  input.addEventListener('change', updateStrength);
});

generateBtn.addEventListener('click', () => {
  generatePassword({ announce: true, celebrate: true, sourceElement: generateBtn });
});

refreshBtn.addEventListener('click', () => {
  generatePassword({ announce: true, celebrate: false, sourceElement: refreshBtn });
});

surpriseBtn.addEventListener('click', randomizePreset);
copyBtn.addEventListener('click', copyPassword);
shareBtn.addEventListener('click', shareTool);
creditsBtn.addEventListener('click', openCredits);
closeCreditsBtn.addEventListener('click', closeCredits);
creditsModal.addEventListener('click', (event) => {
  if (event.target.dataset.closeModal === 'true') {
    closeCredits();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && creditsModal.classList.contains('open')) {
    closeCredits();
  }
});

themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyTheme(button.dataset.themeChoice);
    savePreferences();
    showToast(`Theme changed to ${button.dataset.themeChoice}.`);
  });
});

accentButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyAccent(button.dataset.accent);
    savePreferences();
    showToast(`Accent changed to ${button.dataset.accent}.`);
  });
});

radiusRange.addEventListener('input', () => {
  applyRadius(radiusRange.value);
  savePreferences();
});

motionRange.addEventListener('input', () => {
  applyMotion(motionRange.value);
  savePreferences();
});

resetSettingsBtn.addEventListener('click', () => {
  applyTheme('light');
  applyAccent('indigo');
  applyRadius(22);
  applyMotion(70);
  savePreferences();
  showToast('Preferences reset to default.');
});

placeholderLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    showToast('This is a placeholder link. Replace it with your real URL in the HTML.', 'error');
  });
});

bottomDock.addEventListener('mouseenter', expandDockTemporarily);
bottomDock.addEventListener('focusin', expandDockTemporarily);
bottomDock.addEventListener('click', expandDockTemporarily);
bottomDock.addEventListener('touchstart', expandDockTemporarily, { passive: true });
window.addEventListener('scroll', toggleToTopButton, { passive: true });

toTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('load', hideLoader);

loadPreferences();
activateView('home', { scrollTop: false });
lengthValue.textContent = lengthInput.value;
updateStrength();
generatePassword({ announce: false, celebrate: false });
expandDockTemporarily();
toggleToTopButton();
initCustomCursor();
