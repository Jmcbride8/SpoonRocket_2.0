import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Layout from './components/Layout';
import CustomerMenu from './pages/CustomerMenu';
import MenuManagement from './pages/MenuManagement';
import DispatchScreen from './pages/DispatchScreen';
import ManagementConsole from './pages/ManagementConsole';
import DriverApp from './pages/DriverApp';
import DeliveryOperations from './pages/DeliveryOperations';
import InventoryManagement from './pages/InventoryManagement';
import MenuRotation from './pages/MenuRotation';
import MenuItemLibrary from './pages/MenuItemLibrary';
import MenuPlanner from './pages/MenuPlanner';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Route based on role
  if (user?.role === 'driver') {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DriverApp />} />
          <Route path="/driver" element={<DriverApp />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  if (user?.role === 'admin') {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ManagementConsole />} />
          <Route path="/management" element={<ManagementConsole />} />
          <Route path="/dispatch" element={<DispatchScreen />} />
          <Route path="/operations" element={<DeliveryOperations />} />
          <Route path="/inventory" element={<InventoryManagement />} />
          <Route path="/menu" element={<MenuRotation />} />
          <Route path="/recipe-library" element={<MenuItemLibrary />} />
          <Route path="/menu-planner" element={<MenuPlanner />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  // Default: customer
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<CustomerMenu />} />
        <Route path="/order" element={<CustomerMenu />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App