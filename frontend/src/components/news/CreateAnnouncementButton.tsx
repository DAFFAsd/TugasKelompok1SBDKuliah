import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface CreateAnnouncementButtonProps {
  entityType: 'class' | 'module' | 'assignment';
  entityId: number | string;
  entityTitle?: string;
  variant?: 'default' | 'icon' | 'text' | 'compact';
  className?: string;
}

const CreateAnnouncementButton: React.FC<CreateAnnouncementButtonProps> = ({
  entityType,
  entityId,
  entityTitle,
  variant = 'default',
  className = ''
}) => {
  const { user } = useAuth();

  // Only aslab users can create announcements
  if (user?.role !== 'aslab') return null;

  const url = `/news/create?type=${entityType}&id=${entityId}`;
  const titleText = entityTitle ? 
    `Create announcement for "${entityTitle}"` : 
    `Create announcement for this ${entityType}`;

  if (variant === 'icon') {
    return (
      <Link 
        to={url}
        className={`p-1 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 ${className}`}
        title={titleText}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0018 12.25v-8.5a.75.75 0 00-.904-.734l-2.38.501a7.25 7.25 0 01-4.186-.363l-.502-.2a8.75 8.75 0 00-5.053-.439l-1.475.31V2.75z" />
        </svg>
      </Link>
    );
  }

  if (variant === 'text') {
    return (
      <Link 
        to={url} 
        className={`text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium ${className}`}
      >
        Create announcement
      </Link>
    );
  }
  
  if (variant === 'compact') {
    return (
      <Link
        to={url}
        className={`inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none ${className}`}
        title={titleText}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
          <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0018 12.25v-8.5a.75.75 0 00-.904-.734l-2.38.501a7.25 7.25 0 01-4.186-.363l-.502-.2a8.75 8.75 0 00-5.053-.439l-1.475.31V2.75z" />
        </svg>
        Announce
      </Link>
    );
  }

  // Default variant
  return (
    <Link
      to={url}
      className={`inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
        <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0018 12.25v-8.5a.75.75 0 00-.904-.734l-2.38.501a7.25 7.25 0 01-4.186-.363l-.502-.2a8.75 8.75 0 00-5.053-.439l-1.475.31V2.75z" />
      </svg>
      Create Announcement
    </Link>
  );
};

export default CreateAnnouncementButton;
