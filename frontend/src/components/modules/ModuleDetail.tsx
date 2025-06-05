import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../../context/AuthContext';
import CreateAnnouncementButton from '../news/CreateAnnouncementButton';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface ModuleFile {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface Module {
  id: number;
  title: string;
  content: string;
  class_id: number;
  folder_id: number | null;
  folder_title?: string;
  class_title: string;
  creator_name: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  files?: ModuleFile[];
}

const ModuleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [relatedNews, setRelatedNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch module details
        const moduleResponse = await axios.get(`${API_URL}/modules/${id}`);
        setModule(moduleResponse.data);

        // Check if user is enrolled in the class
        if (user) {
          try {
            const enrolledResponse = await axios.get(`${API_URL}/classes/enrolled/me`);
            const enrolledIds = enrolledResponse.data.map((c: any) => c.id);
            setIsEnrolled(enrolledIds.includes(moduleResponse.data.class_id));
          } catch (err) {
            console.error('Error checking enrollment:', err);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching module data:', err);
        setError('Failed to load module data');
        setLoading(false);
      }
    };

    fetchModuleData();
  }, [id, user]);

  useEffect(() => {
    const fetchRelatedNews = async () => {
      if (!module) return;

      setLoadingNews(true);
      try {
        const response = await axios.get(`${API_URL}/news/for/module/${module.id}`);
        setRelatedNews(response.data);
      } catch (error) {
        console.error('Error fetching related news:', error);
      } finally {
        setLoadingNews(false);
      }
    };

    fetchRelatedNews();
  }, [module]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/modules/${id}`);
      navigate(`/classes/${module?.class_id}`);
    } catch (err) {
      console.error('Error deleting module:', err);
      setError('Failed to delete module');
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
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading module...</p>
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

  if (!module) {
    return (
      <div className="container-custom py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">Module not found</span>
        </div>
      </div>
    );
  }

  const isCreator = user && user.id === module.created_by;
  const canEdit = user && (user.role === 'aslab' || isCreator);
  const canAccess = isEnrolled || canEdit || user?.role === 'aslab';

  return (
    <div className="container-custom py-8">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-secondary-600 dark:text-dark-muted mb-1">
              <Link to={`/classes/${module.class_id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                {module.class_title}
              </Link>
              {module.folder_title && (
                <>
                  <span>•</span>
                  <span className="bg-secondary-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {module.folder_title}
                  </span>
                </>
              )}
              <span>•</span>
              <span>By {module.creator_name}</span>
              <span>•</span>
              <span>{new Date(module.created_at).toLocaleDateString()}</span>
            </div>
            <h1 className="text-3xl font-bold text-secondary-900 dark:text-dark-text">{module.title}</h1>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/modules/${id}/edit`}
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
            </div>
          )}
        </div>
      </div>

      {!canAccess && user?.role === 'praktikan' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg mb-6" role="alert">
          <p className="font-medium">You need to enroll in this class to access its content.</p>
          <Link to={`/classes/${module.class_id}`} className="mt-2 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Go to class page to enroll
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      )}

      {canAccess && (
        <>
          <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden mb-6">
            <div className="p-6">
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
                  {module.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Files Section */}
          {module.files && module.files.length > 0 && (
            <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden mb-6">
              <div className="p-4 border-b border-secondary-200 dark:border-dark-border">
                <h2 className="text-lg font-medium text-secondary-900 dark:text-dark-text">Attachments</h2>
              </div>
              <ul className="divide-y divide-secondary-200 dark:divide-dark-border">
                {module.files.map((file) => (
                  <li key={file.id} className="p-4 hover:bg-secondary-50 dark:hover:bg-gray-700">
                    <a
                      href={`${API_URL}/download?url=${encodeURIComponent(file.file_url)}&filename=${encodeURIComponent(file.file_name)}`}
                      className="flex flex-wrap items-center"
                      download={file.file_name}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 w-5 h-5 mr-3 text-secondary-500 dark:text-dark-muted">
                        <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" clipRule="evenodd" />
                        <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                      </svg>
                      <div className="flex-grow min-w-0 mr-2">
                        <span className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-medium break-words">
                          {file.file_name}
                        </span>
                        <p className="text-xs text-secondary-500 dark:text-dark-muted mt-1">
                          {(file.file_size / 1024).toFixed(2)} KB • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="flex-shrink-0 w-4 h-4 text-secondary-500 dark:text-dark-muted">
                        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related News Section */}
          {relatedNews.length > 0 && (
            <div className="mt-6 p-4 bg-secondary-50 dark:bg-gray-800 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-dark-text">
                  Related Announcements
                </h3>
                {module && user?.role === 'aslab' && (
                  <CreateAnnouncementButton
                    entityType="module"
                    entityId={module.id}
                    variant="compact"
                  />
                )}
              </div>
              <div className="space-y-2">
                {relatedNews.map(news => (
                  <Link
                    key={news.id}
                    to={`/news/${news.id}`}
                    className="block p-3 border border-secondary-200 dark:border-dark-border rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-primary-600 dark:text-primary-400">{news.title}</span>
                      <span className="text-xs text-secondary-500 dark:text-dark-muted">{new Date(news.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-secondary-600 dark:text-dark-muted line-clamp-2 mt-1">
                      {news.content.substring(0, 100)}...
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-6">
        <Link
          to={`/classes/${module.class_id}`}
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back to Class
        </Link>
      </div>
    </div>
  );
};

export default ModuleDetail;
