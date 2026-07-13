import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ThemeProvider, useTheme } from './lib/ThemeContext';
import { Toaster } from 'sonner';
import LoadingSpinner from './components/LoadingSpinner';

const Home = lazy(() => import('./components/Home'));
const CreateProject = lazy(() => import('./components/CreateProject'));
const ProjectDetail = lazy(() => import('./components/ProjectDetail'));
const Profile = lazy(() => import('./components/Profile'));
const Inventory = lazy(() => import('./components/Inventory'));

function AppShell() {
  const { theme } = useTheme();

  return (
    <>
      <Router>
        <Layout>
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <LoadingSpinner />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateProject />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/inventory" element={<Inventory />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
      <Toaster
        position="top-center"
        expand={false}
        richColors
        closeButton
        theme={theme === 'light' ? 'light' : 'dark'}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
