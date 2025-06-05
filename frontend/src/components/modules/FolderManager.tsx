import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Folder {
  id: number;
  title: string;
  order_index: number;
  module_count: number;
  created_by: number;
  creator_name: string;
  created_at: string;
}

interface FolderManagerProps {
  classId: number;
  onFolderSelect: (folderId: number | null) => void;
  selectedFolderId: number | null;
  canEdit?: boolean | null;
}

const FolderManager = ({ classId, onFolderSelect, selectedFolderId, canEdit }: FolderManagerProps) => {
  const { user } = useAuth();
  // Use canEdit prop if provided, otherwise check if user is aslab
  const hasEditPermission = canEdit !== undefined ? canEdit : user?.role === 'aslab';
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderTitle, setEditingFolderTitle] = useState('');

  // Fetch folders for the class
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_URL}/folders/class/${classId}`);
        setFolders(response.data);

        // If no folder is selected and there are folders, select the first one
        if (selectedFolderId === null && response.data.length > 0) {
          onFolderSelect(response.data[0].id);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching folders:', err);
        setError('Failed to load folders');
        setLoading(false);
      }
    };

    fetchFolders();
  }, [classId, selectedFolderId, onFolderSelect]);

  // Handle adding a new folder
  const handleAddFolder = async () => {
    if (!newFolderTitle.trim()) {
      return;
    }

    try {
      setIsAddingFolder(true);

      const response = await axios.post(`${API_URL}/folders`, {
        class_id: classId,
        title: newFolderTitle,
        order_index: folders.length // Add to the end
      });

      setFolders([...folders, response.data]);
      setNewFolderTitle('');
      setIsAddingFolder(false);

      // Select the newly created folder
      onFolderSelect(response.data.id);
    } catch (err) {
      console.error('Error adding folder:', err);
      setError('Failed to add folder');
      setIsAddingFolder(false);
    }
  };

  // Handle updating a folder
  const handleUpdateFolder = async (folderId: number) => {
    if (!editingFolderTitle.trim()) {
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/folders/${folderId}`, {
        title: editingFolderTitle
      });

      setFolders(folders.map(folder =>
        folder.id === folderId ? { ...folder, title: response.data.title } : folder
      ));

      setEditingFolderId(null);
      setEditingFolderTitle('');
    } catch (err) {
      console.error('Error updating folder:', err);
      setError('Failed to update folder');
    }
  };

  // Handle deleting a folder
  const handleDeleteFolder = async (folderId: number) => {
    if (!window.confirm('Are you sure you want to delete this folder? All modules in this folder will also be deleted.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/folders/${folderId}`);

      const updatedFolders = folders.filter(folder => folder.id !== folderId);
      setFolders(updatedFolders);

      // If the deleted folder was selected, select another folder or null
      if (selectedFolderId === folderId) {
        if (updatedFolders.length > 0) {
          onFolderSelect(updatedFolders[0].id);
        } else {
          onFolderSelect(null);
        }
      }
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError('Failed to delete folder');
    }
  };

  // Start editing a folder
  const startEditingFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderTitle(folder.title);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingFolderId(null);
    setEditingFolderTitle('');
  };

  if (loading && folders.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow mb-4">
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
    <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow mb-4">
      <div className="p-4 border-b border-secondary-200 dark:border-dark-border">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-dark-text">Folders</h3>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          <p>{error}</p>
        </div>
      )}

      <ul className="divide-y divide-secondary-200 dark:divide-dark-border">
        {folders.map((folder) => (
          <li key={folder.id} className={`p-4 hover:bg-secondary-50 dark:hover:bg-gray-700 ${selectedFolderId === folder.id ? 'bg-secondary-100 dark:bg-gray-700' : ''}`}>
            {editingFolderId === folder.id ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingFolderTitle}
                  onChange={(e) => setEditingFolderTitle(e.target.value)}
                  className="flex-1 px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                  placeholder="Folder title"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdateFolder(folder.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="inline-flex items-center px-3 py-2 border border-secondary-300 dark:border-dark-border text-sm font-medium rounded-md text-secondary-700 dark:text-dark-text bg-white dark:bg-gray-700 hover:bg-secondary-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onFolderSelect(folder.id)}
                  className="flex-1 text-left flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-primary-500 dark:text-primary-400">
                    <path d="M19.5 21a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9Z" />
                    <path d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0-1.036.84-1.875 1.875-1.875h.75A3.75 3.75 0 0 1 22.5 22.5v-8.25a3.75 3.75 0 0 0-3.75-3.75h-5.25a.75.75 0 0 1-.75-.75V4.5a3 3 0 0 0-3-3h-9a3 3 0 0 0-3 3v4.875Z" />
                  </svg>
                  <span className="font-medium text-secondary-900 dark:text-dark-text">{folder.title}</span>
                  <span className="ml-2 text-xs text-secondary-500 dark:text-dark-muted">({folder.module_count} modules)</span>
                </button>

                {hasEditPermission && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => startEditingFolder(folder)}
                      className="p-1 text-secondary-500 hover:text-secondary-700 dark:text-dark-muted dark:hover:text-dark-text"
                      aria-label="Edit folder"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      aria-label="Delete folder"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {hasEditPermission && (
        <div className="p-4 border-t border-secondary-200 dark:border-dark-border">
          {isAddingFolder ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newFolderTitle}
                onChange={(e) => setNewFolderTitle(e.target.value)}
                className="flex-1 px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                placeholder="New folder title"
                autoFocus
              />
              <button
                onClick={handleAddFolder}
                disabled={!newFolderTitle.trim()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingFolder(false);
                  setNewFolderTitle('');
                }}
                className="inline-flex items-center px-3 py-2 border border-secondary-300 dark:border-dark-border text-sm font-medium rounded-md text-secondary-700 dark:text-dark-text bg-white dark:bg-gray-700 hover:bg-secondary-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingFolder(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Add Folder
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FolderManager;
