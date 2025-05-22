import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
// Import the logo
import logoDigilab from '../assets/logodigilab.png';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to check if a path is active
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Add scroll event listener to detect when user scrolls
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className={`bg-primary-gradient dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 text-white sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'navbar-scrolled shadow-lg' : ''}`}>
      <div className="container-custom">
        <div className="flex justify-between items-center py-4">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight flex items-center space-x-2 hover:text-primary-100 transition-colors"
          >
            <img 
              src={logoDigilab} 
              alt="Digilab Logo" 
              className="w-8 h-8 object-contain logo-animation" 
            />
            <span>Digilab-NG</span>
          </Link>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              className="flex items-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
              </svg>
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Common links for all users (including guests) */}
            <Link
              to="/classes"
              className={`menu-item ${isActive('/classes') ? 'text-white font-medium' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors`}
            >
              Classes
              {isActive('/classes') && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full"></span>}
            </Link>
            <Link
              to="/news"
              className={`menu-item ${isActive('/news') ? 'text-white font-medium' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors`}
            >
              News
              {isActive('/news') && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full"></span>}
            </Link>
            <Link
              to="/about"
              className={`menu-item ${isActive('/about') ? 'text-white font-medium' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors`}
            >
              About
              {isActive('/about') && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full"></span>}
            </Link>

            {/* Links only for authenticated users */}
            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className={`menu-item ${isActive('/dashboard') ? 'text-white font-medium' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors`}
                >
                  Dashboard
                  {isActive('/dashboard') && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full"></span>}
                </Link>
                <Link
                  to="/assignments"
                  className={`menu-item ${isActive('/assignments') ? 'text-white font-medium' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors`}
                >
                  Assignments
                  {isActive('/assignments') && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full"></span>}
                </Link>
                <Link
                  to="/social"
                  className={`menu-item ${isActive('/social') ? 'text-white font-medium' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors`}
                >
                  Threads
                  {isActive('/social') && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full"></span>}
                </Link>
              </>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-primary-gradient dark:bg-gradient-to-br dark:from-slate-900 dark:to-zinc-900 hover:opacity-90 transition-all btn-hover"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transition-transform duration-300 hover:rotate-45">
                  <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transition-transform duration-300 hover:rotate-45">
                  <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="menu-item flex items-center space-x-2 text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-bold">
                    {user?.profile_image ? (
                      <img src={user.profile_image} alt={user?.username} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user?.username?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span>{user?.username}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-5 h-5 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`}
                  >
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 dropdown-enter-active">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-secondary-700 dark:text-dark-text hover:bg-secondary-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-secondary-700 dark:text-dark-text hover:bg-secondary-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="menu-item text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="btn-hover flex items-center space-x-1 px-4 py-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 bg-primary-gradient dark:bg-gradient-to-br dark:from-slate-900 dark:to-zinc-900 text-white hover:opacity-90 hover:scale-105"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 px-2 space-y-3 border-t border-white/20 dark:border-dark-border mobile-menu-enter-active">
            {/* Common links for all users (including guests) */}
            <div className="mobile-menu-item">
              <Link
                to="/classes"
                className={`block py-2 px-3 ${isActive('/classes') ? 'text-white font-medium bg-primary-600/20 dark:bg-primary-900/30' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors menu-item rounded-md`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Classes
              </Link>
            </div>
            <div className="mobile-menu-item">
              <Link
                to="/news"
                className={`block py-2 px-3 ${isActive('/news') ? 'text-white font-medium bg-primary-600/20 dark:bg-primary-900/30' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors menu-item rounded-md`}
                onClick={() => setMobileMenuOpen(false)}
              >
                News
              </Link>
            </div>
            <div className="mobile-menu-item">
              <Link
                to="/about"
                className={`block py-2 px-3 ${isActive('/about') ? 'text-white font-medium bg-primary-600/20 dark:bg-primary-900/30' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors menu-item rounded-md`}
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
            </div>

            {/* Links only for authenticated users */}
            {isAuthenticated ? (
              <>
                <div className="mobile-menu-item">
                  <Link
                    to="/dashboard"
                    className={`block py-2 px-3 ${isActive('/dashboard') ? 'text-white font-medium bg-primary-600/20 dark:bg-primary-900/30' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors menu-item rounded-md`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                </div>
                <div className="mobile-menu-item">
                  <Link
                    to="/assignments"
                    className={`block py-2 px-3 ${isActive('/assignments') ? 'text-white font-medium bg-primary-600/20 dark:bg-primary-900/30' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors menu-item rounded-md`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Assignments
                  </Link>
                </div>
                <div className="mobile-menu-item">
                  <Link
                    to="/social"
                    className={`block py-2 px-3 ${isActive('/social') ? 'text-white font-medium bg-primary-600/20 dark:bg-primary-900/30' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors menu-item rounded-md`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Social
                  </Link>
                </div>
                <div className="mobile-menu-item">
                  <Link
                    to="/profile"
                    className={`flex items-center py-2 px-3 ${isActive('/profile') ? 'text-white font-medium bg-primary-600/20 dark:bg-primary-900/30' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors menu-item rounded-md`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold mr-2">
                      {user?.profile_image ? (
                        <img src={user.profile_image} alt={user?.username} className="w-full h-full object-cover" />
                      ) : (
                        <span>{user?.username?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span>Profile</span>
                  </Link>
                </div>
                <div className="mobile-menu-item">
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 px-3 text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white transition-colors menu-item"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mobile-menu-item">
                  <Link
                    to="/login"
                    className={`block py-2 px-3 ${isActive('/login') ? 'text-white font-medium bg-primary-600/20 dark:bg-primary-900/30' : 'text-primary-100 hover:text-white dark:text-primary-200 dark:hover:text-white'} transition-colors menu-item rounded-md`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                </div>
                <div className="mobile-menu-item">
                  <Link
                    to="/register"
                    className={`block py-2 px-3 ${isActive('/register') ? 'bg-primary-700' : 'bg-primary-gradient'} hover:opacity-90 dark:bg-gradient-to-br dark:from-slate-900 dark:to-zinc-900 rounded-md text-white transition-all btn-hover hover:scale-105`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              </>
            )}
            <div className="mobile-menu-item">
              <div className="flex justify-between items-center py-2 px-3">
                <span className="text-primary-100 dark:text-primary-200">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full bg-primary-gradient dark:bg-gradient-to-br dark:from-slate-900 dark:to-zinc-900 hover:opacity-90 transition-all btn-hover"
                  aria-label="Toggle dark mode"
                >
                  {theme === 'dark' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transition-transform duration-300 hover:rotate-45">
                      <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transition-transform duration-300 hover:rotate-45">
                      <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
