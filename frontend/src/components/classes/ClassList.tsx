import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Class {
  id: string;
  title: string;
  description: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
  is_enrolled?: boolean;
  image_url: string | null;
}

const ClassList = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all classes
        const response = await axios.get(`${API_URL}/classes`);

        // If user is authenticated, fetch enrolled classes
        if (user) {
          const enrolledResponse = await axios.get(`${API_URL}/classes/enrolled/me`);
          const enrolledIds = enrolledResponse.data.map((c: Class) => c.id);
          setEnrolledClasses(enrolledIds);

          // Mark classes as enrolled
          const updatedClasses = response.data.map((c: Class) => ({
            ...c,
            is_enrolled: enrolledIds.includes(c.id)
          }));

          setClasses(updatedClasses);
        } else {
          setClasses(response.data);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError('Failed to load classes');
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user]);

  const handleEnroll = async (classId: string) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
      return;
    }

    try {
      setEnrollingId(classId);
      await axios.post(`${API_URL}/classes/${classId}/enroll`);

      // Update the classes list
      setClasses(classes.map(c =>
        c.id === classId ? { ...c, is_enrolled: true } : c
      ));

      // Update enrolled classes
      setEnrolledClasses([...enrolledClasses, classId]);

      setEnrollingId(null);
    } catch (err) {
      console.error('Error enrolling in class:', err);
      setError('Failed to enroll in class');
      setEnrollingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-dark-text">Available Classes</h1>
        {user?.role === 'aslab' && (
          <Link
            to="/classes/create"
            className="btn flex items-center space-x-1 px-4 py-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 bg-primary-gradient dark:bg-gradient-to-br dark:from-slate-900 dark:to-zinc-900 text-white hover:opacity-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            <span>Create Class</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-6 text-center">
          <p className="text-secondary-600 dark:text-dark-muted">No classes available</p>
          {user?.role === 'aslab' && (
            <Link to="/classes/create" className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
              Create Your First Class
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <div key={classItem.id} className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden card-hover flex flex-col h-full">
              {/* Image section */}
              {classItem.image_url ? (
                <div className="h-48 w-full overflow-hidden">
                  <img
                    src={classItem.image_url}
                    alt={classItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 w-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-white opacity-75">
                    <path d="M11.7 2.805a.75.75 0 0 1 .6 0A60.65 60.65 0 0 1 22.83 8.72a.75.75 0 0 1-.231 1.337 49.948 49.948 0 0 0-9.902 3.912l-.003.002c-.114.06-.227.119-.34.18a.75.75 0 0 1-.707 0A50.88 50.88 0 0 0 7.5 12.173v-.224c0-.131.067-.248.172-.311a54.615 54.615 0 0 1 4.653-2.52.75.75 0 0 0-.65-1.352 56.123 56.123 0 0 0-4.78 2.589 1.858 1.858 0 0 0-.859 1.228 49.803 49.803 0 0 0-4.634-1.527.75.75 0 0 1-.231-1.337A60.653 60.653 0 0 1 11.7 2.805Z" />
                    <path d="M13.06 15.473a48.45 48.45 0 0 1 7.666-3.282c.134 1.414.22 2.843.255 4.284a.75.75 0 0 1-.46.71 47.87 47.87 0 0 0-8.105 4.342.75.75 0 0 1-.832 0 47.87 47.87 0 0 0-8.104-4.342.75.75 0 0 1-.461-.71c.035-1.442.121-2.87.255-4.286.921.304 1.83.634 2.726.99v1.27a1.5 1.5 0 0 0-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.66a6.727 6.727 0 0 0 .551-1.607 1.5 1.5 0 0 0 .14-2.67v-.645a48.549 48.549 0 0 1 3.44 1.667 2.25 2.25 0 0 0 2.12 0Z" />
                    <path d="M4.462 19.462c.42-.419.753-.89 1-1.395.453.214.902.435 1.347.662a6.742 6.742 0 0 1-1.286 1.794.75.75 0 0 1-1.06-1.06Z" />
                  </svg>
                </div>
              )}
              
              {/* Content section with flex-grow to push footer to bottom */}
              <div className="flex flex-col flex-grow p-6">
                {/* Title and description section */}
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-secondary-900 dark:text-dark-text mb-2">
                    {classItem.title}
                  </h3>
                  <p className="text-secondary-600 dark:text-dark-muted mb-4 line-clamp-3">
                    {classItem.description}
                  </p>
                </div>
                
                {/* Footer section that stays at the bottom */}
                <div className="mt-auto pt-4">
                  {/* Creator info with icon */}
                  <div className="flex items-center text-sm text-secondary-500 dark:text-dark-muted mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
                    </svg>
                    <span>By {classItem.creator_name}</span>
                  </div>
                  
                  {/* Action buttons and date */}
                  <div className="flex justify-between items-center">
                    {classItem.is_enrolled || user?.role === 'aslab' ? (
                      <Link
                        to={`/classes/${classItem.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                      >
                        View Class
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEnroll(classItem.id)}
                        disabled={enrollingId === classItem.id}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {enrollingId === classItem.id ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Enrolling...
                          </>
                        ) : (
                          'Enroll Now'
                        )}
                      </button>
                    )}
                    <span className="text-xs text-secondary-500 dark:text-dark-muted">
                      {new Date(classItem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassList;
