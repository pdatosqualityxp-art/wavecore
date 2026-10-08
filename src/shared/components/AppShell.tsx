import { useEffect, useState } from 'react';
import {
  BarChart3,
  BellDot,
  BriefcaseBusiness,
  ChartPie,
  ChevronDown,
  ClipboardList,
  Cpu,
  DatabaseZap,
  Factory,
  FileText,
  FolderKanban,
  Gauge,
  Globe2,
  Home,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Radio,
  ShieldCheck,
  Sun,
  Target,
  UserRound,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import LanguageSelector from './LanguageSelector';

export default function AppShell() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, profileStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  const userProfile = user && profile?.id === user.id ? profile : null;
  const isAnonymous = user?.is_anonymous ?? false;
  const userName = isAnonymous
    ? t('menu.anonymousName')
    : user
    ? userProfile?.display_name?.trim()
      || userProfile?.email
      || user.email
      || (profileStatus === 'loading' ? t('menu.profileLoading') : t('menu.profileUnavailable'))
    : t('menu.guest');
  const userSubtitle = isAnonymous
    ? t('menu.anonymousEmail')
    : userProfile?.email ?? user?.email ?? (!user ? t('menu.guest') : '');
  const themeLabel = theme === 'dark' ? t('menu.switchToLight') : t('menu.switchToDark');

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(false);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setIsUserMenuOpen(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Failed to sign out:', error);
      setSignOutError(true);
      setIsSigningOut(false);
    }
  }

  const demoMenuItems = [
    { to: '/demo-1', labelKey: 'menu.test1', icon: FolderKanban },
    { to: '/demo-2', labelKey: 'menu.test2', icon: BriefcaseBusiness },
    { to: '/demo-3', labelKey: 'menu.test3', icon: ChartPie },
    { to: '/demo-4', labelKey: 'menu.test4', icon: ClipboardList },
    { to: '/demo-5', labelKey: 'menu.test5', icon: DatabaseZap },
    { to: '/demo-6', labelKey: 'menu.test6', icon: Factory },
    { to: '/demo-7', labelKey: 'menu.test7', icon: FileText },
    { to: '/demo-8', labelKey: 'menu.test8', icon: BellDot },
    { to: '/demo-9', labelKey: 'menu.test9', icon: ShieldCheck },
    { to: '/demo-10', labelKey: 'menu.test10', icon: Target },
    { to: '/demo-11', labelKey: 'menu.test11', icon: Cpu },
    { to: '/demo-12', labelKey: 'menu.test12', icon: Gauge },
    { to: '/demo-13', labelKey: 'menu.test13', icon: Radio },
    { to: '/demo-14', labelKey: 'menu.test14', icon: FolderKanban },
    { to: '/demo-15', labelKey: 'menu.test15', icon: Target },
  ] as const;

  return (
    <div className="ui-app-shell flex min-h-screen">
      <header className="ui-mobile-bar fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-4 md:hidden">
        <button
          type="button"
          aria-label={t('menu.open')}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(true)}
          className="ui-sidebar-icon-button"
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
          aria-label={t('brand.name')}
        >
          <img src={logo} alt="" className="h-8 w-8 object-contain" />
          <span className="ui-heading text-base font-bold">{t('brand.name')}</span>
        </button>
        <button
          type="button"
          aria-label={themeLabel}
          onClick={toggleTheme}
          className="ui-sidebar-icon-button"
        >
          {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
        </button>
      </header>

      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label={t('menu.close')}
          onClick={() => setIsMobileMenuOpen(false)}
          className="ui-drawer-backdrop fixed inset-0 z-40 md:hidden"
        />
      )}

      <aside
        className={`ui-sidebar fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col transition-[width,translate] duration-200 ease-in-out motion-reduce:transition-none md:sticky md:top-0 md:z-20 md:h-screen md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'md:w-[5rem]' : 'md:w-[17rem]'}`}
      >
        <div className={`ui-sidebar-header flex h-16 shrink-0 items-center gap-2 px-3 ${isCollapsed ? 'md:justify-center md:px-1' : ''}`}>
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              aria-label={t('menu.expand')}
              title={t('menu.expand')}
              aria-expanded={false}
              data-testid="desktop-brand-toggle"
              className="hidden min-w-0 items-center gap-2 md:flex md:justify-center"
            >
              <img src={logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
            </button>
          ) : (
            <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
              <img src={logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
              <span className="ui-heading truncate text-base font-bold tracking-tight">
                {t('brand.name')}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label={t('brand.name')}
            className="flex min-w-0 flex-1 items-center gap-2 md:hidden"
          >
            <img src={logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
            <span className="ui-heading truncate text-base font-bold tracking-tight">{t('brand.name')}</span>
          </button>

          {!isCollapsed && (
            <button
              type="button"
              aria-label={themeLabel}
              title={themeLabel}
              onClick={toggleTheme}
              data-testid="desktop-theme-toggle"
              className="ui-sidebar-icon-button"
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
          )}

          {!isCollapsed && (
            <button
              type="button"
              aria-label={t('menu.collapse')}
              title={t('menu.collapse')}
              aria-expanded
              onClick={() => setIsCollapsed(true)}
              data-testid="desktop-menu-toggle"
              className="ui-sidebar-icon-button ui-sidebar-desktop-control"
            >
              <PanelLeftClose size={18} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            aria-label={t('menu.close')}
            title={t('menu.close')}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(false)}
            className="ui-sidebar-icon-button ui-sidebar-mobile-close ml-auto md:hidden"
          >
            <PanelLeftClose size={18} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label={t('menu.navigation')} className={`ui-sidebar-nav mt-5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4 ${isCollapsed ? 'md:px-2' : ''}`}>
          <NavLink
            to="/"
            end
            title={isCollapsed ? t('menu.home') : undefined}
            aria-label={t('menu.home')}
            className={({ isActive }) => `ui-nav-item ${isActive ? 'ui-nav-item-active' : ''} ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <Home size={19} aria-hidden="true" />
            <span className={isCollapsed ? 'md:hidden' : ''}>{t('menu.home')}</span>
          </NavLink>

          <div className={`ui-nav-section ${isCollapsed ? 'md:px-1' : ''}`}>
            <span className={isCollapsed ? 'md:hidden' : ''}>{t('menu.finance')}</span>
          </div>
          <NavLink
            to="/stack"
            title={isCollapsed ? t('menu.stack') : undefined}
            aria-label={t('menu.stack')}
            className={({ isActive }) => `ui-nav-item ${isActive ? 'ui-nav-item-active' : ''} ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <Cpu size={19} aria-hidden="true" />
            <span className={isCollapsed ? 'md:hidden' : ''}>{t('menu.stack')}</span>
          </NavLink>
          <NavLink
            to="/dashboard"
            title={isCollapsed ? t('menu.dashboard') : undefined}
            aria-label={t('menu.dashboard')}
            className={({ isActive }) => `ui-nav-item ${isActive ? 'ui-nav-item-active' : ''} ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <BarChart3 size={19} aria-hidden="true" />
            <span className={isCollapsed ? 'md:hidden' : ''}>{t('menu.dashboard')}</span>
          </NavLink>

          <div className={`ui-nav-section ${isCollapsed ? 'md:px-1' : ''}`}>
            <span className={isCollapsed ? 'md:hidden' : ''}>{t('menu.internetOfThings')}</span>
          </div>
          <NavLink
            to="/iot"
            title={isCollapsed ? t('menu.iot') : undefined}
            aria-label={t('menu.iot')}
            className={({ isActive }) => `ui-nav-item ${isActive ? 'ui-nav-item-active' : ''} ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <Globe2 size={19} aria-hidden="true" />
            <span className={isCollapsed ? 'md:hidden' : ''}>{t('menu.iot')}</span>
          </NavLink>

          <div className={`ui-nav-section ${isCollapsed ? 'md:px-1' : ''}`}>
            <span className={isCollapsed ? 'md:hidden' : ''}>{t('menu.tests')}</span>
          </div>
          {demoMenuItems.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={isCollapsed ? t(labelKey) : undefined}
              aria-label={t(labelKey)}
              className={({ isActive }) => `ui-nav-item ${isActive ? 'ui-nav-item-active' : ''} ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
            >
              <Icon size={19} aria-hidden="true" />
              <span className={isCollapsed ? 'md:hidden' : ''}>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <footer className={`ui-sidebar-footer mx-2 shrink-0 border-t px-1 pb-4 pt-3 ${isCollapsed ? 'md:mx-1 md:px-0' : ''}`}>
          <LanguageSelector isCollapsed={isCollapsed} />

          <div className="relative">
            {isUserMenuOpen && (
              <div id="sidebar-user-menu" className="ui-user-menu absolute bottom-[calc(100%+0.65rem)] left-0 z-10 w-60 rounded-2xl p-2">
                <div className="ui-user-menu-identity px-3 py-2">
                  <p className="ui-heading truncate text-sm font-semibold">{userName}</p>
                  <p className="ui-muted truncate text-xs">{userSubtitle}</p>
                </div>
                <div className="ui-user-menu-divider my-1" />
                {signOutError && (
                  <p role="alert" className="ui-user-menu-error px-3 py-2 text-xs">
                    {t('menu.signOutError')}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="ui-user-menu-action flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium disabled:cursor-wait disabled:opacity-60"
                >
                  <LogOut size={17} aria-hidden="true" />
                  {isSigningOut ? t('menu.signingOut') : t('menu.signOut')}
                </button>
              </div>
            )}
            <button
              type="button"
              aria-label={t('menu.accountOptions')}
              aria-expanded={isUserMenuOpen}
              aria-controls={isUserMenuOpen ? 'sidebar-user-menu' : undefined}
              onClick={() => {
                setSignOutError(false);
                setIsUserMenuOpen((open) => !open);
              }}
              className={`ui-user-card flex w-full min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-left ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
            >
              <span className="ui-user-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <UserRound size={16} aria-hidden="true" />
              </span>
              <span className={`min-w-0 flex-1 ${isCollapsed ? 'md:hidden' : ''}`}>
                <span className="ui-heading block truncate text-xs font-semibold">{userName}</span>
                <span className="ui-muted block truncate text-[0.625rem]">
                  {userSubtitle}
                </span>
              </span>
              <ChevronDown
                size={15}
                className={`ui-muted shrink-0 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''} ${isCollapsed ? 'md:hidden' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>
          <p className={`ui-muted mt-3 text-xs ${isCollapsed ? 'md:hidden' : ''}`}>Ver 1.1</p>
        </footer>
      </aside>

      <main className="ui-main-content min-w-0 flex-1 px-4 pb-6 pt-20 sm:px-6 md:px-6 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
