import { useEffect, useRef, useState } from 'react';
import { backend, type Room, type Session } from './api';
import { CrtOverlay } from './components/CrtOverlay';
import { config } from './config';
import { load, remove, save } from './lib/storage';
import { isWindowOpen } from './lib/time';
import { useNow } from './lib/useNow';
import { useViewport } from './lib/useViewport';
import { AccessScreen } from './screens/AccessScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ClosedScreen } from './screens/ClosedScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { RoomsScreen } from './screens/RoomsScreen';
import { TerminatedScreen } from './screens/TerminatedScreen';
import { UnlockScreen } from './screens/UnlockScreen';

type Stage = 'access' | 'unlock' | 'register' | 'rooms' | 'chat';

const SESSION_KEY = 'pu.session';

// Dev-only override for testing outside the window: ?gate=open or ?gate=closed
const devGate = import.meta.env.DEV ? new URLSearchParams(location.search).get('gate') : null;

export default function App() {
  useViewport();
  const now = useNow();
  const open =
    devGate === 'open' ? true : devGate === 'closed' ? false : isWindowOpen(now, config.openAt, config.closeAt);

  const [stage, setStage] = useState<Stage>('access');
  const [ticket, setTicket] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(() => load<Session>(SESSION_KEY));
  const [room, setRoom] = useState<Room | null>(null);
  const [terminated, setTerminated] = useState(false);
  const resumed = useRef<Promise<Session | null>>(Promise.resolve(null));
  const wasOpen = useRef(open);

  // The window closing kicks everyone out; anyone past the code screen sees the shutdown.
  useEffect(() => {
    if (wasOpen.current && !open) {
      if (stage !== 'access') setTerminated(true);
      setStage('access');
      setTicket(null);
      setRoom(null);
    }
    wasOpen.current = open;
  }, [open, stage]);

  const granted = (t: string) => {
    setTicket(t);
    // Re-validate a remembered identity while the lock animation plays.
    resumed.current = session ? backend.resume(t, session).catch(() => null) : Promise.resolve(null);
    setStage('unlock');
  };

  const unlocked = async () => {
    const s = await resumed.current;
    if (s) {
      setSession(s);
      save(SESSION_KEY, s);
      setStage('rooms');
    } else {
      setSession(null);
      remove(SESSION_KEY);
      setStage('register');
    }
  };

  const registered = (s: Session) => {
    setSession(s);
    save(SESSION_KEY, s);
    setStage('rooms');
  };

  const disconnect = () => {
    setTicket(null);
    setRoom(null);
    setStage('access');
  };

  let screen;
  if (terminated) {
    screen = <TerminatedScreen onDone={() => setTerminated(false)} />;
  } else if (!open) {
    screen = <ClosedScreen />;
  } else if (stage === 'unlock') {
    screen = <UnlockScreen operative={session?.user.nickname} onDone={unlocked} />;
  } else if (stage === 'register' && ticket) {
    screen = <RegisterScreen ticket={ticket} onDone={registered} />;
  } else if (stage === 'rooms' && session) {
    screen = (
      <RoomsScreen
        session={session}
        onEnter={(r) => {
          setRoom(r);
          setStage('chat');
        }}
        onDisconnect={disconnect}
        onPurge={() => {
          remove(SESSION_KEY);
          setSession(null);
          disconnect();
        }}
      />
    );
  } else if (stage === 'chat' && session && room) {
    screen = <ChatScreen session={session} room={room} onExit={() => setStage('rooms')} />;
  } else {
    screen = <AccessScreen onGranted={granted} />;
  }

  const key = terminated ? 'terminated' : open ? stage : 'closed';

  return (
    <div className="app">
      <div key={key} className="app__screen">
        {screen}
      </div>
      <CrtOverlay roll={key !== 'chat'} />
    </div>
  );
}
