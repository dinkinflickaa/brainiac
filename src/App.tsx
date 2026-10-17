import { useCallback, useMemo, useState } from 'react';
import { NavContext, type Nav, type Route } from './app/nav';
import { getState } from './state/store';
import { Done, Home, Onboarding, WorldScreen } from './screens/Home';
import { Play } from './screens/Play';
import { Lesson, TrickBook } from './screens/Learn';
import { Treasure } from './screens/Treasure';
import { Parent } from './screens/Parent';
import { SpeedCheck } from './screens/SpeedCheck';
import { Studio } from './screens/Studio';
import { stopVoice } from './audio/voice';
import { QA } from './screens/QA';

export default function App() {
  const [stack, setStack] = useState<Route[]>(() => [getState().onboarded ? { name: 'home' } : { name: 'onboarding' }]);
  const route = stack[stack.length - 1];

  const go = useCallback((r: Route) => {
    stopVoice();
    // Finishing a session replaces the play screen, so "back" from results goes home.
    setStack((s) => (r.name === 'done' || (r.name === 'play' && s[s.length - 1].name === 'done') ? [...s.slice(0, -1), r] : r.name === 'home' ? [r] : [...s, r]));
  }, []);
  const back = useCallback(() => {
    stopVoice();
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ name: 'home' }]));
  }, []);
  const home = useCallback(() => { stopVoice(); setStack([{ name: 'home' }]); }, []);
  const nav: Nav = useMemo(() => ({ go, back, home }), [go, back, home]);

  if (location.hash.startsWith('#qa=')) return <QA />;
  let screen: React.ReactNode;
  switch (route.name) {
    case 'onboarding': screen = <Onboarding />; break;
    case 'home': screen = <Home />; break;
    case 'world': screen = <WorldScreen id={route.id} />; break;
    case 'play': screen = <Play key={route.key} spec={route.spec} />; break;
    case 'lesson': screen = <Lesson key={route.trickId} trickId={route.trickId} />; break;
    case 'trickbook': screen = <TrickBook />; break;
    case 'treasure': screen = <Treasure />; break;
    case 'parent': screen = <Parent />; break;
    case 'speedcheck': screen = <SpeedCheck />; break;
    case 'studio': screen = <Studio />; break;
    case 'done': screen = <Done summary={route.summary} />; break;
  }
  return (
    <NavContext.Provider value={nav}>
      <div style={{ position: 'fixed', inset: 0 }} key={stack.length + route.name}>{screen}</div>
    </NavContext.Provider>
  );
}
