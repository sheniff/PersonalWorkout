import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { History } from './screens/History';
import { Progress } from './screens/Progress';
import { Session } from './screens/Session';
import { SessionDetail } from './screens/SessionDetail';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { useStore } from './state/StoreContext';

export default function App() {
  const location = useLocation();
  const { ready } = useStore();

  // The session screen is full-bleed: no nav competing with the set list.
  const hideNav = location.pathname.startsWith('/session/');

  if (!ready) return <div className="app" />;

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/session/:id" element={<Session />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<SessionDetail />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {hideNav ? null : <BottomNav />}
    </div>
  );
}
