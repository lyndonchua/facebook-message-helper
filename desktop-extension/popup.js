async function captureVisibleText(){
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  const [{result}] = await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
    const candidates=[...document.querySelectorAll('[role="main"] [dir="auto"], [aria-label*="Message"] [dir="auto"], div[dir="auto"]')];
    const texts=candidates.map(el=>(el.innerText||el.textContent||'').trim()).filter(t=>t.length>1 && t.length<800);
    const unique=[...new Set(texts)].slice(-80);
    return unique.join('\n');
  }});
  document.getElementById('out').value=result||'';
}
document.getElementById('capture').onclick=captureVisibleText;
document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(document.getElementById('out').value);
