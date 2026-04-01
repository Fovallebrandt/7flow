import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import CreateProject from './components/CreateProject';
import ProjectDetail from './components/ProjectDetail';
import Profile from './components/Profile';
import Inventory from './components/Inventory';
import { ThemeProvider, useTheme } from './lib/ThemeContext';
import { Toaster } from 'sonner';

function AppShell() {
  const { theme } = useTheme();

  return (
    <>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateProject />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/inventory" element={<Inventory />} />
          </Routes>
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
