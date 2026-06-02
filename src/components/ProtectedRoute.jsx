import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // If not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // If we have a user (even if they haven't paid yet in our basic setup), let them through
  return children;
}
