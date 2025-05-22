import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext.tsx';
import PostForm from './PostForm.tsx';
import CommentList from './CommentList.tsx';
import CommentForm from './CommentForm.tsx';



// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

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

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  username: string;
  comment_count: number;
}

interface PostCardProps {
  post: Post;
  isEditing: boolean;
  isOwnPost: boolean;
  onEdit: (postId: string) => void;
  onCancelEdit: () => void;
  onDelete: (postId: string) => void;
}

const PostCard = ({
  post,
  isEditing,
  isOwnPost,
  onEdit,
  onCancelEdit,
  onDelete
}: PostCardProps) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      try {
        setLoadingComments(true);
        const response = await axios.get(`${API_URL}/social/posts/${post.id}`);
        setComments(response.data.comments || []);
        setShowComments(true);
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError('Failed to load comments');
      } finally {
        setLoadingComments(false);
      }
    } else {
      setShowComments(!showComments);
    }
  };

  const handleCommentAdded = (newComment: any) => {
    setComments([...comments, newComment]);
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments(comments.filter(comment => comment.id !== commentId));
  };

  const handlePostUpdated = () => {
    onCancelEdit();
    // In a real app, you might want to refresh the post data here
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // If less than 24 hours ago, show relative time
    if (now.getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // Otherwise show formatted date
    return format(date, 'MMM d, yyyy');
  };

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-md overflow-hidden">
        <div className="p-4">
          <PostForm
            post={post}
            isEditing={true}
            onPostUpdated={handlePostUpdated}
            onCancel={onCancelEdit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold">
              {post.username.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="font-medium text-secondary-900 dark:text-dark-text">
                {post.username}
              </p>
              <p className="text-xs text-secondary-500 dark:text-dark-muted">
                {formatDate(post.created_at)}
                {post.updated_at !== post.created_at && ' (edited)'}
              </p>
            </div>
          </div>

          {isOwnPost && (
            <div className="relative">
              <button
                className="text-secondary-500 dark:text-dark-muted hover:text-secondary-700 dark:hover:text-dark-text"
                onClick={() => {
                  const menu = document.getElementById(`post-menu-${post.id}`);
                  if (menu) {
                    menu.classList.toggle('hidden');
                  }
                }}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              <div
                id={`post-menu-${post.id}`}
                className="hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10"
              >
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => {
                      onEdit(post.id);
                      const menu = document.getElementById(`post-menu-${post.id}`);
                      if (menu) {
                        menu.classList.add('hidden');
                      }
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="w-full text-left block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this post?')) {
                        onDelete(post.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-3">
          {/* Display a simplified markdown preview */}
          <p className="text-secondary-900 dark:text-dark-text line-clamp-3">
            {stripMarkdownForPreview(post.content, 200)}
          </p>
        </div>

        {post.image_url && (
          <div className="mb-3">
            <img
              src={post.image_url}
              alt="Post attachment"
              className="w-full h-auto rounded-lg max-h-96 object-cover"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-sm mt-4">
          <button
            onClick={toggleComments}
            className="flex items-center text-secondary-500 dark:text-dark-muted hover:text-secondary-700 dark:hover:text-dark-text"
          >
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h10z" />
            </svg>
            {post.comment_count} {post.comment_count === 1 ? 'Comment' : 'Comments'}
          </button>
          <Link
            to={`/social/${post.id}`}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            View Post
          </Link>
        </div>
      </div>

      {showComments && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-200 dark:border-gray-700">
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-2">{error}</div>
          ) : (
            <>
              <CommentList
                comments={comments}
                postid={post.id}
                onCommentDeleted={handleCommentDeleted}
              />
              {user && (
                <div className="mt-2">
                  <CommentForm
                    postid={post.id}
                    onCommentAdded={handleCommentAdded}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;
