import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy, MessageCircle, RefreshCw, Send, Upload, Wand2 } from 'lucide-react';
import './style.css';
import { initializeApp } from 'firebase/app';
import { addDoc, collection, getDocs, getFirestore, orderBy, query, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDNphiv78xMwfXge0B3t1L7nPR1xpNSniQ',
  authDomain: 'facebook-message-helper.firebaseapp.com',
  projectId: 'facebook-message-helper',
  storageBucket: 'facebook-message-helper.firebasestorage.app',
  messagingSenderId: '1086563460953',
  appId: '1:1086563460953:web:6ed44bc6d16afb7dfa0e48'
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const DEMO_THREADS = [
  {
    id: 'sample-friend',
    name: 'Sample Friend',
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
      'Topic: TikTok, Japan, beauties and whether you know many women.',
      'Best reply style: light, humble and slightly playful.'
    ];
  }
  return [
    'Conversation is straightforward.',
    'Reply clearly and politely.',
    'Best reply style: simple and helpful.'
  ];
}

function App() {
  const [threads, setThreads] = useState(DEMO_THREADS);
  const [selectedId, setSelectedId] = useState('sample-friend');
  const [targetLang, setTargetLang] = useState('English');
  const [tone, setTone] = useState('Simple');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedReply, setSelectedReply] = useState('');
  const [manualText, setManualText] = useState('');
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [saveStatus, setSaveStatus] = useState('Firebase connected');

  const selectedThread = useMemo(() => threads.find(t => t.id === selectedId) || threads[0], [threads, selectedId]);
  const incoming = lastIncoming(selectedThread || { messages: [] });
  const summary = buildSummary(selectedThread || { messages: [] });
  const selectedMessage = selectedMessageIndex === null ? incoming : selectedThread?.messages[selectedMessageIndex]?.text || incoming;

  useEffect(() => {
    async function loadSavedThreads() {
      try {
        const q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const savedThreads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (savedThreads.length > 0) {
          setThreads(savedThreads);
          setSelectedId(savedThreads[0].id);
          setSaveStatus(`Loaded ${savedThreads.length} saved record(s) from Firebase`);
        }
      } catch (error) {
        console.error(error);
        setSaveStatus('Firebase load failed. Check Firestore rules.');
      }
    }
    loadSavedThreads();
  }, []);

  async function saveThreadToFirebase(thread) {
    setSaveStatus('Saving to Firebase...');
    try {
      const docRef = await addDoc(collection(db, 'threads'), {
        name: thread.name,
        platform: thread.platform,
        lastUpdated: thread.lastUpdated,
        messages: thread.messages,
        createdAt: serverTimestamp()
      });
      setSaveStatus('Saved to Firebase');
      return docRef.id;
    } catch (error) {
      console.error(error);
      setSaveStatus('Firebase save failed. Check Firestore rules.');
      return thread.id;
    }
  }

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
    saveThreadToFirebase(newThread).then(savedId => {
      if (savedId !== id) {
        const savedThread = { ...newThread, id: savedId };
        setThreads(current => current.map(t => t.id === id ? savedThread : t));
        setSelectedId(savedId);
      }
    });
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
      <div className="notice">Original chat and translation now mirror each other side by side. Controls stay on this left panel.</div>
      <div className="firebaseStatus">{saveStatus}</div>

      <div className="sideBlock">
        <label>Target translation language</label>
        <select value={targetLang} onChange={e => setTargetLang(e.target.value)}>{LANGS.map(l => <option key={l}>{l}</option>)}</select>
      </div>

      <div className="threads">
        {threads.map(t => <button key={t.id} onClick={() => selectThread(t.id)} className={t.id === selectedId ? 'thread active' : 'thread'}>
          <b>{t.name}</b><span>{t.platform} · {t.lastUpdated}</span>
          <small>{lastIncoming(t).slice(0, 80)}</small>
        </button>)}
      </div>

      <button className="saveBtn" onClick={async () => saveThreadToFirebase(selectedThread)}>Save current chat to Firebase</button>

      <div className="sideBlock">
        <b>Conversation Summary</b>
        <ul>{summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>

      <div className="sideBlock">
        <b>Reply Helper</b>
        <div className="selectedBox">
          <small>Selected message</small>
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
          <button onClick={copyReply}><Copy size={18}/> Copy</button>
          <a className="send" href="https://www.messenger.com/" target="_blank" rel="noreferrer"><Send size={18}/> Messenger</a>
        </div>
      </div>

      <div className="sideBlock">
        <h3><Upload size={17}/> Paste / Import Chat</h3>
        <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Paste messages line by line..."></textarea>
        <button onClick={addManualThread}><RefreshCw size={18}/> Add as thread</button>
      </div>
    </aside>

    <main className="main">
      <section className="panel mirrorPanel">
        <header><h2>Original Language</h2><span>{selectedThread?.name}</span></header>
        <div className="mirrorList">
          {selectedThread?.messages.map((m, i) => <button key={i} onClick={() => setSelectedMessageIndex(i)} className={`mirrorRow ${m.from} ${selectedMessageIndex === i ? 'selected' : ''}`}>
            <span className="sender">{m.from === 'them' ? 'Them' : 'Me'}</span>
            <span className="sentence">{m.text}</span>
          </button>)}
        </div>
      </section>

      <section className="panel mirrorPanel">
        <header><h2>Translation</h2><span>{targetLang}</span></header>
        <div className="mirrorList">
          {selectedThread?.messages.map((m, i) => <button key={i} onClick={() => setSelectedMessageIndex(i)} className={`mirrorRow ${m.from} ${selectedMessageIndex === i ? 'selected' : ''}`}>
            <span className="sender">{m.from === 'them' ? 'Them' : 'Me'}</span>
            <span className="sentence">{smartTranslate(m.text, targetLang)}</span>
          </button>)}
        </div>
      </section>
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<App />);
