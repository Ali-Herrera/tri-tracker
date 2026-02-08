import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='app-layout'>
      <button
        className='mobile-menu-btn'
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label='Toggle menu'
      >
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className='sidebar-header'>
          <h2>Tri Tracker</h2>
        </div>

        <nav className='sidebar-nav'>
          <NavLink to='/' end onClick={() => setSidebarOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to='/calendar' onClick={() => setSidebarOpen(false)}>
            Calendar
          </NavLink>
          <NavLink to='/adaptation' onClick={() => setSidebarOpen(false)}>
            Adaptation Lab
          </NavLink>
          <NavLink to='/friends' onClick={() => setSidebarOpen(false)}>
            Friends
          </NavLink>
          <NavLink to='/import' onClick={() => setSidebarOpen(false)}>
            Import
          </NavLink>
          <NavLink to='/references' onClick={() => setSidebarOpen(false)}>
            References
          </NavLink>
        </nav>

        <div className='sidebar-footer'>
          <span className='user-email'>{user?.email}</span>
          <button onClick={signOut} className='sign-out-btn'>
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className='sidebar-overlay'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className='main-content'>{children}</main>
    </div>
  );
}
