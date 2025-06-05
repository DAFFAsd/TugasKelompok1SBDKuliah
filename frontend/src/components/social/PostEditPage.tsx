import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PostForm from './PostForm'; // Assuming PostForm.tsx is in the same directory
import { useAuth } from '../../context/AuthContext'; // Needed if PostForm relies on it via context

const API_URL = import.meta.env.VITE_API_URL || '/api';

const PostEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // If PostForm uses useAuth, PostEditPage might not need it directly

  const handlePostUpdated = () => {
    if (id) {
      navigate(`/social/${id}`); // Navigate to the post detail page
    } else {
      navigate('/social'); // Fallback to the social feed
    }
  };

  if (!user) {
    // Or handle unauthorized access appropriately
    navigate('/login');
    return null;
  }
  
  // Ensure id is a valid number before passing as postId
  const postId = id ? Number(id) : undefined;

  if (postId === undefined || isNaN(postId)) {
    // Handle invalid ID, e.g., navigate to a not-found page or show an error
    navigate('/social'); // Or some error indication
    return <div>Invalid Post ID</div>;
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold mb-6 text-secondary-900 dark:text-dark-text">Edit Post</h1>
      <PostForm
        isEditing
        postId={postId}
        onPostCreated={handlePostUpdated}
        // initialContent, initialImageUrl, etc., will be fetched by PostForm itself
      />
    </div>
  );
};

export default PostEditPage;