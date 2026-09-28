/** Assistant: chat UI over the rule-based assistantReply() with typing animation and history. */
import {
  bootPage, $, html, raw, setHTML, appendHTML, icon, escapeHtml, toast, confirmDialog, wait, prefersReducedMotion, pluralize,
} from './app.js';
import { api } from './api.js';
import { assistantReply, computeSkillGap, learningProgress } from './ai-sim.js';

const DEFAULT_CHIPS = ['What skills am I missing?', 'Show my roadmap progress', 'How can I improve my CV?', 'Give me interview tips', 'How are my applications going?', 'Suggest a portfolio project'];
const timeFmt = (iso) => new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

let context = {};
let busy = false;

bootPage('assistant', async () => {
  const snap = await api.getSnapshot();
  context = { profile: snap.profile, skills: snap.skills, applications: snap.applications, roadmap: snap.roadmap, activeJob: snap.activeJob };
  renderContext(snap);
  const history = await api.getAssistantHistory();
  renderHistory(history);
  renderChips(DEFAULT_CHIPS);

  $('#composer').addEventListener('submit', (e) => {
    e.preventDefault();
    send($('#message').value);
  });
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-chip]');
    if (b) send(b.dataset.chip);
  });
  $('#clear-chat').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Clear conversation?', message: 'Your chat history in this browser will be deleted.', confirmLabel: 'Clear chat', danger: true });
    if (!ok) return;
    await api.clearAssistantHistory();
    renderHistory([]);
    renderChips(DEFAULT_CHIPS);
    toast('Conversation cleared');
  });
});

/* ---------- Rendering ---------- */

/** Render the assistant's markdown-lite text (**bold**, _muted_, "- " bullets) safely. */
function formatReply(text) {
  const inline = (s) => escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1<em>$2</em>');
  const out = [];
  let list = null;
  for (const line of String(text).split('\n')) {
    if (line.startsWith('- ')) {
      list ||= [];
      list.push(`<li><span>${inline(line.slice(2))}</span></li>`);
      continue;
    }
    if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return raw(out.join(''));
}

function messageHtml(m) {
  const user = m.role === 'user';
  return html`<div class="msg ${user ? 'msg-user' : ''}">
    ${user ? '' : html`<span class="msg-avatar" aria-hidden="true">${icon('bot')}</span>`}
    <div class="msg-bubble">
      <span class="sr-only">${user ? 'You said:' : 'Assistant:'}</span>
      ${user ? html`<p>${m.content}</p>` : formatReply(m.content)}
      <span class="msg-time">${timeFmt(m.at)}</span>
    </div>
  </div>`;
}

function scrollToEnd() {
  const log = $('#chat-log');
  log.scrollTo({ top: log.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function renderHistory(history) {
  const log = $('#chat-log');
  const first = String(context.profile?.fullName || '').split(/\s+/)[0];
  const welcome = {
    role: 'assistant',
    at: new Date().toISOString(),
    content: `Hi${first ? ` ${first}` : ''}! 👋 I'm your **simulated** career assistant. I read the data saved in this browser (profile, skills, target job, roadmap and applications) and answer with rule-based templates.\n\nTry one of the suggestions below.`,
  };
  setHTML(log, html`${[welcome, ...history].map(messageHtml)}`);
  log.scrollTop = log.scrollHeight;
}

function append(m) {
  appendHTML($('#chat-log'), messageHtml(m));
  scrollToEnd();
}

function renderChips(list) {
  setHTML($('#chips'), html`${list.map((c) => html`<button type="button" class="chip shrink-0" data-chip="${c}">${icon('sparkles')}${c}</button>`)}`);
}

function renderContext(snap) {
  const gap = snap.activeJob ? computeSkillGap(snap.skills, snap.activeJob.analysis) : null;
  const lp = learningProgress(snap.roadmap);
  const rows = [
    ['user-round', 'Target role', snap.profile.targetRole || 'Not set'],
    ['briefcase', 'Target job', snap.activeJob ? `${snap.activeJob.title}${gap ? ` · ${gap.compatibility ?? 0}% match` : ''}` : 'None yet'],
    ['sparkles', 'Skills', pluralize(snap.skills.length, 'skill')],
    ['map', 'Roadmap', snap.roadmap ? `${lp.percent}% complete` : 'Not generated'],
    ['send', 'Applications', pluralize(snap.applications.length, 'application')],
  ];
  setHTML($('#context-card'), html`<h2 class="card-title" id="ctx-title">What I know about you</h2>
    <ul class="mt-2">${rows.map(([ic, label, value]) => html`<li class="list-row"><span class="list-icon">${icon(ic)}</span>
      <div class="min-w-0"><p class="text-xs text-muted">${label}</p><p class="truncate text-sm font-medium">${value}</p></div></li>`)}</ul>
    ${snap.demo ? html`<p class="hint mt-3">Demo data is active, so answers use the sample profile.</p>` : ''}`);
}

/* ---------- Sending ---------- */

async function send(message) {
  const text = String(message || '').trim();
  if (!text || busy) return;
  busy = true;
  const input = $('#message');
  const btn = $('#send-btn');
  input.value = '';
  btn.disabled = true;
  const now = new Date().toISOString();
  append({ role: 'user', content: text, at: now });

  const reply = assistantReply(text, context);
  const typing = document.createElement('div');
  typing.className = 'msg';
  $('#chat-log').appendChild(typing);
  setHTML(typing, html`<span class="msg-avatar" aria-hidden="true">${icon('bot')}</span><div class="msg-bubble typing" aria-label="Assistant is typing"><span></span><span></span><span></span></div>`);
  scrollToEnd();
  await wait(Math.min(1600, 550 + reply.text.length * 4));
  typing.remove();

  append({ role: 'assistant', content: reply.text, at: new Date().toISOString() });
  renderChips(reply.suggestions);
  try {
    await api.appendAssistantMessages({ role: 'user', content: text }, { role: 'assistant', content: reply.text, intent: reply.intent });
  } catch (err) {
    toast(`Chat not saved: ${err.message}`, { type: 'warning' });
  }
  busy = false;
  btn.disabled = false;
  input.focus();
}
