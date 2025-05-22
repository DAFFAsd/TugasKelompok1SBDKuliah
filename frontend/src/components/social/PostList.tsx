import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import PostCard from './PostCard.tsx';

interface Post {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  username: string;
  comment_count: number;
}

interface PostListProps {
  posts: Post[];
  onPostDeleted: (postid: string) => void;
}

const PostList = ({ posts, onPostDeleted }: PostListProps) => {
  const { user } = useAuth();
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  
  const handleEditPost = (postid: string) => {
    setEditingPostId(postId);
  };
  
  const handleCancelEdit = () => {
    setEditingPostId(null);
  };

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <PostCard 
          key={post.id} 
          post={post} 
          isEditing={editingPostId === post.id}
          onEdit={handleEditPost}
          onCancelEdit={handleCancelEdit}
          onDelete={onPostDeleted}
          isOwnPost={user?.id === post.user_id}
        />
      ))}
    </div>
  );
};

export default PostList;
