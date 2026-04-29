'use client';

import { useEffect, useMemo, useState } from 'react';

const DEFAULT_POST_URL = 'https://www.threads.com/@maslowkorea/post/DXoe55xj0NW?xmt=AQF0DSd8iVFHchwXKS0k2O3pD8XC4aFVEIqeUnhhyBA78G8bX9weBGEiiopEWEPBP2uXZ0wC&slof=1';
const STORAGE_KEY = 'threads_video_vercel_state_v1';
const DEFAULT_API = process.env.NEXT_PUBLIC_SCRAPER_API_URL || '';

function loadState() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function Page() {
  const [postUrl, setPostUrl] = useState(DEFAULT_POST_URL);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('대기 중');
  const [filter, setFilter] = useState('ownerNone');
  const [localState, setLocalState] = useState({});
  const [maxScrolls, setMaxScrolls] = useState(80);

  useEffect(() => {
    setLocalState(loadState());
    const savedApi = localStorage.getItem('scraper_api_url') || DEFAULT_API;
    if (savedApi) setApiUrl(savedApi);
  }, []);

  function updateLocal(id, patch) {
    const next = { ...localState, [id]: { ...(localState[id] || {}), ...patch, updatedAt: new Date().toISOString() } };
    setLocalState(next);
    saveState(next);
  }

  async function scan() {
    const base = apiUrl.trim().replace(/\/$/, '');
    if (!base) return alert('스크래핑 서버 주소를 넣어야 한다. 예: https://xxxxx.trycloudflare.com');
    localStorage.setItem('scraper_api_url', base);

    setLoading(true);
    setStatus('스크래핑 서버 호출 중...');
    try {
      const res = await fetch(`${base}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUrl, maxScrolls: Number(maxScrolls) || 80 })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
      setItems(Array.isArray(data.items) ? data.items : []);
      setStatus(`완료: 영상 답글 ${data.videoReplyCount || 0}개 / 대표 답글 없음 ${data.ownerNotRepliedCount || 0}개`);
      setFilter('ownerNone');
    } catch (e) {
      console.error(e);
      setStatus('실패: ' + e.message);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  const merged = useMemo(() => items.map(item => ({
    ...item,
    ui: localState[item.id] || { status: 'new', memo: '' }
  })), [items, localState]);

  const counts = useMemo(() => ({
    total: merged.length,
    ownerNone: merged.filter(x => !x.ownerReplied).length,
    ownerYes: merged.filter(x => x.ownerReplied).length,
    done: merged.filter(x => x.ui?.status === 'done').length,
    hold: merged.filter(x => x.ui?.status === 'hold').length,
    skip: merged.filter(x => x.ui?.status === 'skip').length,
  }), [merged]);

  const visible = useMemo(() => merged.filter(x => {
    const st = x.ui?.status || 'new';
    if (filter === 'ownerNone') return !x.ownerReplied && st !== 'skip';
    if (filter === 'ownerYes') return x.ownerReplied && st !== 'skip';
    if (filter === 'done') return st === 'done';
    if (filter === 'hold') return st === 'hold';
    if (filter === 'skip') return st === 'skip';
    return st !== 'skip';
  }), [merged, filter]);

  return (
    <main className="wrap">
      <section className="hero">
        <div className="box main">
          <h1>Threads 영상 답글함</h1>
          <p className="sub">대표는 이 페이지에서 영상 달린 답글만 보고, 버튼을 눌러 Threads로 이동해서 직접 답글을 달면 된다.</p>
          <div className="target">
            <input value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="Threads 게시글 링크" />
            <button onClick={scan} disabled={loading}>{loading ? '스캔 중...' : '영상 있는 답글만 스캔'}</button>
          </div>
          <div className="api">
            <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="스크래핑 서버 주소 예: https://xxxxx.trycloudflare.com" />
            <input style={{maxWidth:160}} type="number" value={maxScrolls} onChange={e => setMaxScrolls(e.target.value)} placeholder="스크롤" />
          </div>
          <div className="small">기본 글은 @maslowkorea / DXoe55xj0NW. 스크래핑은 Vercel이 아니라 네 컴퓨터의 Python 서버가 한다.</div>
        </div>
        <div className="box side">
          <div>
            <div className="count">{counts.total}</div>
            <div className="muted">영상 답글</div>
          </div>
          <button className="ghost" onClick={() => setItems([])}>화면 비우기</button>
        </div>
      </section>

      <section className="box status">
        <div>{status}</div>
        <div className="chips">
          <span className="chip">전체 <b>{counts.total}</b></span>
          <span className="chip">대표 답글 없음 <b>{counts.ownerNone}</b></span>
          <span className="chip">대표 답글 있음 <b>{counts.ownerYes}</b></span>
          <span className="chip">확인완료 <b>{counts.done}</b></span>
          <span className="chip">보류 <b>{counts.hold}</b></span>
        </div>
      </section>

      <div className="tabs">
        <button className={`tab ${filter==='ownerNone'?'active':''}`} onClick={() => setFilter('ownerNone')}>대표 답글 없음</button>
        <button className={`tab ${filter==='all'?'active':''}`} onClick={() => setFilter('all')}>전체 영상답글</button>
        <button className={`tab ${filter==='ownerYes'?'active':''}`} onClick={() => setFilter('ownerYes')}>대표 답글 있음</button>
        <button className={`tab ${filter==='done'?'active':''}`} onClick={() => setFilter('done')}>확인완료</button>
        <button className={`tab ${filter==='hold'?'active':''}`} onClick={() => setFilter('hold')}>보류</button>
        <button className={`tab ${filter==='skip'?'active':''}`} onClick={() => setFilter('skip')}>제외</button>
      </div>

      <section className="cards">
        {visible.length === 0 ? <div className="empty">표시할 영상 답글이 없다.</div> : visible.map(item => (
          <VideoCard key={item.id} item={item} onUpdate={updateLocal} />
        ))}
      </section>
    </main>
  );
}

function VideoCard({ item, onUpdate }) {
  const [memo, setMemo] = useState(item.ui?.memo || '');
  useEffect(() => setMemo(item.ui?.memo || ''), [item.id, item.ui?.memo]);
  const openUrl = item.replyUrl || item.postUrl;
  const st = item.ui?.status || 'new';

  return (
    <article className="card">
      <div className="head">
        <div>
          <div className="user">{item.author || '@작성자확인'}</div>
          <div className="small">{item.scrapedAt ? new Date(item.scrapedAt).toLocaleString() : ''}</div>
        </div>
        <div className={`badge ${item.ownerReplied ? 'yes' : 'no'}`}>🎥 {item.ownerReplied ? '대표 답글 있음' : '대표 답글 없음'}</div>
      </div>
      <p className="txt">{item.text}</p>
      <div className="row">
        <a className="btn" href={openUrl} target="_blank" rel="noreferrer">Threads에서 답글달기</a>
        <button className="ok" onClick={() => onUpdate(item.id, { status: 'done' })}>확인완료</button>
        <button className="warn" onClick={() => onUpdate(item.id, { status: 'hold' })}>보류</button>
        <button className="danger" onClick={() => onUpdate(item.id, { status: 'skip' })}>제외</button>
      </div>
      <div className="small">현재 상태: {labelStatus(st)}</div>

      {Array.isArray(item.replies) && item.replies.length > 0 && (
        <details className="replies">
          <summary>대댓글 {item.replies.length}개 보기</summary>
          {item.replies.map((r, idx) => (
            <div className="reply" key={idx}>
              <div className="replyAuthor">{r.author}</div>
              <div>{r.text}</div>
            </div>
          ))}
        </details>
      )}

      <div className="memo">
        <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="대표메모" />
        <button className="ghost" onClick={() => onUpdate(item.id, { memo })}>메모저장</button>
      </div>
    </article>
  );
}

function labelStatus(s) {
  if (s === 'done') return '확인완료';
  if (s === 'hold') return '보류';
  if (s === 'skip') return '제외';
  return '신규';
}
