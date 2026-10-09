import { Navigate, Route, Routes } from 'react-router-dom';
import {
  BellDot,
  BriefcaseBusiness,
  ChartPie,
  ClipboardList,
  Cpu,
  DatabaseZap,
  Factory,
  FileText,
  FolderKanban,
  Gauge,
  Radio,
  ShieldCheck,
  Target,
  type LucideIcon,
} from 'lucide-react';
import AppShell from './shared/components/AppShell';
import { useAuth } from './shared/context/AuthContext';
import { useTranslation } from './shared/i18n/LanguageContext';
import Login from './features/auth/Login';
import DashboardVentas from './features/dashboard_ventas/DashboardVentas';
import AgentCompany from './features/agent_company/AgentCompany';
import Home from './features/home/Home';
import TestLogin from './features/test_login/TestLogin';

type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

function RootRoute() {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <main className="ui-page flex min-h-screen items-center justify-center px-4">
        <p role="status" className="ui-muted text-sm">{t('menu.loading')}</p>
      </main>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AppShell />;
}

function SamplePage({ titleKey, descriptionKey, icon: Icon }: {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: LucideIcon;
}) {
  const { t } = useTranslation();

  return (
    <section className="ui-surface mx-auto max-w-5xl rounded-3xl p-7 sm:p-10">
      <span className="ui-home-icon-badge flex h-12 w-12 items-center justify-center rounded-2xl">
        <Icon size={22} aria-hidden="true" />
      </span>
      <h1 className="ui-heading mt-6 text-3xl font-bold tracking-tight">{t(titleKey)}</h1>
      <p className="ui-muted mt-3 max-w-2xl text-sm leading-7">{t(descriptionKey)}</p>
    </section>
  );
}

const demoPages = [
  { path: 'demo-1', icon: FolderKanban, titleKey: 'menu.test1', descriptionKey: 'page.test1' },
  { path: 'demo-2', icon: BriefcaseBusiness, titleKey: 'menu.test2', descriptionKey: 'page.test2' },
  { path: 'demo-3', icon: ChartPie, titleKey: 'menu.test3', descriptionKey: 'page.test3' },
  { path: 'demo-4', icon: ClipboardList, titleKey: 'menu.test4', descriptionKey: 'page.test4' },
  { path: 'demo-5', icon: DatabaseZap, titleKey: 'menu.test5', descriptionKey: 'page.test5' },
  { path: 'demo-6', icon: Factory, titleKey: 'menu.test6', descriptionKey: 'page.test6' },
  { path: 'demo-7', icon: FileText, titleKey: 'menu.test7', descriptionKey: 'page.test7' },
  { path: 'demo-8', icon: BellDot, titleKey: 'menu.test8', descriptionKey: 'page.test8' },
  { path: 'demo-9', icon: ShieldCheck, titleKey: 'menu.test9', descriptionKey: 'page.test9' },
  { path: 'demo-10', icon: Target, titleKey: 'menu.test10', descriptionKey: 'page.test10' },
  { path: 'demo-11', icon: Cpu, titleKey: 'menu.test11', descriptionKey: 'page.test11' },
  { path: 'demo-12', icon: Gauge, titleKey: 'menu.test12', descriptionKey: 'page.test12' },
  { path: 'demo-13', icon: Radio, titleKey: 'menu.test13', descriptionKey: 'page.test13' },
  { path: 'demo-14', icon: FolderKanban, titleKey: 'menu.test14', descriptionKey: 'page.test14' },
  { path: 'demo-15', icon: Target, titleKey: 'menu.test15', descriptionKey: 'page.test15' },
] as const;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />}>
        <Route index element={<Home />} />
        <Route path="stack" element={<SamplePage icon={Cpu} titleKey="menu.stack" descriptionKey="page.stack" />} />
        <Route path="dashboard" element={<DashboardVentas />} />
        <Route path="agent-company" element={<AgentCompany />} />
        <Route path="iot" element={<SamplePage icon={Radio} titleKey="menu.iot" descriptionKey="page.iot" />} />
        {demoPages.map(({ path, icon, titleKey, descriptionKey }) => (
          <Route
            key={path}
            path={path}
            element={<SamplePage icon={icon} titleKey={titleKey} descriptionKey={descriptionKey} />}
          />
        ))}
      </Route>
      <Route path="/test_login" element={<TestLogin />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
