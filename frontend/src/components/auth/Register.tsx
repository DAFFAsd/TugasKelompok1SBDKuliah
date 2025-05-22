import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoDigilab from '../../assets/logodigilab.png';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'praktikan' | 'aslab'>('praktikan');
  const [aslabCode, setAslabCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { register, error, clearError, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!username || !email || !password || !confirmPassword) {
      setFormError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    // Validate aslab code if role is aslab
    if (role === 'aslab') {
      if (aslabCode !== 'fairuzganteng69') {
        setFormError('Invalid aslab code');
        return;
      }
    }

    try {
      clearError();
      await register(username, email, password, role);

      // Add a small delay to ensure the token is properly set in axios interceptors
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    } catch (err) {
      console.error('Registration error:', err);
      // Error is handled by the auth context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img src={logoDigilab} alt="Digilab Logo" className="h-24 mx-auto" />
          </div>
          <h2 className="mt-4 text-center text-3xl font-extrabold text-secondary-900 dark:text-dark-text">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600 dark:text-dark-muted">
            Or{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
              sign in to your existing account
            </Link>
          </p>
        </div>

        {(error || formError) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error || formError}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-secondary-300 dark:border-dark-border placeholder-secondary-500 dark:placeholder-dark-muted text-secondary-900 dark:text-dark-text dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Username"
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-secondary-300 dark:border-dark-border placeholder-secondary-500 dark:placeholder-dark-muted text-secondary-900 dark:text-dark-text dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-secondary-300 dark:border-dark-border placeholder-secondary-500 dark:placeholder-dark-muted text-secondary-900 dark:text-dark-text dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-secondary-300 dark:border-dark-border placeholder-secondary-500 dark:placeholder-dark-muted text-secondary-900 dark:text-dark-text dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
              Account Type
            </label>
            <div className="flex items-center">
              <div className="flex items-center">
                <input
                  id="role-praktikan"
                  name="role"
                  type="radio"
                  checked={role === 'praktikan'}
                  onChange={() => setRole('praktikan')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 dark:border-dark-border"
                />
                <label htmlFor="role-praktikan" className="ml-2 block text-sm text-secondary-900 dark:text-dark-text">
                  Praktikan (Student)
                </label>
              </div>
              <div className="flex items-center ml-6">
                <input
                  id="role-aslab"
                  name="role"
                  type="radio"
                  checked={role === 'aslab'}
                  onChange={() => setRole('aslab')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 dark:border-dark-border"
                />
                <label htmlFor="role-aslab" className="ml-2 block text-sm text-secondary-900 dark:text-dark-text">
                  Asisten Lab
                </label>
              </div>
            </div>
            <p className="mt-1 text-xs text-secondary-500 dark:text-dark-muted">
              Note: Guest access is automatic without registration
            </p>
          </div>

          {role === 'aslab' && (
            <div className="mb-4">
              <label htmlFor="aslab-code" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                Aslab Access Code *
              </label>
              <input
                id="aslab-code"
                type="password"
                value={aslabCode}
                onChange={(e) => setAslabCode(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                placeholder="Enter aslab access code"
                required={role === 'aslab'}
              />
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
