import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import About from './components/About';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Unauthorized from './components/auth/Unauthorized';
import Dashboard from './components/dashboard/Dashboard';
import AssignmentList from './components/assignments/AssignmentList';
import AssignmentDetail from './components/assignments/AssignmentDetail';
import AssignmentSubmission from './components/assignments/AssignmentSubmission';
import AssignmentSubmissions from './components/assignments/AssignmentSubmissions';
import AssignmentForm from './components/assignments/AssignmentForm';
import ClassList from './components/classes/ClassList';
import ClassDetail from './components/classes/ClassDetail';
import ClassForm from './components/classes/ClassForm';
import ModuleDetail from './components/modules/ModuleDetail';
import ModuleForm from './components/modules/ModuleForm';
import Profile from './components/profile/Profile';
import NewsList from './components/news/NewsList';
import NewsDetail from './components/news/NewsDetail';
import NewsForm from './components/news/NewsForm';
import SocialPage from './components/social/SocialPage';
import PostDetail from './components/social/PostDetail';

function App() {
  // Disable scroll restoration from React Router
  if (window.history.scrollRestoration) {
    window.history.scrollRestoration = 'manual';
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-secondary-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-zinc-900 dark:text-dark-text transition-colors duration-200">
            <Navbar />
            <main className="prevent-scroll-reset page-enter-active">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/about" element={<About />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Default route redirects to classes */}
                <Route path="/" element={<Navigate to="/classes" replace />} />

                {/* Protected routes with guest access */}
                <Route element={<ProtectedRoute allowGuest={true} />}>
                  <Route path="/classes" element={<ClassList />} />
                  <Route path="/classes/:id" element={<ClassDetail />} />
                  <Route path="/modules/:id" element={<ModuleDetail />} />
                  <Route path="/modules/create" element={<ModuleForm />} />
                  <Route path="/modules/:id/edit" element={<ModuleForm isEditing />} />
                  <Route path="/assignments" element={<AssignmentList />} />
                  <Route path="/assignments/:id" element={<AssignmentDetail />} />
                  <Route path="/news" element={<NewsList />} />
                  <Route path="/news/:id" element={<NewsDetail />} />
                </Route>

                {/* Protected routes requiring authentication */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/social" element={<SocialPage />} />
                  <Route path="/social/:id" element={<PostDetail />} />
                </Route>

                {/* Aslab-only routes */}
                <Route element={<ProtectedRoute allowedRoles={['aslab']} />}>
                  <Route path="/classes/create" element={<ClassForm />} />
                  <Route path="/classes/:id/edit" element={<ClassForm isEditing />} />
                  <Route path="/modules/create" element={<ModuleForm />} />
                  <Route path="/modules/:id/edit" element={<ModuleForm isEditing />} />
                  <Route path="/assignments/manage" element={<AssignmentList />} />
                  <Route path="/assignments/create" element={<AssignmentForm />} />
                  <Route path="/assignments/:id/edit" element={<AssignmentForm isEditing />} />
                  <Route path="/assignments/:id/submissions" element={<AssignmentSubmissions />} />
                  <Route path="/news/create" element={<NewsForm />} />
                  <Route path="/news/:id/edit" element={<NewsForm isEditing />} />
                </Route>

                {/* Praktikan-only routes */}
                <Route element={<ProtectedRoute allowedRoles={['praktikan']} />}>
                  <Route path="/assignments/:id/submit" element={<AssignmentSubmission />} />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
