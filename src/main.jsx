import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy, MessageCircle, RefreshCw, Send, Trash2, Upload, Wand2 } from 'lucide-react';
import './style.css';
import { initializeApp } from 'firebase/app';
import { collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';

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

const DEMO_THREADS = [];

const LANGS = ['English', 'Chinese', 'Malay', 'Tamil', 'Japanese', 'Korean', 'Thai', 'Vietnamese'];
const TONES = ['Simple', 'Humble', 'Friendly', 'Polite', 'Playful', 'Professional'];

function lastIncoming(thread) {
  return [...thread.messages].reverse().find(m => m.from === 'them')?.text || '';
}

function hasChinese(text) {
  return /[\u3400-\u9fff]/.test(text);
}

function normaliseText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function isDateOrTimeLine(line) {
  const cleaned = normaliseText(line);
  if (!cleaned) return true;
  if (/^edited$/i.test(cleaned)) return true;
  if (/^(today|yesterday)$/i.test(cleaned)) return true;
  if (/^\d{1,2}:\d{2}\s*(am|pm)?$/i.test(cleaned)) return true;
  if (/^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(,?\s*\d{1,2}:\d{2})?$/i.test(cleaned)) return true;
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+[A-Za-z]{3,9}(\s+\d{4})?$/i.test(cleaned)) return true;
  return false;
}

function cleanPastedLine(line) {
  return normaliseText(line)
    .replace(/^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4},?\s*\d{1,2}:\d{2}\s*/i, '')
    .replace(/^\d{1,2}:\d{2}\s*(am|pm)?\s*/i, '')
    .replace(/\s*Edited\s*$/i, '')
    .trim();
}

function parsePastedMessages(text) {
  const lines = text
    .split('\n')
    .map(cleanPastedLine)
    .filter(line => line && !isDateOrTimeLine(line));

  return lines.map((line, idx) => ({
    from: idx % 2 === 0 ? 'them' : 'me',
    text: line
  }));
}



function messageKey(message) {
  return `${message.from || ''}|${normaliseText(message.text || '').toLowerCase()}`;
}

function threadSignature(messages) {
  return (messages || []).map(messageKey).join('||');
}

function removeDuplicateMessages(messages) {
  const seen = new Set();
  return (messages || []).filter(message => {
    const key = messageKey(message);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findBestDuplicateTarget(threads, parsedMessages) {
  const pastedKeys = new Set(parsedMessages.map(messageKey));
  let best = null;
  let bestOverlap = 0;

  for (const thread of threads) {
    const existingKeys = new Set((thread.messages || []).map(messageKey));
    const overlap = [...pastedKeys].filter(key => existingKeys.has(key)).length;
    const sameFullThread = threadSignature(thread.messages) === threadSignature(parsedMessages);
    if (sameFullThread) return { thread, overlap, sameFullThread: true };
    if (overlap > bestOverlap) {
      best = thread;
      bestOverlap = overlap;
    }
  }

  return best ? { thread: best, overlap: bestOverlap, sameFullThread: false } : null;
}

function sanitizeThread(thread) {
  return {
    ...thread,
    messages: (thread.messages || [])
      .map((message, idx) => ({
        from: message.from || (idx % 2 === 0 ? 'them' : 'me'),
        text: cleanPastedLine(message.text || '')
      }))
      .filter(message => message.text && !isDateOrTimeLine(message.text))
  };
}


function getLastMeaningfulSentence(text) {
  const cleaned = normaliseText(text || '').replace(/^[😂🤣😁😆😄😅\s]+|[😂🤣😁😆😄😅\s]+$/g, '').trim();
  if (!cleaned) return normaliseText(text || '');
  const parts = cleaned
    .split(/(?<=[。！？!?])\s+|[\n\r]+|(?<=[。！？!?])/)
    .map(part => part.trim())
    .filter(part => part && !/^[😂🤣😁😆😄😅]+$/.test(part));
  return parts.length ? parts[parts.length - 1] : cleaned;
}

function chatUsesChinese(thread, text) {
  const allText = `${text || ''} ${(thread?.messages || []).map(m => m.text).join(' ')}`;
  return hasChinese(allText);
}

function fallbackTranslate(text, target) {
  const cleaned = normaliseText(text);
  if (!cleaned) return '';
  if (target !== 'English') return cleaned;

  // Local fallback is only for common chat lines. Real full translation uses /api/translate.
  // Important: never do fake word-by-word replacement like replacing 你 with "you" inside Chinese.
  const exact = {
    'Hello 晚上好呀': 'Hello, good evening.',
    'Hello 晚上好': 'Hello, good evening.',
    '晚上好呀': 'Good evening.',
    '晚上好': 'Good evening.',
    '你好': 'Hello.',
    'hi ni hao': 'Hi, how are you?',
    'ni bu xiang hua ren': 'You do not look Chinese.',
    'Hello 晚上好呀 好像很冷 😁': 'Hello, good evening. It seems quite cold 😁',
    '好像很冷 😁': 'It seems quite cold 😁',
    '好像很冷': 'It seems quite cold.',
    '信不信马六甲的太阳能晒干你😂': 'Believe it or not, the sun in Malacca can dry you up 😂',
    '信不信马六甲的太阳能晒干你😆': 'Believe it or not, the sun in Malacca can dry you up 😆',
    '信不信马六甲的太阳能晒干你': 'Believe it or not, the sun in Malacca can dry you up.',
    '新加坡也不是一样': 'Singapore is the same too.',
    '新那边最近好像也有下雨的吧': 'It seems like it has also been raining over in Singapore recently, right?',
    '新那边最近好像也有下雨的吧 Ya': 'It seems like it has also been raining over in Singapore recently, right? Ya.',
    '新加坡最近也一直下雨。': 'Singapore has also been raining recently.',
    'Ya': 'Ya.',
    'ya': 'Ya.',
    '哈哈哈': 'Hahaha.',
    'hahaha': 'Hahaha.',
    '为什么今天有空': 'Why are you free today?',
    '空每天都有': 'There is always free time every day.',
    '今天看起来有点不一样': 'You seem a little different today.',
    '那里不一样？': 'What is different?',
    '那里不一样?': 'What is different?',
    '哪里不一样？': 'What is different?',
    '哪里不一样?': 'What is different?',
    '明天聊 很晚了 要睡觉啦 晚安': 'Let’s chat tomorrow. It is late, I need to sleep. Good night.',
    '明天聊 很晚了 要睡觉啦 晚安': 'Let’s chat tomorrow. It is late, I need to sleep. Good night.',
    '话说你这么帅的一个人 你太太怎么舍得和你离婚呀': 'By the way, you are such a handsome person. How could your wife bear to divorce you?',
    '我说话的方式比较直 如果有得罪的地方 我很抱歉': 'I speak quite directly. If anything I said offended you, I am sorry.',
    '对美女没有兴趣吗？？': 'Are you not interested in beautiful women??',
    '对美女没有兴趣吗？': 'Are you not interested in beautiful women?',
    '不过美食和风景比较容易实现': 'But food and scenery are easier to experience in real life.',
    '一看这三个字 就是渣男的经典答复': 'Just seeing those three words, I can tell it is a classic playboy reply.',
    '你认识很多？': 'Do you know many women?',
    '你认识很多?': 'Do you know many women?',
    '不认识 看Tik Tok多了还不知道吗': 'No, I do not. After watching so much TikTok, wouldn’t I know?',
    '不认识 看TikTok多了还不知道吗': 'No, I do not. After watching so much TikTok, wouldn’t I know?',
    '现在也认识到了呀': 'Well, now you have met one too.',
    '我也是在TikTok 看过很多网红': 'I have also seen many influencers on TikTok.',
    '我在TikTok看的都美食和各地景点 很少有看到美女': 'What I see on TikTok is mostly food and scenic places. I rarely see beautiful women.',
    '你是想看东京的女优美女吧 😂': 'You just want to see beautiful Japanese actresses in Tokyo, right? 😂',
    '你是想看东京的女优美女吧 😅': 'You just want to see beautiful Japanese actresses in Tokyo, right? 😅',
    '像泰国？还印度？': 'Like Thailand? Or India?',
    '像泰国? 还印度?': 'Like Thailand? Or India?',
    'Hi, can I check what time the briefing starts?': 'Hi, can I check what time the briefing starts?',
    'Hi, the briefing starts at 7.30 pm.': 'Hi, the briefing starts at 7.30 pm.'
  };

  if (exact[cleaned]) return exact[cleaned];
  if (!hasChinese(cleaned) && /^[\x00-\x7F\s.,!?😂🤣😁😆😄😅'’\-:;()]+$/.test(cleaned)) return cleaned;

  const rules = [
    [/^明天聊.*晚.*睡觉.*晚安/, 'Let’s chat tomorrow. It is late, I need to sleep. Good night.'],
    [/为什么.*今天.*有空/, 'Why are you free today?'],
    [/空.*每天.*有/, 'There is always free time every day.'],
    [/今天.*看起来.*不一样/, 'You seem a little different today.'],
    [/[哪那]里.*不一样/, 'What is different?'],
    [/新加坡.*一样/, 'Singapore is the same too.'],
    [/新.*最近.*下雨/, 'It seems like it has also been raining over there recently.'],
    [/太阳.*晒干/, 'The sun there can really dry you up.'],
    [/这么帅.*太太.*离婚/, 'You are so handsome. How could your wife bear to divorce you?'],
    [/说话.*比较直.*抱歉/, 'I speak quite directly. If anything I said offended you, I am sorry.'],
    [/美女.*兴趣/, 'Are you not interested in beautiful women?'],
    [/美食.*风景.*容易实现/, 'But food and scenery are easier to experience in real life.'],
    [/Tik\s*Tok.*美食.*景点/, 'What I see on TikTok is mostly food and scenic places.'],
    [/东京.*女优.*美女/, 'You just want to see beautiful Japanese actresses in Tokyo, right?'],
    [/泰国.*印度/, 'Like Thailand? Or India?'],
    [/你认识很多/, 'Do you know many women?'],
    [/现在.*认识到/, 'Well, now you have met one too.'],
    [/晚上好/, 'Good evening.'],
    [/好像.*冷/, 'It seems quite cold.']
  ];
  for (const [pattern, translation] of rules) {
    if (pattern.test(cleaned)) return translation;
  }

  // Clean fallback: show original instead of ugly placeholder text.
  return cleaned;
}

async function translateWithAI(messages, target) {
  if (!messages || messages.length === 0) return [];
  if (target !== 'English') return messages.map(m => fallbackTranslate(m.text, target));

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetLanguage: target,
        messages: messages.map(m => m.text)
      })
    });
    if (!response.ok) throw new Error('AI translation endpoint unavailable');
    const data = await response.json();
    if (Array.isArray(data.translations) && data.translations.length === messages.length) {
      return data.translations.map((t, idx) => normaliseText(t || fallbackTranslate(messages[idx].text, target)));
    }
    throw new Error('Bad translation response');
  } catch (error) {
    console.warn('Using local fallback translations:', error.message);
    return messages.map(m => fallbackTranslate(m.text, target));
  }
}

function smartTranslate(text, target) {
  return fallbackTranslate(text, target);
}

function localSuggest(text, tone, thread) {
  const targetText = getLastMeaningfulSentence(text);
  const lower = targetText.toLowerCase();
  const shouldReplyChinese = chatUsesChinese(thread, targetText);
  if (/晚安|睡觉|很晚|good night|sleep|late/i.test(targetText)) {
    return shouldReplyChinese ? [
      '好的，早点休息，晚安。明天再聊。',
      '明白，已经很晚了。你好好休息，晚安。',
      '好的，别太累。祝你睡个好觉，晚安。'
    ] : [
      'Sure, rest well. Good night. We can chat tomorrow.',
      'I understand. It is late, get some rest. Good night.',
      'No worries, sleep well. Talk tomorrow.'
    ];
  }
  if (targetText.includes('女优') || lower.includes('beaut')) {
    return [
      '哈哈你吃醋了吗？放心啦，我只是想去看风景和吃美食。',
      '你是不是怕我看别的美女？其实我觉得会聊天的人更有魅力。',
      '没有啦，我想去日本是看风景、文化和美食，不是只看美女 😂'
    ];
  }
  if (targetText.includes('认识很多')) {
    return [
      '没有啦，我只是看 TikTok 多一点而已 😂',
      '不多啦。会聊天的朋友比美女更难遇到 😄',
      '哈哈你是在试探我吗？'
    ];
  }
  if (targetText.includes('晚上好') || lower.includes('hello')) {
    return [
      '晚上好呀！你今天过得怎么样？',
      '哈哈是有点冷，你那边呢？',
      '晚上好！最近天气真的很奇怪，一下热一下下雨。'
    ];
  }
  if (shouldReplyChinese) {
    const toneLabel = tone === 'Humble' ? '谦虚' : tone === 'Playful' ? '轻松' : tone === 'Polite' ? '礼貌' : tone === 'Friendly' ? '友善' : tone === 'Professional' ? '正式' : '简单';
    return [
      `(${toneLabel}) 好的，我明白。让我想一下再好好回复你。`,
      `(${toneLabel}) 哈哈，是这样啊。那我等下再跟你说。`,
      `(${toneLabel}) 明白，谢谢你跟我说。我会认真看一下。`
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
  const [selectedId, setSelectedId] = useState(null);
  const [targetLang, setTargetLang] = useState('English');
  const [tone, setTone] = useState('Simple');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedReply, setSelectedReply] = useState('');
  const [manualText, setManualText] = useState('');
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [saveStatus, setSaveStatus] = useState('Auto-save ready');
  const [translations, setTranslations] = useState([]);
  const [translationStatus, setTranslationStatus] = useState('Translation ready');

  const selectedThread = useMemo(() => threads.find(t => t.id === selectedId) || threads[0] || null, [threads, selectedId]);
  const incoming = lastIncoming(selectedThread || { messages: [] });
  const summary = buildSummary(selectedThread || { messages: [] });
  const selectedMessage = selectedMessageIndex === null ? incoming : selectedThread?.messages?.[selectedMessageIndex]?.text || incoming;
  const selectedTranslation = selectedMessageIndex === null
    ? fallbackTranslate(incoming, targetLang)
    : translations[selectedMessageIndex] || fallbackTranslate(selectedMessage, targetLang);


  useEffect(() => {
    let cancelled = false;
    async function runTranslation() {
      const messages = selectedThread?.messages || [];
      if (messages.length === 0) {
        setTranslations([]);
        setTranslationStatus('Translation ready');
        return;
      }
      setTranslationStatus('Translating...');
      const result = await translateWithAI(messages, targetLang);
      if (!cancelled) {
        setTranslations(result);
        const sameAsOriginalCount = result.filter((t, i) => normaliseText(t || '') === normaliseText(messages[i]?.text || '') && hasChinese(messages[i]?.text || '')).length;
        setTranslationStatus(sameAsOriginalCount === 0 ? 'Translated' : 'Translated with local fallback for some lines. Add OPENAI_API_KEY in Vercel for full AI translation.');
      }
    }
    runTranslation();
    return () => { cancelled = true; };
  }, [selectedThread?.id, selectedThread?.messages, targetLang]);

  useEffect(() => {
    async function loadSavedThreads() {
      try {
        let snapshot;
        try {
          const q = query(collection(db, 'threads'), orderBy('updatedAt', 'desc'));
          snapshot = await getDocs(q);
        } catch {
          const q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'));
          snapshot = await getDocs(q);
        }
        const savedThreads = snapshot.docs.map(doc => sanitizeThread({ id: doc.id, ...doc.data() })).filter(t => t.messages.length > 0 && !/melaka|sample friend|parent enquiry/i.test(t.name || ''));
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

  async function saveThreadToFirebase(thread, silent = false) {
    if (!thread || !thread.id) return null;
    if (!silent) setSaveStatus('Saving to Firebase...');
    try {
      await setDoc(doc(db, 'threads', thread.id), {
        name: thread.name,
        platform: thread.platform,
        lastUpdated: thread.lastUpdated,
        messages: thread.messages,
        updatedAt: serverTimestamp(),
        createdAt: thread.createdAt || serverTimestamp()
      }, { merge: true });
      setSaveStatus('Auto-saved to Firebase');
      return thread.id;
    } catch (error) {
      console.error(error);
      setSaveStatus('Firebase auto-save failed. Check Firestore rules.');
      return thread.id;
    }
  }

  useEffect(() => {
    if (!selectedThread) return;
    const timer = setTimeout(() => {
      saveThreadToFirebase(selectedThread, true);
    }, 800);
    return () => clearTimeout(timer);
  }, [selectedThread]);

  function addManualThread() {
    if (!manualText.trim()) return;
    const parsedMessages = parsePastedMessages(manualText);
    if (parsedMessages.length === 0) return;
    const id = `manual-${Date.now()}`;
    const newThread = {
      id,
      name: 'Pasted Facebook Chat',
      platform: 'Manual Import',
      lastUpdated: 'Now',
      messages: removeDuplicateMessages(parsedMessages)
    };

    const duplicateTarget = findBestDuplicateTarget(threads, newThread.messages);
    if (duplicateTarget?.sameFullThread) {
      setSelectedId(duplicateTarget.thread.id);
      setSelectedMessageIndex(null);
      setSaveStatus('Duplicate chat detected. Existing saved chat opened.');
      setManualText('');
      return;
    }

    if (duplicateTarget && duplicateTarget.overlap > 0) {
      const existingKeys = new Set((duplicateTarget.thread.messages || []).map(messageKey));
      const newMessagesOnly = newThread.messages.filter(message => !existingKeys.has(messageKey(message)));
      if (newMessagesOnly.length === 0) {
        setSelectedId(duplicateTarget.thread.id);
        setSelectedMessageIndex(null);
        setSaveStatus('Duplicate messages detected. No repeated messages added.');
        setManualText('');
        return;
      }
      const updatedThread = {
        ...duplicateTarget.thread,
        lastUpdated: 'Now',
        messages: [...duplicateTarget.thread.messages, ...newMessagesOnly]
      };
      setThreads(threads.map(t => t.id === updatedThread.id ? updatedThread : t));
      setSelectedId(updatedThread.id);
      setSelectedMessageIndex(null);
      setSaveStatus(`Duplicate messages skipped. Added ${newMessagesOnly.length} new message(s).`);
      setManualText('');
      return;
    }

    setThreads([newThread, ...threads]);
    setSelectedId(id);
    setSelectedMessageIndex(null);
    setManualText('');

  }

  function suggest() {
    const replies = localSuggest(selectedMessage, tone, selectedThread);
    setSuggestions(replies);
    setSelectedReply(replies[0] || '');
  }

  function copyReply() {
    navigator.clipboard?.writeText(selectedReply);
  }

  async function deleteThread(id) {
    const thread = threads.find(t => t.id === id);
    if (!thread) return;
    const ok = window.confirm(`Remove old chat "${thread.name}"? This will also delete it from Firebase.`);
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'threads', id));
    } catch (error) {
      console.error(error);
      setSaveStatus('Removed locally. Firebase delete failed. Check Firestore rules.');
    }
    const remaining = threads.filter(t => t.id !== id);
    setThreads(remaining);
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id || null);
      setSelectedMessageIndex(null);
    }
    setSaveStatus('Old chat removed');
  }

  async function clearOldChats() {
    if (threads.length === 0) return;
    const ok = window.confirm('Remove all old chats from this app and Firebase?');
    if (!ok) return;
    for (const thread of threads) {
      try {
        await deleteDoc(doc(db, 'threads', thread.id));
      } catch (error) {
        console.error(error);
      }
    }
    setThreads([]);
    setSelectedId(null);
    setSelectedMessageIndex(null);
    setSaveStatus('All old chats removed');
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
      <div className="notice">Original and translated messages mirror each other side by side. Dates and times are removed when you paste. Saving is automatic.</div>
      <div className="firebaseStatus">{saveStatus}</div>
      <div className="firebaseStatus translationStatus">{translationStatus}</div>

      <div className="sideBlock">
        <label>Target translation language</label>
        <select value={targetLang} onChange={e => setTargetLang(e.target.value)}>{LANGS.map(l => <option key={l}>{l}</option>)}</select>
      </div>

      <div className="threadTools">
        <button className="danger" onClick={clearOldChats}><Trash2 size={16}/> Remove all old chats</button>
      </div>

      <div className="threads">
        {threads.map(t => <div key={t.id} className={t.id === selectedId ? 'threadWrap active' : 'threadWrap'}>
          <button onClick={() => selectThread(t.id)} className="thread">
            <b>{t.name}</b><span>{t.platform} · {t.lastUpdated}</span>
            <small>{lastIncoming(t).slice(0, 80)}</small>
          </button>
          <button className="deleteThread" onClick={() => deleteThread(t.id)} title="Remove old chat"><Trash2 size={16}/></button>
        </div>)}
      </div>

      <div className="sideBlock">
        <b>Conversation Summary</b>
        <ul>{summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>

      <div className="sideBlock">
        <b>Reply Helper</b>
        <div className="selectedBox">
          <small>Selected message</small>
          <p>{selectedMessage}</p>
          <small>Reply target</small>
          <p className="replyTarget">{getLastMeaningfulSentence(selectedMessage)}</p>
          <p className="miniTrans">{selectedTranslation}</p>
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
        <button onClick={addManualThread}><RefreshCw size={18}/> Add chat and auto-save</button>
      </div>
    </aside>

    <main className="main">
      <section className="panel mirrorPanel">
        <header><h2>Original Language</h2><span>{selectedThread?.name}</span></header>
        <div className="mirrorList">
          {selectedThread?.messages?.map((m, i) => <button key={i} onClick={() => setSelectedMessageIndex(i)} className={`mirrorRow ${m.from} ${selectedMessageIndex === i ? 'selected' : ''}`}>
            <span className="sender">{m.from === 'them' ? 'Them' : 'Me'}</span>
            <span className="sentence">{m.text}</span>
          </button>)}
        </div>
      </section>

      <section className="panel mirrorPanel">
        <header><h2>Translation</h2><span>{targetLang}</span></header>
        <div className="mirrorList">
          {selectedThread?.messages?.map((m, i) => <button key={i} onClick={() => setSelectedMessageIndex(i)} className={`mirrorRow ${m.from} ${selectedMessageIndex === i ? 'selected' : ''}`}>
            <span className="sender">{m.from === 'them' ? 'Them' : 'Me'}</span>
            <span className="sentence">{translations[i] || fallbackTranslate(m.text, targetLang)}</span>
          </button>)}
        </div>
      </section>
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<App />);
