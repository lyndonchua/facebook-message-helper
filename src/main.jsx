import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy, Languages, MessageCircle, RefreshCw, Send, Upload, Wand2 } from 'lucide-react';
import './style.css';

const DEMO_THREADS = [
  {
    id: 'melaka',
    name: 'Melaka Friend',
    platform: 'Facebook',
    lastUpdated: 'Today',
    messages: [
      { from: 'them', text: '你好，晚上好呀，好像很冷 😁' },
      { from: 'me', text: 'Hello 晚上好！新加坡最近也一直下雨。' },
      { from: 'them', text: '你是想看东京的女优美女吧 😂' }
    ]
  },
  {
    id: 'parent',
    name: 'Parent Enquiry',
    platform: 'Facebook Page',
    lastUpdated: 'Yesterday',
    messages: [
      { from: 'them', text: 'Hi, can I check what time the briefing starts?' },
      { from: 'me', text: 'Hi, the briefing starts at 7.30 pm.' }
    ]
  }
];

const LANGS = ['English', 'Chinese', 'Malay', 'Tamil', 'Japanese', 'Korean', 'Thai', 'Vietnamese'];
const TONES = ['Simple', 'Humble', 'Friendly', 'Polite', 'Playful', 'Professional'];
const VIEW_MODES = ['Translation Only', 'Dual Language', 'Original Only'];

function lastIncoming(thread) {
  return [...thread.messages].reverse().find(m => m.from === 'them')?.text || '';
}

function smartTranslate(text, target) {
  const cleaned = text.trim();
  if (!cleaned) return '';

  const known = {
    'Hello 晚上好呀': 'Hello, good evening.',
    '你好，晚上好呀，好像很冷 😁': 'Hello, good evening. It seems quite cold 😁',
    'Hello 晚上好！新加坡最近也一直下雨。': 'Hello, good evening! Singapore has also been raining recently.',
    '一看这三个字 就是渣男的经典答复': 'Just seeing those three words, I can tell it is a classic playboy reply.',
    '你认识很多？': 'Do you know many women?',
    '不认识 看Tik Tok多了还不知道吗': 'No, I do not. After watching so much TikTok, wouldn\'t I know?',
    '现在也认识到了呀': 'Well, now you have met one too.',
    '我也是在TikTok 看过很多网红': 'I have also seen many influencers on TikTok.',
    '你是想看东京的女优美女吧 😂': 'You just want to see beautiful Japanese actresses in Tokyo, right? 😂',
    'Hi, can I check what time the briefing starts?': 'Hi, can I check what time the briefing starts?',
    'Hi, the briefing starts at 7.30 pm.': 'Hi, the briefing starts at 7.30 pm.'
  };

  if (target === 'English') return known[cleaned] || cleaned;
  return `[${target}] ${cleaned}`;
}

function localSuggest(text, tone) {
  const lower = text.toLowerCase();
  if (text.includes('女优') || lower.includes('beaut')) {
    return [
      '哈哈你吃醋了吗？放心啦，我只是想去看风景和吃美食。',
      '你是不是怕我看别的美女？其实我觉得会聊天的人更有魅力。',
      '没有啦，我想去日本是看风景、文化和美食，不是只看美女 😂'
    ];
  }
  if (text.includes('认识很多')) {
    return [
      '没有啦，我只是看 TikTok 多一点而已 😂',
      '不多啦。会聊天的朋友比美女更难遇到 😄',
      '哈哈你是在试探我吗？'
    ];
  }
  if (text.includes('晚上好') || lower.includes('hello')) {
    return [
      '晚上好呀！你今天过得怎么样？',
      '哈哈是有点冷，你那边呢？',
      '晚上好！最近天气真的很奇怪，一下热一下下雨。'
    ];
  }
  return [
    `(${tone}) Thanks for your message. Let me check and get back to you shortly.`,
    `(${tone}) I understand. Give me a moment and I’ll reply properly.`,
    `(${tone}) Sounds good. I’ll take a look and let you know.`
  ];
}

function buildSummary(thread) {
  const text = thread.messages.map(m => m.text).join(' ');
  if (text.includes('女优') || text.includes('认识很多')) {
    return [
      'She is teasing you in a playful way.',
      'The topic is about TikTok, Japan, beauties and whether you know many women.',
      'Good reply style: light, humble and slightly playful.'
    ];
  }
  return [
    'Conversation is straightforward.',
    'Reply clearly and politely.',
    'Good reply style: simple and helpful.'
  ];
}

function App() {
  const [threads, setThreads] = useState(DEMO_THREADS);
  const [selectedId, setSelectedId] = useState('melaka');
  const [targetLang, setTargetLang] = useState('English');
  const [tone, setTone] = useState('Simple');
  const [viewMode, setViewMode] = useState('Dual Language');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedReply, setSelectedReply] = useState('');
  const [manualText, setManualText] = useState('');
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);

  const selectedThread = useMemo(() => threads.find(t => t.id === selectedId) || threads[0], [threads, selectedId]);
  const incoming = lastIncoming(selectedThread || { messages: [] });
  const summary = buildSummary(selectedThread || { messages: [] });
  const selectedMessage = selectedMessageIndex === null ? incoming : selectedThread?.messages[selectedMessageIndex]?.text || incoming;

  function addManualThread() {
    if (!manualText.trim()) return;
    const id = `manual-${Date.now()}`;
    const newThread = {
      id,
      name: 'Pasted Facebook Chat',
      platform: 'Manual Import',
      lastUpdated: 'Now',
      messages: manualText.split('\n').filter(Boolean).map((line, idx) => ({ from: idx % 2 === 0 ? 'them' : 'me', text: line.trim() }))
    };
    setThreads([newThread, ...threads]);
    setSelectedId(id);
    setSelectedMessageIndex(null);
    setManualText('');
  }

  function suggest() {
    const replies = localSuggest(selectedMessage, tone);
    setSuggestions(replies);
    setSelectedReply(replies[0] || '');
  }

  function copyReply() {
    navigator.clipboard?.writeText(selectedReply);
  }

  function selectThread(id) {
    setSelectedId(id);
    setSelectedMessageIndex(null);
    setSuggestions([]);
    setSelectedReply('');
  }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><MessageCircle size={28}/><div><h1>Facebook Message Helper</h1><p>Translate · Suggest · Reply</p></div></div>
      <div className="notice">Safe build: paste/import Facebook messages. Translation appears directly on the right panel.</div>
      <div className="threads">
        {threads.map(t => <button key={t.id} onClick={() => selectThread(t.id)} className={t.id === selectedId ? 'thread active' : 'thread'}>
          <b>{t.name}</b><span>{t.platform} · {t.lastUpdated}</span>
          <small>{lastIncoming(t).slice(0, 80)}</small>
        </button>)}
      </div>
    </aside>

    <main className="main">
      <section className="panel chatPanel">
        <header><h2>{selectedThread?.name}</h2><span>{selectedThread?.platform}</span></header>
        <div className="chat">
          {selectedThread?.messages.map((m, i) => <button key={i} onClick={() => setSelectedMessageIndex(i)} className={`bubble ${m.from} ${selectedMessageIndex === i ? 'selected' : ''}`}>{m.text}</button>)}
        </div>
      </section>

      <section className="panel toolsPanel">
        <h2>Translation Panel</h2>
        <label>Target translation language</label>
        <select value={targetLang} onChange={e => setTargetLang(e.target.value)}>{LANGS.map(l => <option key={l}>{l}</option>)}</select>

        <label>View mode</label>
        <select value={viewMode} onChange={e => setViewMode(e.target.value)}>{VIEW_MODES.map(l => <option key={l}>{l}</option>)}</select>

        <div className="translationList">
          {selectedThread?.messages.map((m, i) => <div key={i} className={`translationItem ${selectedMessageIndex === i ? 'active' : ''}`} onClick={() => setSelectedMessageIndex(i)}>
            <div className="who">{m.from === 'them' ? 'Incoming' : 'Me'}</div>
            {viewMode !== 'Translation Only' && <div className="originalText">{m.text}</div>}
            {viewMode !== 'Original Only' && <div className="translatedText">{smartTranslate(m.text, targetLang)}</div>}
          </div>)}
        </div>

        <div className="summaryBox">
          <b>Conversation Summary</b>
          <ul>{summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>

        <h2>AI Reply Helper</h2>
        <div className="selectedBox">
          <b>Selected message</b>
          <p>{selectedMessage}</p>
          <p className="miniTrans">{smartTranslate(selectedMessage, targetLang)}</p>
        </div>

        <label>Reply tone</label>
        <select value={tone} onChange={e => setTone(e.target.value)}>{TONES.map(t => <option key={t}>{t}</option>)}</select>
        <button className="primary" onClick={suggest}><Wand2 size={18}/> Suggest replies</button>

        <div className="suggestions">
          {suggestions.map((s, i) => <button key={i} className={selectedReply === s ? 'suggestion active' : 'suggestion'} onClick={() => setSelectedReply(s)}>{s}</button>)}
        </div>
        <textarea value={selectedReply} onChange={e => setSelectedReply(e.target.value)} placeholder="Selected reply appears here"></textarea>
        <div className="row">
          <button onClick={copyReply}><Copy size={18}/> Copy reply</button>
          <a className="send" href={`https://www.messenger.com/`} target="_blank" rel="noreferrer"><Send size={18}/> Open Messenger</a>
        </div>
      </section>

      <section className="panel importPanel">
        <h2><Upload size={20}/> Paste / Import Chat</h2>
        <p>Paste Facebook messages line by line. The app will create a local thread for translation and reply suggestions.</p>
        <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Paste messages here..."></textarea>
        <button onClick={addManualThread}><RefreshCw size={18}/> Add as thread</button>
      </section>
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<App />);
