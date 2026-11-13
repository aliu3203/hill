const events = [
  { id: 'boba', title: 'Boba run at Rieber', time: 'Happening now', clock: '7:15 PM', location: 'Rieber Hall lobby', distance: '2 min walk', emoji: '🧋', visual: 'boba', tags: ['now','today','food','free'], people: 7, initials: ['AJ','ML'], description: 'A low-key boba run with neighbors from Rieber. Meet in the lobby and we’ll walk over together.', saved: true, match: 92 },
  { id: 'sunset', title: 'Sunset yoga + smoothies', time: 'Starts in 25 min', clock: '7:40 PM', location: 'Sunset Rec lawn', distance: '6 min walk', emoji: '🧘', visual: 'yoga', tags: ['now','today','wellness','free'], people: 12, initials: ['SK','RO'], description: 'Golden-hour flow on the lawn, then smoothies after. Bring a mat if you have one - extras available.', saved: true, match: 98 },
  { id: 'jam', title: 'Courtyard jam session', time: 'Starts in 45 min', clock: '8:00 PM', location: 'De Neve Plaza', distance: '4 min walk', emoji: '🎸', visual: 'jam', tags: ['today','music','free'], people: 9, initials: ['TY','LN'], description: 'Bring an instrument, your voice, or just come listen. All levels and all genres are welcome.', saved: false, match: 87 },
  { id: 'game', title: 'Hill Game Night', time: 'Tonight', clock: '8:30 PM', location: 'Covel Commons', distance: '5 min walk', emoji: '🎲', visual: 'game', tags: ['today','free'], people: 18, initials: ['DV','JP'], description: 'Board games, card games, snacks, and new friends. Drop in any time after 8:30.', saved: false, match: 84 },
  { id: 'film', title: 'Courtyard movie: Past Lives', time: 'Tonight', clock: '9:00 PM', location: 'Sproul patio', distance: '8 min walk', emoji: '🎬', visual: 'jam', tags: ['today','free'], people: 23, initials: ['IA','NE'], description: 'Outdoor screening with blankets and free popcorn while supplies last.', saved: false, match: 79 }
];

let activeFilter = 'all';
let currentView = 'discover';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
// Escape anything that can come from users (hangout titles, flyer text) before putting it in HTML.
const h = value => escapeHtml(String(value ?? ''));
const eventGrid = $('#eventGrid');
const timeline = $('#timeline');
const eventDialog = $('#eventDialog');
const toast = $('#toast');

function renderEvents() {
  const query = $('#search').value.trim().toLowerCase();
  let visible = events.filter(e => {
    const filterOk = activeFilter === 'all' || e.tags.includes(activeFilter);
    const searchOk = !query || [e.title, e.location, ...e.tags].join(' ').toLowerCase().includes(query);
    const viewOk = currentView !== 'saved' || e.saved;
    const hangoutOk = currentView !== 'hangouts' || e.id.startsWith('hangout') || ['boba','jam'].includes(e.id);
    return filterOk && searchOk && viewOk && hangoutOk;
  });
  const featured = visible.slice(0, 2);
  const later = visible.slice(2);
  eventGrid.innerHTML = featured.length ? featured.map(eventCard).join('') : `<div class="empty-state"><b>No plans found</b>Try another filter or ask Hill for an idea.</div>`;
  timeline.innerHTML = later.map(e => `<article class="timeline-event" data-event="${h(e.id)}" tabindex="0"><time>${h(e.clock)}</time><div><h3>${h(e.title)}</h3><p>${h(e.location)} · ${h(e.distance)}</p></div><span class="tag">${e.tags.includes('free') ? 'FREE' : h(String(e.tags[0] || 'event').toUpperCase())}</span></article>`).join('');
  $('#eventTotal').textContent = `${visible.length} picks for you`;
  $('#savedCount').textContent = events.filter(e => e.saved).length;
  bindEventTargets();
}

function eventCard(e) {
  return `<article class="event-card" data-event="${h(e.id)}" tabindex="0">
    <div class="event-visual visual-${h(e.visual)}"><span class="status-badge"><i></i>${h(String(e.time).toUpperCase())}</span><span class="event-emoji">${h(e.emoji)}</span></div>
    <div class="event-info"><h3>${h(e.title)}</h3><div class="event-meta"><span>⌖ ${h(e.location)}</span><span>↗ ${h(e.distance)}</span></div>
      <div class="event-footer"><div class="people">${e.initials.map(i=>`<i>${h(i)}</i>`).join('')}<small>+${h(e.people)} going</small></div><button class="save-event ${e.saved?'saved':''}" data-save="${h(e.id)}" aria-label="${e.saved?'Unsave':'Save'} ${h(e.title)}">${e.saved?'◆':'◇'}</button></div>
    </div></article>`;
}

function bindEventTargets() {
  $$('[data-event]').forEach(el => {
    el.onclick = () => openEvent(el.dataset.event);
    el.onkeydown = e => { if (e.key === 'Enter') openEvent(el.dataset.event); };
  });
  $$('[data-save]').forEach(btn => btn.onclick = e => { e.stopPropagation(); toggleSave(btn.dataset.save); });
}

function openEvent(id) {
  const e = events.find(x => x.id === id); if (!e) return;
  $('#eventDialogBody').innerHTML = `<div class="event-detail-hero visual-${h(e.visual)}"><span>${h(e.emoji)}</span></div><p class="modal-eyebrow">${h(e.match)}% MATCH FOR YOU</p><h2>${h(e.title)}</h2><div class="detail-meta"><p>◷ ${h(e.clock)} · ${h(e.time)}</p><p>⌖ ${h(e.location)} · ${h(e.distance)}</p><p>◎ ${h(e.people)} people are going</p></div><p class="detail-description">${h(e.description)}</p><div class="detail-actions"><button data-calendar="${h(e.id)}">Add to calendar</button><button class="going-button" data-going="${h(e.id)}">I’m going</button></div>`;
  eventDialog.showModal();
  $('[data-calendar]').onclick = () => downloadICS(e);
  $('[data-going]').onclick = () => { e.people++; eventDialog.close(); showToast(`You're in for ${e.title}!`); renderEvents(); };
}

function toggleSave(id) { const e = events.find(x => x.id === id); e.saved = !e.saved; renderEvents(); showToast(e.saved ? 'Saved for later' : 'Removed from saved'); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(()=>toast.classList.remove('show'), 2400); }
function downloadICS(e) {
  const start = new Date(); start.setHours(Number(e.clock.split(':')[0]) + (e.clock.includes('PM') && !e.clock.startsWith('12') ? 12 : 0), Number(e.clock.split(':')[1].slice(0,2)), 0, 0);
  const end = new Date(start.getTime() + 60*60*1000);
  const stamp = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Hill//Campus Events//EN\r\nBEGIN:VEVENT\r\nUID:${e.id}@hill.local\r\nDTSTAMP:${stamp(new Date())}\r\nDTSTART:${stamp(start)}\r\nDTEND:${stamp(end)}\r\nSUMMARY:${e.title}\r\nLOCATION:${e.location}\r\nDESCRIPTION:${e.description}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'})); a.download = `${e.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.ics`; a.click(); URL.revokeObjectURL(a.href); showToast('Calendar event downloaded');
}

$$('.filter').forEach(btn => btn.onclick = () => { $$('.filter').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); activeFilter = btn.dataset.filter; renderEvents(); });
$$('.nav-item').forEach(btn => btn.onclick = () => changeView(btn.dataset.view));
$$('[data-view-link]').forEach(btn => btn.onclick = () => changeView(btn.dataset.viewLink));
function changeView(view) {
  currentView = view; $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  if (view === 'map') { $('.right-rail').scrollIntoView({behavior:'smooth'}); showToast('Live map centered on the Hill'); currentView='discover'; }
  else { renderEvents(); $('.events-column').scrollIntoView({behavior:'smooth'}); }
}

$('#search').addEventListener('input', renderEvents);
document.addEventListener('keydown', e => { if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k') { e.preventDefault(); $('#search').focus(); } if (e.key==='Escape') $('#chatPanel').classList.remove('open'); });
$$('[data-close]').forEach(btn => btn.onclick = () => btn.closest('dialog').close());
$('#createButton').onclick = () => withLogin(() => $('#createDialog').showModal(), 'Sign in to post a hangout.');
$('#hangoutForm').onsubmit = async e => {
  e.preventDefault();
  const data = new FormData(e.target);
  const time = data.get('time');
  const [h,m] = time.split(':');
  const hr = Number(h);
  const localEvent = { id:`hangout-${Date.now()}`, title:data.get('title'), time:'Just posted', clock:`${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`, location:data.get('location'), distance:'Nearby', emoji:'👋', visual:'boba', tags:['now','today',data.get('tag').toLowerCase()], people:1, initials:['YOU'], description:'A spontaneous Hill hangout. Join in and bring a friend!', saved:false, match:95 };
  try {
    if (window.HillApi?.enabled) {
      const remote = await window.HillApi.createHangout({
        title: localEvent.title,
        time: localEvent.time,
        clock: localEvent.clock,
        location: localEvent.location,
        category: data.get('tag'),
        description: localEvent.description,
      });
      localEvent.id = remote.id;
    }
    events.unshift(localEvent);
    $('#createDialog').close();
    e.target.reset();
    renderEvents();
    showToast('Your hangout is live!');
  } catch (error) {
    if (error.code === 'LOGIN_REQUIRED') { $('#createDialog').close(); openAuth('signin', 'Your session expired. Sign in again to post.'); return; }
    showToast(error.message || 'Could not post the hangout');
  }
};

$('#scanButton').onclick = () => withLogin(() => $('#scanDialog').showModal(), 'Sign in to scan a flyer.');
const flyerInput = $('#flyerInput');
flyerInput.onchange = async () => {
  if (!flyerInput.files.length) return;
  $('.drop-zone').hidden = true;
  $('#scanProgress').hidden = false;
  $('#scanStatus').textContent='Uploading the flyer securely...';
  try {
    if (window.HillApi?.enabled) {
      await window.HillApi.uploadFlyer(flyerInput.files[0]);
      $('#scanStatus').textContent='Bedrock is extracting the event...';
      await new Promise(resolve => setTimeout(resolve, 900));
      $('#scanResult h3').textContent = 'Flyer uploaded';
      $('#scanResult small').textContent = 'Hill is processing it in the background';
    } else {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    $('#scanProgress').hidden=true;
    $('#scanResult').hidden=false;
  } catch (error) {
    $('#scanProgress').hidden=true;
    $('.drop-zone').hidden=false;
    showToast(error.message || 'Could not upload the flyer');
  }
};
$('#addScannedEvent').onclick = () => { if (!events.some(e=>e.id==='scanned-game')) events.unshift({...events.find(e=>e.id==='game'),id:'scanned-game',title:'Hill Game Night · from flyer'}); $('#scanDialog').close(); renderEvents(); showToast('Flyer event added to Hill'); };

const alertToggle = $('#alertToggle');
alertToggle.onclick = () => withLogin(toggleAlerts, 'Sign in to get alerts that match your interests.');
async function toggleAlerts() { alertToggle.classList.toggle('on'); const on=alertToggle.classList.contains('on'); alertToggle.setAttribute('aria-checked',on); try { if (window.HillApi?.enabled) await window.HillApi.updatePreferences(['food','music','wellness'], on); showToast(on?'Personalized alerts are on':'Personalized alerts paused'); } catch (error) { alertToggle.classList.toggle('on'); alertToggle.setAttribute('aria-checked',!on); showToast(error.message || 'Could not update alerts'); } }
$('#notificationButton').onclick = () => showToast('Sunset yoga starts in 25 minutes');
$('#profileButton').onclick = () => {
  if (!window.HillAuth?.enabled) { showToast('Profile and interests are coming next'); return; }
  openAuth(window.HillAuth.getUser() ? 'account' : 'signin');
};

const chatPanel = $('#chatPanel');
function openChat(prefill='') { chatPanel.classList.add('open'); chatPanel.setAttribute('aria-hidden','false'); if (prefill) { $('#chatInput').value=prefill; sendChat(prefill); } setTimeout(()=>$('#chatInput').focus(),220); }
$('#askButton').onclick = () => withLogin(() => openChat(), 'Sign in to ask Hill for ideas.'); $('#closeChat').onclick = () => { chatPanel.classList.remove('open'); chatPanel.setAttribute('aria-hidden','true'); };
$$('.suggestions button').forEach(btn => btn.onclick = () => sendChat(btn.textContent));
$('#chatForm').onsubmit = e => { e.preventDefault(); const q=$('#chatInput').value.trim(); if(q) sendChat(q); };
async function sendChat(q) { const body=$('#chatBody'); body.insertAdjacentHTML('beforeend',`<div class="user-message"><p>${escapeHtml(q)}</p></div>`); $('#chatInput').value=''; body.scrollTop=body.scrollHeight; let answer; try { if (window.HillApi?.enabled) { answer = (await window.HillApi.askHill(q)).answer; } else { const lower=q.toLowerCase(); answer='Sunset yoga + smoothies is your best match - it’s free, six minutes away, and starts in 25 minutes.'; if(lower.includes('food')) answer='Boba at Rieber is happening now, and there’s a free snack table at Game Night later.'; else if(lower.includes('people')||lower.includes('meet')) answer='The courtyard jam is friendly for solo drop-ins. Nine people are already going.'; else if(lower.includes('music')) answer='Courtyard jam at De Neve starts at 8. Want me to save it?'; } } catch (error) { answer = error.message || 'I could not reach the event service right now.'; } body.insertAdjacentHTML('beforeend',`<div class="bot-message"><span>✦</span><p>${escapeHtml(answer)}</p></div>`); body.scrollTop=body.scrollHeight; }
function escapeHtml(s) { return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

// ---------------------------------------------------------------------------
// Sign-in (UCLA email + verification code). Logic lives in auth.js; this is the UI.
// ---------------------------------------------------------------------------
const auth = window.HillAuth;
const authDialog = $('#authDialog');
const authCopy = {
  signin: ['UCLA STUDENTS ONLY', 'Sign in to Hill', 'Use your @ucla.edu or @g.ucla.edu email.'],
  signup: ['UCLA STUDENTS ONLY', 'Create your account', 'Only @ucla.edu and @g.ucla.edu emails can join. We’ll email you a code to verify.'],
  verify: ['ONE MORE STEP', 'Check your email', 'Enter the 6-digit code we sent you.'],
  forgot: ['RESET PASSWORD', 'Forgot your password?', 'We’ll email a reset code to your UCLA address.'],
  reset: ['RESET PASSWORD', 'Choose a new password', 'Enter the code from your email and a new password.'],
  account: ['YOUR ACCOUNT', 'Signed in', 'You can post hangouts, scan flyers, and get alerts.'],
};
let pendingEmail = '';
let pendingPassword = '';
let afterLogin = null;

function withLogin(action, reason) {
  if (!auth?.enabled || auth.getUser()) return action();
  afterLogin = action;
  openAuth('signin', reason);
}

function setAuthMessage(text, kind = 'error') {
  const box = $('#authMessage');
  box.hidden = !text;
  box.textContent = text || '';
  box.classList.toggle('success', kind === 'success');
}

function showAuthStep(step, message, kind) {
  $$('.auth-step', authDialog).forEach(el => { el.hidden = el.dataset.step !== step; });
  const [eyebrow, title, copy] = authCopy[step];
  $('#authEyebrow').textContent = eyebrow;
  $('#authTitle').textContent = title;
  $('#authCopy').textContent = step === 'verify' && pendingEmail ? `Enter the 6-digit code we sent to ${pendingEmail}.` : copy;
  setAuthMessage(message, kind);
  if (step === 'account') {
    const user = auth.getUser();
    $('#accountName').textContent = user?.name || 'Bruin';
    $('#accountEmail').textContent = user?.email || '';
    $('#accountAvatar').textContent = initialsFor(user);
  }
  const form = $(`.auth-step[data-step="${step}"]`, authDialog);
  const emailField = form?.querySelector('input[name="email"]');
  if (emailField && pendingEmail && !emailField.value) emailField.value = pendingEmail;
  setTimeout(() => form?.querySelector('input:not([value]), input')?.focus(), 30);
}

function openAuth(step = 'signin', message) {
  showAuthStep(step, message, 'success');
  if (!authDialog.open) authDialog.showModal();
}

async function runAuthStep(form, task) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  setAuthMessage('');
  try { await task(new FormData(form)); }
  catch (error) { setAuthMessage(error.message || 'Something went wrong. Please try again.'); }
  finally { button.disabled = false; }
}

function requireFields(data, names) {
  for (const name of names) if (!String(data.get(name) || '').trim()) throw new Error('Please fill in every field.');
}

$('.auth-step[data-step="signin"]').onsubmit = e => { e.preventDefault(); runAuthStep(e.target, async data => {
  requireFields(data, ['email', 'password']);
  pendingEmail = String(data.get('email')).trim().toLowerCase();
  try {
    await auth.signIn({ email: pendingEmail, password: data.get('password') });
  } catch (error) {
    if (error.code !== 'UserNotConfirmedException') throw error;
    pendingPassword = String(data.get('password'));
    await auth.resendCode(pendingEmail);
    showAuthStep('verify', 'Your email isn’t verified yet, so we sent you a new code.', 'success');
    return;
  }
  finishSignIn();
}); };

$('.auth-step[data-step="signup"]').onsubmit = e => { e.preventDefault(); runAuthStep(e.target, async data => {
  requireFields(data, ['name', 'email', 'password']);
  const email = String(data.get('email')).trim().toLowerCase();
  if (!auth.isAllowedEmail(email)) throw new Error('Hill is for UCLA students. Use your @ucla.edu or @g.ucla.edu email.');
  pendingEmail = email;
  pendingPassword = String(data.get('password'));
  await auth.signUp({ email, password: pendingPassword, name: String(data.get('name')) });
  showAuthStep('verify');
}); };

$('.auth-step[data-step="verify"]').onsubmit = e => { e.preventDefault(); runAuthStep(e.target, async data => {
  const code = String(data.get('code') || '').trim();
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code from your email.');
  await auth.confirmSignUp({ email: pendingEmail, code });
  if (pendingPassword) {
    await auth.signIn({ email: pendingEmail, password: pendingPassword });
    finishSignIn('Email verified. Welcome to Hill!');
  } else {
    showAuthStep('signin', 'Email verified! Sign in to continue.', 'success');
  }
}); };

$('#resendCode').onclick = async () => {
  if (!pendingEmail) { showAuthStep('signin'); return; }
  try { await auth.resendCode(pendingEmail); setAuthMessage(`New code sent to ${pendingEmail}.`, 'success'); }
  catch (error) { setAuthMessage(error.message); }
};

$('.auth-step[data-step="forgot"]').onsubmit = e => { e.preventDefault(); runAuthStep(e.target, async data => {
  requireFields(data, ['email']);
  pendingEmail = String(data.get('email')).trim().toLowerCase();
  if (!auth.isAllowedEmail(pendingEmail)) throw new Error('Enter the UCLA email you signed up with.');
  await auth.forgotPassword(pendingEmail);
  showAuthStep('reset', `If ${pendingEmail} has an account, a reset code is on its way.`, 'success');
}); };

$('.auth-step[data-step="reset"]').onsubmit = e => { e.preventDefault(); runAuthStep(e.target, async data => {
  requireFields(data, ['code', 'password']);
  await auth.confirmForgotPassword({ email: pendingEmail, code: data.get('code'), password: data.get('password') });
  showAuthStep('signin', 'Password updated. Sign in with your new password.', 'success');
}); };

$$('[data-goto]', authDialog).forEach(btn => btn.onclick = () => showAuthStep(btn.dataset.goto));
authDialog.addEventListener('close', () => { $$('form', authDialog).forEach(f => f.reset()); pendingPassword = ''; afterLogin = null; });

$('#signOutButton').onclick = async () => { await auth.signOut(); authDialog.close(); showToast('Signed out'); };

function finishSignIn(message) {
  const next = afterLogin;
  afterLogin = null;
  pendingPassword = '';
  authDialog.close();
  showToast(message || `Welcome back, ${auth.getUser()?.name || 'Bruin'}!`);
  if (next) setTimeout(next, 150);
}

function initialsFor(user) {
  if (!user) return '?';
  const source = user.name || user.email || '';
  return source.slice(0, 2).toUpperCase();
}

function renderUser() {
  if (!auth?.enabled) return;
  const user = auth.getUser();
  $('#profileButton span').textContent = user ? initialsFor(user) : '→';
  $('#profileButton').setAttribute('aria-label', user ? `Account: ${user.email}` : 'Sign in');
  $('#greeting').textContent = user ? `Hey ${user.name}, what's the move?` : `Hey Bruin, what's the move?`;
}
auth?.onChange(renderUser);
renderUser();

$('#dateLabel').textContent = new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date()).toUpperCase();
renderEvents();

async function loadAwsEvents() {
  if (!window.HillApi?.enabled) return;
  try {
    const remote = await window.HillApi.listEvents();
    if (!remote.length) return;
    const categoryVisual = { wellness: 'yoga', music: 'jam', food: 'boba' };
    const mapped = remote.map(item => ({
      id: item.id,
      title: item.title,
      time: item.time,
      clock: item.clock,
      location: item.location,
      distance: item.distance || 'On the Hill',
      emoji: 'H',
      visual: categoryVisual[item.category] || 'game',
      tags: ['today', item.category, ...(item.time?.toLowerCase().includes('now') ? ['now'] : [])],
      people: item.people || 0,
      initials: ['H'],
      description: item.description,
      saved: false,
      match: 90,
    }));
    events.splice(0, events.length, ...mapped);
    renderEvents();
  } catch (error) {
    console.warn('AWS event loading failed; keeping offline sample data.', error);
  }
}

loadAwsEvents();
