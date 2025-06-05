import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
  linked_type: 'class' | 'module' | 'assignment' | null;
  linked_id: number | null;
  class_title?: string;
  class_id?: number;
  module_title?: string;
  module_id?: number;
  assignment_title?: string;
  assignment_id?: number;
  comments: Comment[];
  profile_image?: string | null; // Add profile image field
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: number;
  username: string;
  profile_image?: string | null; // Add profile image field
}

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/social/posts/${id}`);
        setPost(response.data);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load post. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentContent.trim()) return;
    
    try {
      setSubmitting(true);
      const response = await axios.post(`${API_URL}/social/posts/${id}/comments`, {
        content: commentContent
      });
      
      // Add the new comment to the list
      setPost(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [...prev.comments, response.data]
        };
      });
      
      // Clear the input
      setCommentContent('');
    } catch (err) {
      console.error('Error posting comment:', err);
      setError('Failed to post comment. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/social/comments/${commentId}`);
      
      // Remove the comment from the list
      setPost(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: prev.comments.filter(comment => comment.id !== commentId)
        };
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment. Please try again later.');
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/social/posts/${id}`);
      navigate('/social');
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post. Please try again later.');
    }
  };

  // Get linked entity information
  const getLinkedEntityInfo = () => {
    if (!post || !post.linked_type) return null;
    
    let icon;
    let title = '';
    let url = '';
    let entityType = '';
    
    switch (post.linked_type) {
      case 'class':
        if (!post.class_id || !post.class_title) return null;
        entityType = 'Class';
        title = post.class_title;
        url = `/classes/${post.class_id}`;
        icon = (
          <div className="mr-3 p-2 bg-blue-100 dark:bg-blue-800/30 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-600 dark:text-blue-400">
              <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
              <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
              <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
            </svg>
          </div>
        );
        break;
      case 'module':
        if (!post.module_id || !post.module_title) return null;
        entityType = 'Module';
        title = post.module_title;
        url = `/modules/${post.module_id}`;
        icon = (
          <div className="mr-3 p-2 bg-green-100 dark:bg-green-800/30 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600 dark:text-green-400">
              <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
            </svg>
          </div>
        );
        break;
      case 'assignment':
        if (!post.assignment_id || !post.assignment_title) return null;
        entityType = 'Assignment';
        title = post.assignment_title;
        url = `/assignments/${post.assignment_id}`;
        icon = (
          <div className="mr-3 p-2 bg-orange-100 dark:bg-orange-800/30 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-orange-600 dark:text-orange-400">
              <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
              <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
            </svg>
          </div>
        );
        break;
      default:
        return null;
    }
    
    return { icon, title, url, entityType };
  };

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="flex justify-center my-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-8">
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
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container-custom py-8">
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Post not found</h3>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === post.user_id;

  return (
    <div className="container-custom py-8">
      <div className="mb-6">
        <Link to="/social" className="inline-flex items-center text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-1">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back to Social
        </Link>
      </div>

      <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-lg overflow-hidden">
        {/* Post header */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-lg overflow-hidden">
                {post.profile_image ? (
      <img 
        src={post.profile_image} 
        alt={post.username} 
        className="h-full w-full object-cover"
      />
    ) : (
      post.username.charAt(0).toUpperCase()
    )}
              </div>
              <div className="ml-3">
                <p className="font-medium text-lg text-secondary-900 dark:text-dark-text">
                  {post.username}
                </p>
                <p className="text-sm text-secondary-500 dark:text-dark-muted">
                  {new Date(post.created_at).toLocaleDateString()} 
                  {post.updated_at !== post.created_at && ' (edited)'}
                </p>
              </div>
            </div>
            
            {isAuthor && (
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/social/${post.id}/edit`)}
                  className="inline-flex items-center px-3 py-1 rounded-md bg-secondary-100 dark:bg-gray-700 text-secondary-800 dark:text-dark-text text-sm hover:bg-secondary-200 dark:hover:bg-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                    <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10a.75.75 0 000-1.5H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={handleDeletePost}
                  className="inline-flex items-center px-3 py-1 rounded-md bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 text-sm hover:bg-red-200 dark:hover:bg-red-900/40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z" />
                    <path d="M8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Prominent Linked Entity Button Section */}
          {post.linked_type && getLinkedEntityInfo() && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex items-center mb-3 md:mb-0">
                  {getLinkedEntityInfo()?.icon}
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Related {getLinkedEntityInfo()?.entityType}
                    </span>
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
          
          {/* Use ReactMarkdown for rendering the post content */}
          <div className="text-secondary-900 dark:text-dark-text mb-4 prose dark:prose-invert prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-headings:text-secondary-900 dark:prose-headings:text-dark-text max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 break-words"
                  />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
          
          {post.image_url && (
            <div className="mb-4">
              <img
                src={post.image_url}
                alt="Post attachment"
                className="w-full h-auto rounded-lg max-h-96 object-contain"
              />
            </div>
          )}
          
          {/* Comments section */}
          <div className="mt-6 border-t border-secondary-200 dark:border-dark-border pt-4">
            <h3 className="font-medium text-lg text-secondary-900 dark:text-dark-text mb-4">
              Comments ({post.comments.length})
            </h3>
            
            {user && (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="flex items-start space-x-2">
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex-shrink-0 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold overflow-hidden">
                    {user?.profile_image ? (
      <img 
        src={user.profile_image} 
        alt={user.username} 
        className="h-full w-full object-cover"
      />
    ) : (
      user?.username.charAt(0).toUpperCase()
    )}
                  </div>
                  <div className="flex-grow">
                    <textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                      rows={1}
                      required
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={submitting || !commentContent.trim()}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {submitting ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
            
            {post.comments.length > 0 ? (
              <div className="space-y-4">
                {post.comments.map(comment => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex-shrink-0 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold overflow-hidden">
                      {comment.profile_image ? (
        <img 
          src={comment.profile_image} 
          alt={comment.username} 
          className="h-full w-full object-cover"
        />
      ) : (
        comment.username.charAt(0).toUpperCase()
      )}
                    </div>
                    <div className="flex-grow">
                      <div className="bg-secondary-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-secondary-900 dark:text-dark-text">
                            {comment.username}
                          </span>
                          {user?.id === comment.user_id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-secondary-400 hover:text-red-500 dark:text-dark-muted dark:hover:text-red-400"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5z" />
                                <path d="M10 .25a.75.75 0 01.75.75v.75h1.5V1a2.25 2.25 0 00-4.5 0v.75h1.5V1A.75.75 0 0110 .25z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <p className="text-secondary-700 dark:text-dark-text">{comment.content}</p>
                      </div>
                      <p className="text-xs text-secondary-500 dark:text-dark-muted mt-1">
                        {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-secondary-500 dark:text-dark-muted">
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
