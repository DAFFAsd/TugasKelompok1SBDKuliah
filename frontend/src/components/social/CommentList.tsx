import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: number;
  username: string;
}

interface CommentListProps {
  comments: Comment[];
  postId: number;
  onCommentDeleted: (commentId: number) => void;
}

const CommentList = ({ comments, postId, onCommentDeleted }: CommentListProps) => {
  const { user } = useAuth();

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/social/comments/${commentId}`);
      onCommentDeleted(commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  if (comments.length === 0) {
    return (
      <div className="text-center py-3 text-sm text-secondary-500 dark:text-dark-muted">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map(comment => (
        <div 
          key={comment.id} 
          className="flex space-x-2"
        >
          <div className="h-8 w-8 rounded-full bg-secondary-100 dark:bg-gray-700 flex items-center justify-center text-secondary-700 dark:text-dark-text font-bold text-sm">
            {comment.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="bg-secondary-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <div className="flex justify-between items-start">
                <div className="font-medium text-secondary-900 dark:text-dark-text text-sm">
                  {comment.username}
                </div>
                <div className="text-xs text-secondary-500 dark:text-dark-muted">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </div>
              </div>
              <p className="text-secondary-700 dark:text-dark-text text-sm mt-1">
                {comment.content}
              </p>
            </div>
            
            {user?.id === comment.user_id && (
              <div className="mt-1 flex justify-end">
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
