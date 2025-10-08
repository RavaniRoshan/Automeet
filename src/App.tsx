import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import Hero from './components/Hero';
import ProblemSolution from './components/ProblemSolution';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import Dashboard from './components/Dashboard';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import CTA from './components/CTA';
import Footer from './components/Footer';
import ChatInterface from './components/ChatInterface';

function AppContent() {
  const { user, loading } = useAuth();
  const [showChat, setShowChat] = useState(false);

  const handleGetStarted = () => {
    if (user) {
      setShowChat(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (showChat && user) {
    return <ChatInterface onBackToHome={() => setShowChat(false)} />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header onAuthSuccess={handleGetStarted} />
      <main>
        <Hero onGetStarted={handleGetStarted} />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <Testimonials />
        <Dashboard />
        <Pricing />
        <FAQ />
        <CTA onGetStarted={handleGetStarted} />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
