import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="container-custom py-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Unauthorized Access</h1>
        <p className="text-secondary-600 dark:text-dark-muted mb-6">You don't have permission to access this page.</p>
        <Link to="/dashboard" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
