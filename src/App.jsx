import React, { createContext, useEffect, useState } from "react";
import { RouterProvider, createBrowserRouter, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import { clearUser, setUser } from "./store/userSlice";
import Layout from "@/components/organisms/Layout";
import Login from "@/components/pages/Login";
import Signup from "@/components/pages/Signup";
import Callback from "@/components/pages/Callback";
import ErrorPage from "@/components/pages/ErrorPage";
import ResetPassword from "@/components/pages/ResetPassword";
import PromptPassword from "@/components/pages/PromptPassword";
import NotFound from "@/components/pages/NotFound";
import Help from "@/components/pages/Help";
import Wishlist from "@/components/pages/Wishlist";
import PropertyDetail from "@/components/pages/PropertyDetail";
import Home from "@/components/pages/Home";
import PropertyComparison from "@/components/pages/PropertyComparison";
import Search from "@/components/pages/Search";

// Create auth context
export const AuthContext = createContext(null);

// Protected Route Component
function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.user);

  useEffect(() => {
    if (!isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  return children;
}

// Main routes configuration
const mainRoutes = [
  { path: "", element: <Home />, index: true },
  { path: "search", element: <Search /> },
  { path: "explore", element: <Search /> },
  { path: "property/:id", element: <PropertyDetail /> },
  { path: "compare", element: <PropertyComparison /> },
  { 
    path: "wishlist", 
    element: (
      <ProtectedRoute>
        <Wishlist />
      </ProtectedRoute>
    ) 
  },
  { path: "help", element: <Help /> },
  { path: "*", element: <NotFound /> }
];

// Router configuration
const routes = [
  {
    path: "/",
    element: <Layout />,
    children: mainRoutes
  },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/callback", element: <Callback /> },
  { path: "/error", element: <ErrorPage /> },
  { path: "/prompt-password/:appId/:emailAddress/:provider", element: <PromptPassword /> },
  { path: "/reset-password/:appId/:fields", element: <ResetPassword /> }
];

export const router = createBrowserRouter(routes);

// Main App Component
function App() {
  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize ApperUI once when the app loads
  useEffect(() => {
    const { ApperClient, ApperUI } = window.ApperSDK;
    
    const client = new ApperClient({
      apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
      apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
    });
    
    // Initialize ApperUI with complete authentication handling
    ApperUI.setup(client, {
      target: '#authentication',
      clientId: import.meta.env.VITE_APPER_PROJECT_ID,
      view: 'both',
      onSuccess: function (user) {
        setIsInitialized(true);
        // CRITICAL: This exact currentPath logic must be preserved
        let currentPath = window.location.pathname + window.location.search;
        let redirectPath = new URLSearchParams(window.location.search).get('redirect');
        const isAuthPage = currentPath.includes('/login') || currentPath.includes('/signup') || 
                           currentPath.includes('/callback') || currentPath.includes('/error') || 
                           currentPath.includes('/prompt-password') || currentPath.includes('/reset-password');
        
        if (user) {
          // User is authenticated
          if (redirectPath) {
            window.location.href = redirectPath;
          } else if (!isAuthPage) {
            if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
              window.location.href = currentPath;
            } else {
              window.location.href = '/';
            }
          } else {
            window.location.href = '/';
          }
          // Store user information in Redux
          dispatch(setUser(JSON.parse(JSON.stringify(user))));
        } else {
          // User is not authenticated
          if (!isAuthPage) {
            window.location.href = currentPath.includes('/signup')
              ? `/signup?redirect=${encodeURIComponent(currentPath)}`
              : currentPath.includes('/login')
              ? `/login?redirect=${encodeURIComponent(currentPath)}`
              : '/login';
          } else if (redirectPath) {
            if (
              !['error', 'signup', 'login', 'callback', 'prompt-password', 'reset-password'].some((path) => currentPath.includes(path))
            ) {
              window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`;
            } else {
              window.location.href = currentPath;
            }
          } else if (isAuthPage) {
            window.location.href = currentPath;
          } else {
            window.location.href = '/login';
          }
          dispatch(clearUser());
        }
      },
      onError: function(error) {
        console.error("Authentication failed:", error);
        setIsInitialized(true);
      }
    });
  }, [dispatch]);

  // Authentication methods to share via context
  const authMethods = {
    isInitialized,
    logout: async () => {
      try {
        const { ApperUI } = window.ApperSDK;
        await ApperUI.logout();
        dispatch(clearUser());
        window.location.href = '/login';
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
  };

  // Don't render routes until initialization is complete
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authMethods}>
      <RouterProvider router={router} />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ zIndex: 9999 }}
      />
    </AuthContext.Provider>
  );
}

export default App;