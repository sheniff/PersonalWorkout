import { NavLink } from 'react-router-dom';
import { IconChart, IconDumbbell, IconHistory, IconSettings } from './Icons';

const items = [
  { to: '/', label: 'Today', Icon: IconDumbbell, end: true },
  { to: '/history', label: 'History', Icon: IconHistory, end: false },
  { to: '/progress', label: 'Progress', Icon: IconChart, end: false },
  { to: '/settings', label: 'Settings', Icon: IconSettings, end: false },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => (isActive ? 'nav-item nav-item--active' : 'nav-item')}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
