import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      if (user.profile_image) {
        setProfileImage(user.profile_image);
      }
    }
  }, [user]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    // Reset form when canceling edit
    if (isEditing && user) {
      setUsername(user.username);
    }
  };

  const handleImageClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setError(null);
    
    // Preview the image
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfileImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const formData = new FormData();
      formData.append('username', username);
      
      // Add image if there's a file selected
      if (fileInputRef.current?.files?.[0]) {
        formData.append('profileImage', fileInputRef.current.files[0]);
      }
      
      const response = await axios.put(`${API_URL}/users/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update user in context
      if (updateUser) {
        updateUser(response.data);
      }
      
      setSuccessMessage('Profile updated successfully');
      setIsEditing(false);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container-custom py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">You need to be logged in to view this page.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-dark-text mb-6">Your Profile</h1>
          
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
              <div 
                className={`w-24 h-24 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-4xl font-bold ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`}
                onClick={handleImageClick}
              >
                {profileImage ? (
                  <img src={profileImage} alt={username} className="w-full h-full object-cover" />
                ) : (
                  <span>{username.charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <div className="flex-1">
                <div className="mb-4">
                  <label htmlFor="username" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border ${isEditing ? 'border-primary-300 dark:border-primary-700' : 'border-secondary-300 dark:border-dark-border bg-secondary-50 dark:bg-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text`}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                    Email
                  </label>
                  <div className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border bg-secondary-50 dark:bg-gray-700 rounded-md text-secondary-700 dark:text-dark-text">
                    {user.email}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                    Role
                  </label>
                  <div className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border bg-secondary-50 dark:bg-gray-700 rounded-md text-secondary-700 dark:text-dark-text capitalize">
                    {user.role}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            
            <div className="flex justify-end space-x-3">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleEditToggle}
                    className="px-4 py-2 border border-secondary-300 dark:border-dark-border rounded-md text-secondary-700 dark:text-dark-text hover:bg-secondary-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors btn-hover"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleEditToggle}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors btn-hover"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
