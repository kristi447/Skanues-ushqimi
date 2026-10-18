import { useEffect, useState } from 'react';
import { backend, type Room, type Session } from '../api';
import { Avatar } from '../components/Avatar';
import { DecodeText } from '../components/DecodeText';
import { Spinner } from '../components/Spinner';
import { StatusBar } from '../components/StatusBar';
import { StatusDot } from '../components/StatusDot';
import { config } from '../config';
import { formatMinutes, msUntil, pad2, splitDuration } from '../lib/time';
import { useNow } from '../lib/useNow';
import '../styles/rooms.css';

export function SessionTimer() {
  const now = useNow();
  const { h, m, s } = splitDuration(msUntil(now, config.closeAt));
  return (
    <span className="session-timer" title="Time until the channel closes">
      T-{h > 0 ? `${h}:` : ''}
      {pad2(m)}:{pad2(s)}
    </span>
  );
}

export function RoomsScreen({
  session,
  onEnter,
  onDisconnect,
  onPurge,
}: {
  session: Session;
  onEnter: (room: Room) => void;
  onDisconnect: () => void;
  onPurge: () => void;
}) {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);

  useEffect(() => {
    let live = true;
    backend
      .listRooms(session)
      .then((r) => live && setRooms(r))
      .catch(() => live && setError('CHANNEL DIRECTORY UNREACHABLE'));
    return () => {
      live = false;
    };
  }, [session]);

  return (
    <main className="screen rooms">
      <StatusBar
        left={
          <button className="icon-btn" onClick={onDisconnect} aria-label="Disconnect">
            EXIT
          </button>
        }
        right={<SessionTimer />}
      />

      <section className="rooms__body">
        <div className="rooms__whoami">
          <Avatar id={session.user.avatarId} size={44} />
          <div>
            <div className="label">Connected as</div>
            <div className="rooms__nick">{session.user.nickname}</div>
          </div>
        </div>

        <div className="rooms__dir">
          <div className="rooms__dir-head">
            <span className="label">/channels</span>
            <span className="label">{rooms ? `${rooms.length} found` : 'scanning'}</span>
          </div>

          {error ? (
            <p className="rooms__error">{error}</p>
          ) : !rooms ? (
            <p className="rooms__loading">
              <Spinner /> SCANNING FOR CHANNELS
            </p>
          ) : (
            <ul className="rooms__list">
              {rooms.map((room, i) => (
                <li key={room.id}>
                  <button className="room" onClick={() => onEnter(room)}>
                    <span className="room__idx">{pad2(i + 1)}</span>
                    <span className="room__main">
                      <span className="room__name">
                        #<DecodeText text={room.name} duration={500} delay={i * 120} />
                      </span>
                      <span className="room__meta">
                        <StatusDot online />
                        {room.online ?? '—'} ONLINE · E2EE
                      </span>
                    </span>
                    <span className="room__go" aria-hidden>
                      ENTER &gt;
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rooms__dir">
          <div className="rooms__dir-head">
            <span className="label">/status</span>
          </div>
          <dl className="sysinfo">
            <div>
              <dt>LINK</dt>
              <dd>SECURE</dd>
            </div>
            <div>
              <dt>CIPHER</dt>
              <dd>AES-256-GCM</dd>
            </div>
            <div>
              <dt>WINDOW</dt>
              <dd>
                {formatMinutes(config.openAt)}-{formatMinutes(config.closeAt)}
              </dd>
            </div>
            <div>
              <dt>ALIAS</dt>
              <dd>{session.user.nickname}</dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="rooms__foot">
        <span>CHANNEL CLOSES AT {formatMinutes(config.closeAt)} LOCAL</span>
        {confirmPurge ? (
          <span className="rooms__purge">
            ERASE ALIAS FROM THIS DEVICE? <button onClick={onPurge}>[YES]</button>{' '}
            <button onClick={() => setConfirmPurge(false)}>[NO]</button>
          </span>
        ) : (
          <button className="rooms__purge-link" onClick={() => setConfirmPurge(true)}>
            purge identity
          </button>
        )}
      </footer>
    </main>
  );
}
