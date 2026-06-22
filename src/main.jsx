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

function lastIncoming(thread) {
  return [...thread.messages].reverse().find(m => m.from === 'them')?.text || '';
}

function localTranslate(text, target) {
  if (!text.trim()) return 'No message selected.';
  return `Translation to ${target}: ${text}\n\n(Add an AI API key/proxy to get real translation.)`;
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

function App() {
  const [threads, setThreads] = useState(DEMO_THREADS);
  const [selectedId, setSelectedId] = useState('melaka');
  const [targetLang, setTargetLang] = useState('English');
  const [tone, setTone] = useState('Simple');
  const [translation, setTranslation] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedReply, setSelectedReply] = useState('');
  const [manualText, setManualText] = useState('');
  const [apiKey, setApiKey] = useState('');

  const selectedThread = useMemo(() => threads.find(t => t.id === selectedId) || threads[0], [threads, selectedId]);
  const incoming = lastIncoming(selectedThread || { messages: [] });

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
    setManualText('');
  }

  async function translate() {
    const text = incoming;
    if (!apiKey.trim()) {
      setTranslation(localTranslate(text, targetLang));
      return;
    }
    setTranslation('AI translation proxy not connected in this static build. Use the server template in README to connect securely.');
  }

  async function suggest() {
    const replies = localSuggest(incoming, tone);
    setSuggestions(replies);
    setSelectedReply(replies[0] || '');
  }

  function copyReply() {
    navigator.clipboard?.writeText(selectedReply);
  }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><MessageCircle size={28}/><div><h1>Facebook Message Helper</h1><p>Translate · Suggest · Reply</p></div></div>
      <div className="notice">Safe build: works by paste/import now. Official Facebook Page messages can be connected later through Meta Messenger Platform webhooks.</div>
      <div className="threads">
        {threads.map(t => <button key={t.id} onClick={() => setSelectedId(t.id)} className={t.id === selectedId ? 'thread active' : 'thread'}>
          <b>{t.name}</b><span>{t.platform} · {t.lastUpdated}</span>
          <small>{lastIncoming(t).slice(0, 80)}</small>
        </button>)}
      </div>
    </aside>

    <main className="main">
      <section className="panel chatPanel">
        <header><h2>{selectedThread?.name}</h2><span>{selectedThread?.platform}</span></header>
        <div className="chat">
          {selectedThread?.messages.map((m, i) => <div key={i} className={`bubble ${m.from}`}>{m.text}</div>)}
        </div>
      </section>

      <section className="panel toolsPanel">
        <h2>AI Helper</h2>
        <label>Target translation language</label>
        <select value={targetLang} onChange={e => setTargetLang(e.target.value)}>{LANGS.map(l => <option key={l}>{l}</option>)}</select>
        <button className="primary" onClick={translate}><Languages size={18}/> Translate last incoming message</button>
        <div className="output">{translation || 'Translation will appear here.'}</div>

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

        <h3>Optional AI key placeholder</h3>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Do not use this in production; use Vercel env variables" />
      </section>
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<App />);
