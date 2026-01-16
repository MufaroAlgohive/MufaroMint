import { useEffect, useState } from 'react';

import Preloader from './components/ui/preloader.tsx';
import AuthPage from './pages/AuthPage.jsx';

const App = () => {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowPreloader(false);
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, []);

  if (showPreloader) {
    return <Preloader message="Loading Mint" />;
  }

  return <AuthPage />;
};

export default App;
