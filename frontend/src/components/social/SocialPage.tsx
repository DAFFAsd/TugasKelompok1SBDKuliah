import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PostForm from './PostForm.tsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Post {
  id: number;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: number;
  username: string;
  comment_count: number;
  // Add linked entity fields
  linked_type: 'class' | 'module' | 'assignment' | null;
  linked_id: number | null;
  class_title?: string;
  class_id?: number;
  module_title?: string;
  module_id?: number;
  assignment_title?: string;
  assignment_id?: number;
  profile_image?: string | null; // Add profile image field
}

// Helper function to strip markdown and limit length for previews
const stripMarkdownForPreview = (markdown: string, maxLength: number = 150) => {
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

const SocialPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'class' | 'module' | 'assignment'>('all');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/social/posts`);
        setPosts(response.data);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [refreshTrigger]);

  const handlePostCreated = () => {
    // Trigger a refresh of the posts list
    setRefreshTrigger(prev => prev + 1);
  };

  // Helper function to get linked entity information
  const getLinkedInfo = (post: Post) => {
    if (!post.linked_type) return null;
    
    let title = '';
    let url = '';
    let icon = null;
    let color = '';
    let bgColor = '';
    let borderColor = '';
    let darkBgColor = '';
    
    if (post.linked_type === 'class' && post.class_title) {
      title = post.class_title;
      url = `/classes/${post.class_id}`;
      color = 'blue';
      bgColor = 'bg-blue-50';
      darkBgColor = 'dark:bg-blue-900/20';
      borderColor = 'border-blue-200 dark:border-blue-800/50';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600 dark:text-blue-400">
          <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
          <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
          <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
        </svg>
      );
    } else if (post.linked_type === 'module' && post.module_title) {
      title = post.module_title;
      url = `/modules/${post.module_id}`;
      color = 'green';
      bgColor = 'bg-green-50';
      darkBgColor = 'dark:bg-green-900/20';
      borderColor = 'border-green-200 dark:border-green-800/50';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600 dark:text-green-400">
          <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
        </svg>
      );
    } else if (post.linked_type === 'assignment' && post.assignment_title) {
      title = post.assignment_title;
      url = `/assignments/${post.assignment_id}`;
      color = 'orange';
      bgColor = 'bg-orange-50';
      darkBgColor = 'dark:bg-orange-900/20';
      borderColor = 'border-orange-200 dark:border-orange-800/50';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-orange-600 dark:text-orange-400">
          <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
          <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
        </svg>
      );
    } else {
      return null;
    }
    
    return { title, url, icon, color, bgColor, darkBgColor, borderColor };
  };

  // Format date to display in a friendlier way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // If less than 24 hours, show relative time
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) {
        const minutes = Math.floor(diff / (1000 * 60));
        if (minutes < 1) return 'Just now';
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // If less than 7 days, show day of week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
      return date.toLocaleDateString(undefined, options);
    }
    
    // Otherwise show full date
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined };
    return date.toLocaleDateString(undefined, options);
  };

  // Filter posts based on the current filter
  const filteredPosts = posts.filter(post => {
    if (currentFilter === 'all') return true;
    return post.linked_type === currentFilter;
  });

  return (
    <div className="container-custom py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-dark-text mb-3 md:mb-0">
            Digilab Social
          </h1>
          
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setCurrentFilter('all')} 
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                currentFilter === 'all' 
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 font-medium' 
                  : 'text-secondary-600 dark:text-dark-muted hover:bg-secondary-100 dark:hover:bg-gray-700'
              }`}
            >
              All Posts
            </button>
            <button 
              onClick={() => setCurrentFilter('class')} 
              className={`px-3 py-1.5 text-sm rounded-full flex items-center transition-colors ${
                currentFilter === 'class' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-medium' 
                  : 'text-secondary-600 dark:text-dark-muted hover:bg-secondary-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                <path d="M9.664 1.319a.75.75 0 01.672 0 41.059 41.059 0 018.198 5.424.75.75 0 01-.254 1.285 31.372 31.372 0 00-7.86 3.83.75.75 0 01-.84 0 31.508 31.508 0 00-2.08-1.287V9.394c0-.244.116-.463.302-.592a35.504 35.504 0 013.305-2.033.75.75 0 00-.714-1.319 37 37 0 00-3.446 2.12A2.216 2.216 0 006 9.393v.38a31.293 31.293 0 00-4.28-1.746.75.75 0 01-.254-1.285 41.059 41.059 0 018.198-5.424zM6 11.459a29.747 29.747 0 00-2.455 8.912.75.75 0 001.498.085c.48-8.396 1.277-9.448 5.957-13.526A34.077 34.077 0 016 11.459z" />
                <path d="M18.338 4.068a.75.75 0 00-1.173-.55l-1.414 1.06a.75.75 0 01-.9 0l-1.414-1.06a.75.75 0 00-1.172.55l-.245 1.751a.75.75 0 01-.577.637l-1.674.452a.75.75 0 00-.036 1.441l1.639.553a.75.75 0 01.5.75L12 11.039a.75.75 0 001.289.536l1.138-1.376a.75.75 0 01.9-.17l1.673.903a.75.75 0 001.025-1.03l-1.02-1.622a.75.75 0 01-.154-.92l.903-1.67a.75.75 0 00-.699-1.103l-1.903.202a.75.75 0 01-.734-.537l-.241-1.74zm-3.769 6.9l.1.001z" />
              </svg>
              Classes
            </button>
            <button 
              onClick={() => setCurrentFilter('module')} 
              className={`px-3 py-1.5 text-sm rounded-full flex items-center transition-colors ${
                currentFilter === 'module' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-medium' 
                  : 'text-secondary-600 dark:text-dark-muted hover:bg-secondary-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                <path d="M10.75 16.82A7.462 7.462 0 0115 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0018 15.06v-11a.75.75 0 00-.546-.721A9.006 9.006 0 0015 3a8.963 8.963 0 00-4.25 1.065V16.82zM9.25 4.065A8.963 8.963 0 005 3c-.85 0-1.673.118-2.454.339A.75.75 0 002 4.06v11a.75.75 0 00.954.721A7.506 7.506 0 015 15.5c1.579 0 3.042.487 4.25 1.32V4.065z" />
              </svg>
              Modules
            </button>
            <button 
              onClick={() => setCurrentFilter('assignment')} 
              className={`px-3 py-1.5 text-sm rounded-full flex items-center transition-colors ${
                currentFilter === 'assignment' 
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 font-medium' 
                  : 'text-secondary-600 dark:text-dark-muted hover:bg-secondary-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                <path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5v2.25h.75a.75.75 0 010 1.5H5.75a.75.75 0 010-1.5h.75V14H4.25A2.25 2.25 0 012 11.75v-6.5A2.25 2.25 0 014.25 3h11.738zm-8.282 6.107a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
              </svg>
              Assignments
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <button 
              className="absolute top-0 bottom-0 right-0 px-4"
              onClick={() => setError(null)}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {user && (
          <div className="mb-6">
            <PostForm onPostCreated={handlePostCreated} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center my-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="space-y-5">
            {filteredPosts.map(post => {
              const linkedInfo = getLinkedInfo(post);
              
              return (
                <div key={post.id} className={`rounded-lg shadow-md overflow-hidden ${
                  linkedInfo 
                    ? `${linkedInfo.bgColor} ${linkedInfo.darkBgColor} border border-${linkedInfo.borderColor}` 
                    : 'bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700'
                }`}>
                  {/* Thread-like header section */}
                  <div className="px-4 py-3 border-b border-secondary-200 dark:border-dark-border flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full flex-shrink-0 bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold overflow-hidden">
                        {post.profile_image ? (
                          <img 
                            src={post.profile_image} 
                            alt={post.username} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{post.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      
                      <div className="ml-3">
                        <div className="flex items-center">
                          <p className="font-semibold text-secondary-900 dark:text-dark-text">
                            {post.username}
                          </p>
                          <span className="mx-2 text-secondary-400 dark:text-dark-muted">&bull;</span>
                          <p className="text-sm text-secondary-500 dark:text-dark-muted">
                            {formatDate(post.created_at)}
                          </p>
                          {post.updated_at !== post.created_at && (
                            <span className="ml-1 text-xs text-secondary-500 dark:text-dark-muted italic">(edited)</span>
                          )}
                        </div>
                        
                        {/* Display linked entity as subtitle */}
                        {linkedInfo && (
                          <div className="flex items-center mt-0.5 text-sm">
                            <span className="text-secondary-500 dark:text-dark-muted">in</span>
                            <Link 
                              to={linkedInfo.url}
                              className={`ml-1.5 inline-flex items-center font-medium ${
                                linkedInfo.color === 'blue' ? 'text-blue-700 dark:text-blue-400' :
                                linkedInfo.color === 'green' ? 'text-green-700 dark:text-green-400' :
                                'text-orange-700 dark:text-orange-400'
                              } hover:underline`}
                            >
                              {linkedInfo.icon}
                              <span className="ml-1">{linkedInfo.title}</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Link to full post */}
                    <Link 
                      to={`/social/${post.id}`}
                      className="text-secondary-500 dark:text-dark-muted hover:text-secondary-700 dark:hover:text-dark-text transition-colors"
                      aria-label="View thread"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Link>
                  </div>
                  
                  {/* Post content */}
                  <div className="px-4 py-3 bg-white dark:bg-gray-800">
                    <div className="mb-3">
                      {/* Display stripped markdown preview in post list */}
                      <p className="text-secondary-900 dark:text-dark-text">
                        {stripMarkdownForPreview(post.content, 200)}
                      </p>
                    </div>
                    
                    {post.image_url && (
                      <div className="mb-3">
                        <img
                          src={post.image_url}
                          alt="Post attachment"
                          className="w-full h-auto rounded-lg max-h-60 object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Footer with comment count and view link */}
                  <div className="px-4 py-2 bg-secondary-50 dark:bg-gray-700/50 border-t border-secondary-200 dark:border-dark-border flex justify-between items-center">
                    <div className="flex items-center text-secondary-500 dark:text-dark-muted">
                      <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h10z" />
                      </svg>
                      <span>{post.comment_count} {post.comment_count === 1 ? 'reply' : 'replies'}</span>
                    </div>
                    
                    <Link 
                      to={`/social/${post.id}`}
                      className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 hover:underline"
                    >
                      <span className="mr-1">View Thread</span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow border border-secondary-200 dark:border-dark-border">
            {currentFilter !== 'all' ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-12 w-12 text-secondary-400 dark:text-dark-muted">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No {currentFilter} posts found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  There are no posts linked to {currentFilter}s yet.
                </p>
                <button
                  onClick={() => setCurrentFilter('all')}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Show all posts
                </button>
              </>
            ) : (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No posts yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Be the first to share something with the community!
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialPage;
