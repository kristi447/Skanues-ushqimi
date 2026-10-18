import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  backend,
  type ChatMessage,
  type LinkStatus,
  type Member,
  type Room,
  type RoomLink,
  type Session,
} from '../api';
import { Avatar } from '../components/Avatar';
import { DecodeText } from '../components/DecodeText';
import { Spinner } from '../components/Spinner';
import { StatusBar } from '../components/StatusBar';
import { StatusDot } from '../components/StatusDot';
import { formatClock } from '../lib/time';
import { Composer } from './Composer';
import { SessionTimer } from './RoomsScreen';
import '../styles/chat.css';

type Item =
  | { kind: 'msg'; key: string; msg: ChatMessage; live: boolean }
  | { kind: 'sys'; key: string; text: string; at: number };

const GROUP_MS = 3 * 60_000;
let localSeq = 0;

function MessageRow({
  msg,
  mine,
  member,
  head,
  live,
  onRetry,
}: {
  msg: ChatMessage;
  mine: boolean;
  member?: Member;
  head: boolean;
  live: boolean;
  onRetry: () => void;
}) {
  const time = formatClock(new Date(msg.sentAt), false);
  return (
    <article className={`msg${mine ? ' msg--mine' : ''}${head ? ' is-head' : ''}${live ? ' is-live' : ''}`}>
      {head &&
        (mine ? (
          <header className="msg__head">
            <span className="msg__time">{time}</span>
            <span className="msg__you">YOU</span>
          </header>
        ) : (
          <header className="msg__head">
            <Avatar id={member?.avatarId ?? ''} size={22} />
            <span className="msg__nick">{member?.nickname ?? 'unknown'}</span>
            <StatusDot online={!!member?.online} />
            <span className="msg__time">{time}</span>
          </header>
        ))}
      <div className="msg__body">
        {live && !mine ? <DecodeText text={msg.text} duration={Math.min(520, 160 + msg.text.length * 8)} /> : msg.text}
      </div>
      {mine && msg.status !== 'sent' && (
        <div className={`msg__state msg__state--${msg.status}`}>
          {msg.status === 'sending' ? 'ENCRYPTING...' : <button onClick={onRetry}>NOT DELIVERED · TAP TO RETRY</button>}
        </div>
      )}
    </article>
  );
}

export function ChatScreen({ session, room, onExit }: { session: Session; room: Room; onExit: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const membersRef = useRef<Record<string, Member>>({});
  const [status, setStatus] = useState<LinkStatus>('connecting');
  const [unseen, setUnseen] = useState(0);
  const [roster, setRoster] = useState(false);
  const linkRef = useRef<RoomLink | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const forceScroll = useRef(false);
  const ready = useRef(false);
  const seenLen = useRef(0);
  const me = session.user.id;

  useEffect(() => {
    ready.current = false;
    const link = backend.joinRoom(session, room.id, {
      onHistory(messages) {
        forceScroll.current = true;
        setItems([
          { kind: 'sys', key: 'open', text: 'SECURE SESSION ESTABLISHED', at: Date.now() },
          ...messages.map((msg) => ({ kind: 'msg' as const, key: msg.id, msg, live: false })),
        ]);
        ready.current = true;
      },
      onMessage(msg) {
        setItems((list) => [...list, { kind: 'msg', key: msg.id, msg, live: true }]);
      },
      onMembers(list) {
        membersRef.current = Object.fromEntries(list.map((m) => [m.id, m]));
        setMembers(membersRef.current);
      },
      onPresence(id, online) {
        const m = membersRef.current[id];
        if (!m || m.online === online) return;
        membersRef.current = { ...membersRef.current, [id]: { ...m, online } };
        setMembers(membersRef.current);
        if (ready.current) {
          setItems((list) => [
            ...list,
            {
              kind: 'sys',
              key: `p-${id}-${Date.now()}`,
              text: `${m.nickname} ${online ? 'CONNECTED' : 'WENT DARK'}`,
              at: Date.now(),
            },
          ]);
        }
      },
      onStatus: setStatus,
    });
    linkRef.current = link;
    return () => {
      link.close();
      linkRef.current = null;
    };
  }, [session, room.id]);

  const transmit = useCallback(async (key: string, text: string) => {
    const update = (patch: Partial<ChatMessage>) =>
      setItems((list) =>
        list.map((it) => (it.kind === 'msg' && it.key === key ? { ...it, msg: { ...it.msg, ...patch } } : it)),
      );
    try {
      const sent = await linkRef.current!.send(text);
      update({ id: sent.id, sentAt: sent.sentAt, status: 'sent' });
    } catch {
      update({ status: 'failed' });
    }
  }, []);

  const send = (text: string) => {
    const key = `local-${++localSeq}`;
    forceScroll.current = true;
    setItems((list) => [
      ...list,
      { kind: 'msg', key, live: false, msg: { id: key, senderId: me, text, sentAt: Date.now(), status: 'sending' } },
    ]);
    transmit(key, text);
  };

  const retry = (key: string, text: string) => {
    setItems((list) =>
      list.map((it) =>
        it.kind === 'msg' && it.key === key ? { ...it, msg: { ...it.msg, status: 'sending' as const } } : it,
      ),
    );
    transmit(key, text);
  };

  // Stick to the bottom unless the reader has scrolled up; then count what they missed.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const added = items.length - seenLen.current;
    seenLen.current = items.length;
    if (forceScroll.current || atBottom.current) {
      el.scrollTop = el.scrollHeight;
      forceScroll.current = false;
      setUnseen(0);
    } else if (added > 0) {
      setUnseen((n) => n + added);
    }
  }, [items]);

  // Keep the latest line in view when the keyboard resizes the viewport or content grows.
  useEffect(() => {
    const el = listRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  const memberList = useMemo(
    () =>
      Object.values(members).sort(
        (a, b) => Number(b.online) - Number(a.online) || a.nickname.localeCompare(b.nickname),
      ),
    [members],
  );
  const onlineCount = memberList.filter((m) => m.online).length;

  return (
    <main className="screen chat">
      <div className="chat__top">
        <StatusBar
          left={
            <button className="icon-btn" onClick={onExit} aria-label="Leave room">
              &lt; EXIT
            </button>
          }
          right={<SessionTimer />}
        />
        <div className="chat__channel">
          <span className="chat__room">#{room.name}</span>
          {status !== 'live' && (
            <span className={`chat__link chat__link--${status}`}>
              <Spinner /> {status === 'lost' ? 'LINK LOST · RETRYING' : 'LINKING'}
            </span>
          )}
          <button className="chat__roster-btn" onClick={() => setRoster((r) => !r)} aria-expanded={roster}>
            <StatusDot online={onlineCount > 0} />
            {onlineCount}/{memberList.length} ONLINE
          </button>
        </div>
        {roster && (
          <ul className="roster" aria-label="Members">
            {memberList.map((m) => (
              <li key={m.id} className={`roster__item${m.online ? '' : ' is-off'}`}>
                <Avatar id={m.avatarId} size={22} />
                <span className="roster__nick">
                  {m.nickname}
                  {m.id === me && <span className="roster__me"> (you)</span>}
                </span>
                <StatusDot online={m.online} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        ref={listRef}
        className="chat__feed"
        role="log"
        aria-live="polite"
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          if (atBottom.current && unseen) setUnseen(0);
        }}
      >
        {items.length === 0 && (
          <div className="chat__empty">
            <Spinner /> ESTABLISHING SECURE LINK
          </div>
        )}
        <div ref={innerRef}>
          {items.map((it, i) => {
            if (it.kind === 'sys') {
              return (
                <div key={it.key} className="sys">
                  <span>
                    {it.text} · {formatClock(new Date(it.at), false)}
                  </span>
                </div>
              );
            }
            const prev = items[i - 1];
            const head =
              !prev ||
              prev.kind !== 'msg' ||
              prev.msg.senderId !== it.msg.senderId ||
              it.msg.sentAt - prev.msg.sentAt > GROUP_MS;
            return (
              <MessageRow
                key={it.key}
                msg={it.msg}
                mine={it.msg.senderId === me}
                member={members[it.msg.senderId]}
                head={head}
                live={it.live}
                onRetry={() => retry(it.key, it.msg.text)}
              />
            );
          })}
        </div>
      </div>

      {unseen > 0 && (
        <button
          className="chat__unseen"
          onClick={() => {
            const el = listRef.current;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            setUnseen(0);
          }}
        >
          {unseen} NEW ↓
        </button>
      )}

      <Composer onSend={send} disabled={status !== 'live'} />
    </main>
  );
}
