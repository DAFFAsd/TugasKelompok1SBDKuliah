import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface News {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  author: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  linked_type: 'class' | 'module' | 'assignment' | null;
  linked_id: number | null;
  class_title?: string;
  class_id?: number;
  module_title?: string;
  module_id?: number;
  assignment_title?: string;
  assignment_id?: number;
}

const NewsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_URL}/news/${id}`);
        console.log('News data received:', response.data);  // Debug info
        setNews(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to load announcement');
        setLoading(false);
      }
    };

    fetchNews();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/news/${id}`);
      navigate('/news');
    } catch (err) {
      console.error('Error deleting news:', err);
      setError('Failed to delete announcement');
    }
  };

  // Determine linked entity details with better debug logging
  const getLinkedEntityInfo = () => {
    if (!news || !news.linked_type) {
      console.log("No linked entity found");
      return null;
    }

    console.log("Getting linked entity info:", {
      type: news.linked_type,
      id: news.linked_id,
      classTitle: news.class_title,
      classId: news.class_id,
      moduleTitle: news.module_title,
      moduleId: news.module_id,
      assignmentTitle: news.assignment_title,
      assignmentId: news.assignment_id
    });

    let icon;
    let title = '';
    let url = '';
    let entityType = '';

    switch (news.linked_type) {
      case 'class':
        if (!news.class_id || !news.class_title) {
          console.log("Missing class details for linked entity");
          return null;
        }
        entityType = 'Class';
        title = news.class_title;
        url = `/classes/${news.class_id}`;
        icon = (
          <div className="mr-3 p-2 bg-blue-100 dark:bg-blue-800/30 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-600 dark:text-blue-400">
              <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
              <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
              <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
            </svg>
          </div>
        );
        break;
      case 'module':
        if (!news.module_id || !news.module_title) {
          console.log("Missing module details for linked entity");
          return null;
        }
        entityType = 'Module';
        title = news.module_title;
        url = `/modules/${news.module_id}`;
        icon = (
          <div className="mr-3 p-2 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600 dark:text-green-400">
              <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
            </svg>
          </div>
        );
        break;
      case 'assignment':
        if (!news.assignment_id || !news.assignment_title) {
          console.log("Missing assignment details for linked entity");
          return null;
        }
        entityType = 'Assignment';
        title = news.assignment_title;
        url = `/assignments/${news.assignment_id}`;
        icon = (
          <div className="mr-3 p-2 bg-orange-100 dark:bg-orange-800/30 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-orange-600 dark:text-orange-400">
              <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
              <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
            </svg>
          </div>
        );
        break;
      default:
        console.log(`Unknown linked_type: ${news.linked_type}`);
        return null;
    }

    console.log("Linked entity info:", { entityType, title, url });
    return { icon, title, url, entityType };
  };

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading announcement...</p>
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

  if (!news) {
    return (
      <div className="container-custom py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">Announcement not found</span>
        </div>
      </div>
    );
  }

  const canEdit = user && user.role === 'aslab';

  return (
    <div className="container-custom py-8">
      <div className="mb-6">
        <Link to="/news" className="inline-flex items-center text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-1">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back to Announcements
        </Link>
      </div>

      <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-card overflow-hidden">
        {news.image_url && (
          <div className="w-full h-64 sm:h-80 overflow-hidden">
            <img
              src={news.image_url}
              alt={news.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-secondary-900 dark:text-dark-text">{news.title}</h1>
            {canEdit && (
              <div className="flex space-x-2">
                <Link
                  to={`/news/${id}/edit`}
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

          <div className="flex items-center text-secondary-600 dark:text-dark-muted text-sm mb-4">
            <span>By {news.author}</span>
            <span className="mx-2">•</span>
            <span>{new Date(news.created_at).toLocaleDateString()}</span>
            {news.updated_at !== news.created_at && (
              <>
                <span className="mx-2">•</span>
                <span>Updated: {new Date(news.updated_at).toLocaleDateString()}</span>
              </>
            )}
          </div>

          {/* Prominent Linked Entity Button Section */}
          {news.linked_type && (news.class_title || news.module_title || news.assignment_title) && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex items-center mb-3 md:mb-0">
                  {getLinkedEntityInfo()?.icon}
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Related {getLinkedEntityInfo()?.entityType}</span>
                    <h3 className="text-lg font-bold">{getLinkedEntityInfo()?.title}</h3>
                  </div>
                </div>

                <Link
                  to={getLinkedEntityInfo()?.url || '#'}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors"
                >
                  <span className="mr-2">Go to {getLinkedEntityInfo()?.entityType}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </Link>
              </div>
            </div>
          )}

          {/* Fallback message if there's a problem with linked data */}
          {news.linked_type && !(news.class_title || news.module_title || news.assignment_title) && (
            <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600 rounded-lg text-sm">
              <p>This announcement is linked to a {news.linked_type}, but the content could not be found.</p>
            </div>
          )}

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
              {news.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsDetail;
