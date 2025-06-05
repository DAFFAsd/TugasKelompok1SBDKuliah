import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
// Remove ReactMarkdown import since we're not using it in the list view anymore
// import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

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

const NewsList = () => {
  const { user } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_URL}/news`);
        setNews(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to load announcements');
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading announcements...</p>
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

  // Helper function to get linked entity information
  const getLinkedInfo = (item: News) => {
    if (!item.linked_type) return null;
    
    let title = '';
    let url = '';
    let icon = null;
    let color = '';
    let bgColor = '';
    let darkBgColor = '';
    
    if (item.linked_type === 'class' && item.class_title) {
      title = item.class_title;
      url = `/classes/${item.class_id}`;
      color = 'text-blue-600 dark:text-blue-400';
      bgColor = 'bg-blue-100';
      darkBgColor = 'dark:bg-blue-900/30';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
          <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
          <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
          <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
        </svg>
      );
    } else if (item.linked_type === 'module' && item.module_title) {
      title = item.module_title;
      url = `/modules/${item.module_id}`;
      color = 'text-green-600 dark:text-green-400';
      bgColor = 'bg-green-100';
      darkBgColor = 'dark:bg-green-900/30';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
          <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
        </svg>
      );
    } else if (item.linked_type === 'assignment' && item.assignment_title) {
      title = item.assignment_title;
      url = `/assignments/${item.assignment_id}`;
      color = 'text-orange-600 dark:text-orange-400';
      bgColor = 'bg-orange-100';
      darkBgColor = 'dark:bg-orange-900/30';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
          <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
          <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
        </svg>
      );
    } else {
      return null;
    }
    
    return { title, url, icon, color, bgColor, darkBgColor };
  };

  // Helper function to strip markdown and limit length
  const stripMarkdown = (markdown: string, maxLength: number = 150) => {
    // Simple markdown stripping - remove common markdown syntax
    let text = markdown
      .replace(/#+\s/g, '') // headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // bold
      .replace(/\*(.+?)\*/g, '$1') // italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
      .replace(/!\[.+?\]\(.+?\)/g, '') // images
      .replace(/`(.+?)`/g, '$1') // inline code
      .replace(/```[\s\S]+?```/g, '') // code blocks
      .replace(/>\s(.+)/g, '$1') // blockquotes
      .replace(/- (.+)/g, '$1') // unordered lists
      .replace(/\d+\.\s(.+)/g, '$1'); // ordered lists
    
    // Trim and limit length
    text = text.trim();
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return text;
  };

  // Format date to make it more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - show time
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within a week
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      // More than a week ago
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="container-custom py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-dark-text">Announcements</h1>
        {user?.role === 'aslab' && (
          <Link
            to="/news/create"
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Post Announcement
          </Link>
        )}
      </div>

      {news.length === 0 ? (
        <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-secondary-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="text-lg font-medium text-secondary-900 dark:text-dark-text mb-2">No Announcements</h3>
          <p className="text-secondary-600 dark:text-dark-muted max-w-sm mx-auto">
            There are currently no announcements to display. Check back later for updates.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-secondary-200 dark:divide-gray-700">
            {news.map((item) => {
              const linkedInfo = getLinkedInfo(item);
              
              return (
                <li key={item.id} className="relative hover:bg-secondary-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-start space-x-4">
                      {/* Notification icon - Fixed alignment */}
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${linkedInfo ? `${linkedInfo.bgColor} ${linkedInfo.darkBgColor}` : 'bg-primary-100 dark:bg-primary-900/30'}`}>
                          {linkedInfo ? (
                            <div className={`flex items-center justify-center ${linkedInfo.color}`}>
                              {linkedInfo.icon}
                            </div>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <Link to={`/news/${item.id}`} className="text-lg font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 line-clamp-1">
                            {item.title}
                          </Link>
                          <span className="text-xs text-secondary-500 dark:text-dark-muted ml-2 whitespace-nowrap">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        
                        {linkedInfo && (
                          <Link 
                            to={linkedInfo.url}
                            className="inline-flex items-center mt-1 text-sm font-medium text-secondary-700 dark:text-dark-text hover:underline"
                          >
                            <div className="mr-2 flex items-center justify-center">
                              {linkedInfo.icon}
                            </div>
                            <span>{linkedInfo.title}</span>
                          </Link>
                        )}
                        
                        <div className="mt-2 flex">
                          {/* Optional image thumbnail - smaller and to the left */}
                          {item.image_url && (
                            <div className="flex-shrink-0 mr-4">
                              <img 
                                src={item.image_url} 
                                alt="" 
                                className="h-20 w-20 object-cover rounded"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            {/* Display plain text instead of rendered Markdown */}
                            <div className="line-clamp-2 text-secondary-600 dark:text-dark-muted text-sm">
                              {stripMarkdown(item.content)}
                            </div>
                            
                            <div className="mt-2 flex justify-between items-center">
                              <span className="text-xs text-secondary-500 dark:text-dark-muted">
                                By {item.author}
                              </span>
                              <Link
                                to={`/news/${item.id}`}
                                className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center"
                              >
                                Read more
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1">
                                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Timestamp indicator line */}
                  <div className="absolute left-9 top-16 bottom-0 w-0.5 bg-secondary-100 dark:bg-gray-700 -ml-px"></div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NewsList;
