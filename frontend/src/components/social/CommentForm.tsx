import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface CommentFormProps {
  postId: number;
  onCommentAdded: (comment: any) => void;
}

const CommentForm = ({ postId, onCommentAdded }: CommentFormProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_URL}/social/posts/${postId}/comments`, {
        content: content.trim()
      });
      
      onCommentAdded(response.data);
      setContent('');
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      setError(err.response?.data?.message || 'Failed to submit comment');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="text-red-500 text-sm mb-2">{error}</div>
      )}
      <div className="flex items-start space-x-2">
        <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            className="w-full px-3 py-1 text-sm border border-secondary-300 dark:border-dark-border rounded-full shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
            maxLength={500}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-3 py-1 bg-primary-600 text-white text-sm rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Post'}
        </button>
      </div>
    </form>
  );
};

export default CommentForm;
