import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: ('aslab' | 'praktikan' | 'guest')[];
  allowGuest?: boolean;
}

const ProtectedRoute = ({ allowedRoles, allowGuest = false }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading, isGuest } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-zinc-900">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated but guest access is allowed, treat as guest
  if (!isAuthenticated) {
    if (allowGuest) {
      // Allow access as guest for routes that permit guest access
      return <Outlet />;
    } else {
      // Redirect to login for routes that require authentication
      return <Navigate to="/login" replace />;
    }
  }

  // If roles are specified and user doesn't have the required role, redirect to unauthorized
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If authenticated and has the required role, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
