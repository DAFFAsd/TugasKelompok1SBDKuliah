import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Module {
  id: number;
  title: string;
  folder_id: number | null;
  folder_title?: string;
  class_id: number;
  order_index: number;
  created_by: number;
  creator_name: string;
  created_at: string;
}

interface ModuleListProps {
  classId: number;
  folderId: number | null;
  canEdit?: boolean | null;
  onModuleSelect?: (moduleId: number) => void;
}

const ModuleList = ({ classId, folderId, canEdit, onModuleSelect }: ModuleListProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Use canEdit prop if provided, otherwise check if user is aslab
  const hasEditPermission = canEdit !== undefined ? canEdit : user?.role === 'aslab';
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch modules for the folder or class
  useEffect(() => {
    const fetchModules = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;
        if (folderId) {
          // Fetch modules for a specific folder
          response = await axios.get(`${API_URL}/modules/folder/${folderId}`);
        } else {
          // Fetch all modules for the class
          response = await axios.get(`${API_URL}/modules/class/${classId}`);
        }

        setModules(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching modules:', err);
        setError('Failed to load modules');
        setLoading(false);
      }
    };

    fetchModules();
  }, [classId, folderId]);

  // Handle creating a new module
  const handleCreateModule = () => {
    if (folderId) {
      navigate(`/modules/create?classId=${classId}&folderId=${folderId}`);
    } else {
      navigate(`/modules/create?classId=${classId}`);
    }
  };

  // Handle module selection
  const handleModuleClick = (moduleId: number) => {
    if (onModuleSelect) {
      onModuleSelect(moduleId);
    } else {
      navigate(`/modules/${moduleId}`);
    }
  };

  if (loading && modules.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-secondary-200 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-secondary-200 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-secondary-200 dark:bg-gray-600 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow">
      <div className="p-4 border-b border-secondary-200 dark:border-dark-border flex justify-between items-center">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-dark-text">
          {folderId ? 'Modules in Folder' : 'All Modules'}
        </h3>
        {hasEditPermission && (
          <button
            onClick={handleCreateModule}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add Module
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          <p>{error}</p>
        </div>
      )}

      {modules.length === 0 ? (
        <div className="p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 mx-auto text-secondary-400 dark:text-dark-muted mb-4">
            <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
          </svg>
          <p className="text-secondary-600 dark:text-dark-muted">No modules found in this {folderId ? 'folder' : 'class'}.</p>
          {hasEditPermission && (
            <button
              onClick={handleCreateModule}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Create First Module
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-secondary-200 dark:divide-dark-border">
          {modules.map((module) => (
            <li key={module.id} className="p-4 hover:bg-secondary-50 dark:hover:bg-gray-700">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleModuleClick(module.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-primary-500 dark:text-primary-400">
                      <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
                      <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                    </svg>
                    <span className="font-medium text-secondary-900 dark:text-dark-text">{module.title}</span>
                  </div>
                  <div className="mt-1 flex items-center text-xs text-secondary-500 dark:text-dark-muted">
                    <span>By {module.creator_name}</span>
                    <span className="mx-1">•</span>
                    <span>{new Date(module.created_at).toLocaleDateString()}</span>
                    {!folderId && module.folder_title && (
                      <>
                        <span className="mx-1">•</span>
                        <span className="bg-secondary-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {module.folder_title}
                        </span>
                      </>
                    )}
                  </div>
                </button>

                {hasEditPermission && (
                  <div className="flex items-center space-x-1">
                    <Link
                      to={`/modules/${module.id}/edit`}
                      className="p-1 text-secondary-500 hover:text-secondary-700 dark:text-dark-muted dark:hover:text-dark-text"
                      aria-label="Edit module"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ModuleList;
