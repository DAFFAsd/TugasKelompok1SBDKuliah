import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ModuleManager from '../modules/ModuleManager';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import CreateAnnouncementButton from '../news/CreateAnnouncementButton';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Utility function to determine deadline status and color
const getDeadlineStatusClass = (deadline: string) => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'; // Passed
  } else if (diffDays <= 1) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'; // Due in 1 day or less
  } else if (diffDays <= 4) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'; // Due in 4 days or less
  } else {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'; // Due in more than 4 days
  }
};

// Utility function to get remaining time text
const getRemainingTimeText = (deadline: string): string => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  
  // If deadline has passed
  if (diffTime <= 0) {
    return "Passed";
  }
  
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
  } else {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
  }
};

interface Class {
  id: number;
  title: string;
  description: string;
  creator_name: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface Module {
  id: number;
  title: string;
  content: string;
  creator_name: string;
  created_at: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  deadline: string;
  creator_name: string;
  created_at: string;
}

const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [classData, setClassData] = useState<Class | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'modules' | 'assignments'>('modules');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchClassData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch class details
        const classResponse = await axios.get(`${API_URL}/classes/${id}`);
        setClassData(classResponse.data);

        // Check if user is enrolled
        if (user) {
          try {
            const enrolledResponse = await axios.get(`${API_URL}/classes/enrolled/me`);
            const enrolledIds = enrolledResponse.data.map((c: Class) => c.id);
            setIsEnrolled(enrolledIds.includes(Number(id)));
          } catch (err) {
            console.error('Error checking enrollment:', err);
          }
        }

        // Fetch modules
        const modulesResponse = await axios.get(`${API_URL}/modules/class/${id}`);
        setModules(modulesResponse.data);

        // Fetch assignments
        const assignmentsResponse = await axios.get(`${API_URL}/assignments/class/${id}`);
        setAssignments(assignmentsResponse.data);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching class data:', err);
        setError('Failed to load class data');
        setLoading(false);
      }
    };

    fetchClassData();
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setEnrolling(true);
      await axios.post(`${API_URL}/classes/${id}/enroll`);
      setIsEnrolled(true);
      setEnrolling(false);
    } catch (err) {
      console.error('Error enrolling in class:', err);
      setError('Failed to enroll in class');
      setEnrolling(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/classes/${id}`);
      navigate('/classes');
    } catch (err) {
      console.error('Error deleting class:', err);
      setError('Failed to delete class');
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
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading class...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="container-custom py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">Class not found</span>
        </div>
      </div>
    );
  }

  const isCreator = user && user.id === classData.created_by;
  const canEdit = user && (user.role === 'aslab' || isCreator);
  const canAccess = isEnrolled || canEdit;

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900 dark:text-dark-text">{classData.title}</h1>
            <p className="text-secondary-600 dark:text-dark-muted mt-2">
              Created by {classData.creator_name} • {new Date(classData.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <>
                <Link
                  to={`/classes/${id}/edit`}
                  className="inline-flex items-center px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md text-sm font-medium text-secondary-700 dark:text-dark-text bg-white dark:bg-gray-700 hover:bg-secondary-50 dark:hover:bg-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                  </svg>
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-800 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                  </svg>
                  Delete
                </button>
              </>
            )}
            {!isEnrolled && user?.role === 'praktikan' && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enrolling ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enrolling...
                  </>
                ) : (
                  'Enroll in Class'
                )}
              </button>
            )}
            {canEdit && (
              <CreateAnnouncementButton
                entityType="class"
                entityId={classData.id}
                entityTitle={classData.title}
              />
            )}
          </div>
        </div>

        {classData.description && (
          <div className="mt-4 bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-4">
            <div className="prose dark:prose-invert prose-primary max-w-none text-secondary-700 dark:text-dark-text break-words">
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 break-words overflow-wrap-anywhere"
                    />
                  ),
                }}
              >
                {classData.description}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {!canAccess && user?.role === 'praktikan' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg mb-6" role="alert">
          <p className="font-medium">You need to enroll in this class to access its content.</p>
        </div>
      )}

      {canAccess && (
        <>
          <div className="border-b border-secondary-200 dark:border-dark-border mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('modules')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'modules'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-dark-muted dark:hover:text-dark-text dark:hover:border-dark-border'
                }`}
              >
                Modules
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'assignments'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-dark-muted dark:hover:text-dark-text dark:hover:border-dark-border'
                }`}
              >
                Assignments
              </button>
            </nav>
          </div>

          {activeTab === 'modules' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-dark-text">Modules</h2>
              </div>

              <ModuleManager classId={Number(id)} canEdit={canEdit} />
            </div>
          )}

          {activeTab === 'assignments' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-dark-text">Assignments</h2>
                {canEdit && (
                  <Link
                    to={`/assignments/create?classId=${id}`}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Add Assignment
                  </Link>
                )}
              </div>

              {assignments.length === 0 ? (
                <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-6 text-center">
                  <p className="text-secondary-600 dark:text-dark-muted">No assignments available for this class yet.</p>
                  {canEdit && (
                    <Link to={`/assignments/create?classId=${id}`} className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
                      Create First Assignment
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-medium text-secondary-900 dark:text-dark-text">
                            {assignment.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDeadlineStatusClass(assignment.deadline)}`}>
                            Due: {new Date(assignment.deadline).toLocaleDateString()} • {getRemainingTimeText(assignment.deadline)}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-secondary-600 dark:text-dark-muted line-clamp-2 prose-sm prose-headings:mt-0 prose-headings:mb-1 prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0 prose dark:prose-invert break-words">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              a: ({ node, ...props }) => (
                                <a
                                  {...props}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 break-words overflow-wrap-anywhere"
                                />
                              ),
                            }}
                          >
                            {assignment.description}
                          </ReactMarkdown>
                        </div>
                        <div className="mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <Link
                            to={`/assignments/${assignment.id}`}
                            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            View Details
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1">
                              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                            </svg>
                          </Link>
                          <div className="flex flex-wrap gap-2">
                            {user?.role === 'praktikan' && (
                              <Link
                                to={`/assignments/${assignment.id}/submit`}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                              >
                                Submit
                              </Link>
                            )}
                            {canEdit && (
                              <Link
                                to={`/assignments/${assignment.id}/edit`}
                                className="inline-flex items-center px-3 py-1 border border-secondary-300 dark:border-dark-border text-sm font-medium rounded-md text-secondary-700 dark:text-dark-text bg-white dark:bg-gray-700 hover:bg-secondary-50 dark:hover:bg-gray-600"
                              >
                                Edit
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClassDetail;
