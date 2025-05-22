import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import ImagePasteHandler from '../common/ImagePasteHandler';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../../context/AuthContext';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Class {
  id: string;
  title: string;
}

interface Folder {
  id: string;
  title: string;
  class_id: string;
}

interface ModuleFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface ModuleFormProps {
  isEditing?: boolean;
}

const ModuleForm = ({ isEditing = false }: ModuleFormProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [orderIndex, setOrderIndex] = useState(0);
  const [classes, setClasses] = useState<Class[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<ModuleFile[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get class ID and folder ID from query params if creating a new module
  useEffect(() => {
    if (!isEditing) {
      const params = new URLSearchParams(location.search);
      const classIdParam = params.get('classId');
      const folderIdParam = params.get('folderId');

      if (classIdParam) {
        setClassId(classIdParam);
      }

      if (folderIdParam) {
        setFolderId(folderIdParam);
      }
    }
  }, [location.search, isEditing]);

  // Fetch available classes for dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await axios.get(`${API_URL}/classes`);
        setClasses(response.data);
        setInitialLoading(false);
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError('Failed to load classes');
        setInitialLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // Fetch folders when class is selected
  useEffect(() => {
    if (classId) {
      const fetchFolders = async () => {
        try {
          const response = await axios.get(`${API_URL}/folders/class/${classId}`);
          setFolders(response.data);
        } catch (err) {
          console.error('Error fetching folders:', err);
          // Don't set error here to avoid disrupting the form
        }
      };

      fetchFolders();
    } else {
      setFolders([]);
    }
  }, [classId]);

  // If editing, fetch the module data
  useEffect(() => {
    if (isEditing && id) {
      const fetchModule = async () => {
        try {
          setInitialLoading(true);
          const response = await axios.get(`${API_URL}/modules/${id}`);
          const moduleData = response.data;

          setTitle(moduleData.title);
          setContent(moduleData.content);
          setClassId(moduleData.class_id);
          setFolderId(moduleData.folder_id);
          setOrderIndex(moduleData.order_index || 0);

          if (moduleData.files) {
            setFiles(moduleData.files);
          }

          setInitialLoading(false);
        } catch (err) {
          console.error('Error fetching module:', err);
          setError('Failed to load module data');
          setInitialLoading(false);
        }
      };

      fetchModule();
    }
  }, [isEditing, id]);

  // Maximum number of files allowed per module
  const MAX_FILES = 5;

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const totalFiles = files.length + newFiles.length + filesArray.length;

      if (totalFiles > MAX_FILES) {
        setError(`Cannot add more files. Maximum ${MAX_FILES} files allowed per module.`);
        return;
      }

      setNewFiles([...newFiles, ...filesArray]);
      setError(null);
    }
  };

  // Handle file removal
  const handleRemoveNewFile = (index: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  // Handle existing file removal
  const handleRemoveExistingFile = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to remove this file?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/modules/files/${fileId}`);
      setFiles(files.filter(file => file.id !== fileId));
    } catch (err) {
      console.error('Error removing file:', err);
      setError('Failed to remove file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    if (!classId) {
      setError('Class is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create FormData to handle file uploads
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('class_id', classId.toString());

      if (folderId) {
        formData.append('folder_id', folderId.toString());
      }

      formData.append('order_index', orderIndex.toString());

      // Add files to FormData
      newFiles.forEach(file => {
        formData.append('files', file);
      });

      if (isEditing && id) {
        // Update existing module
        await axios.put(`${API_URL}/modules/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        navigate(`/modules/${id}`);
      } else {
        // Create new module
        const response = await axios.post(`${API_URL}/modules`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        navigate(`/modules/${response.data.id}`);
      }
    } catch (err: any) {
      console.error('Error saving module:', err);
      setError(err.response?.data?.message || 'Failed to save module');
      setLoading(false);
    }
  };

  // Only aslab users can create/edit modules
  if (user?.role !== 'aslab') {
    navigate('/unauthorized');
    return null;
  }

  if (initialLoading) {
    return (
      <div className="container-custom py-8">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-dark-text mb-6">
          {isEditing ? 'Edit Module' : 'Create New Module'}
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-6 mb-6">
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                Module Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                placeholder="Enter module title"
                required
              />
            </div>

            {!isEditing && (
              <div className="mb-4">
                <label htmlFor="class" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                  Class *
                </label>
                <select
                  id="class"
                  value={classId || ''}
                  onChange={(e) => setClassId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="folder" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                Folder
              </label>
              <select
                id="folder"
                value={folderId || ''}
                  onChange={(e) => setFolderId(e.target.value || null)}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
              >
                <option value="">No folder (root level)</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-secondary-500 dark:text-dark-muted">
                Optional. Organize this module in a folder.
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="order" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                Order Index
              </label>
              <input
                type="number"
                id="order"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
              />
              <p className="mt-1 text-sm text-secondary-500 dark:text-dark-muted">
                Optional. Controls the display order of modules (lower numbers appear first).
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow mb-6">
            <div className="border-b border-secondary-200 dark:border-dark-border">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`py-3 px-4 border-b-2 font-medium text-sm ${
                    !previewMode
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-dark-muted dark:hover:text-dark-text dark:hover:border-dark-border'
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`py-3 px-4 border-b-2 font-medium text-sm ${
                    previewMode
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-dark-muted dark:hover:text-dark-text dark:hover:border-dark-border'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            <div className="p-4">
              {!previewMode ? (
                <div className="mb-4">
                  <ImagePasteHandler
                    onUploadStart={() => {
                      // Insert placeholder at cursor position
                      const textarea = document.getElementById('content') as HTMLTextAreaElement;
                      const uploadingText = '![Uploading image...]()'
                      
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newContent = content.substring(0, start) + uploadingText + content.substring(end);
                        setContent(newContent);
                        
                        // Store cursor position for later
                        textarea.dataset.uploadStart = start.toString();
                      } else {
                        setContent(content + '\n' + uploadingText);
                      }
                    }}
                    onImageUpload={(imageUrl) => {
                      // Replace placeholder with actual image markdown
                      const textarea = document.getElementById('content') as HTMLTextAreaElement;
                      const uploadingText = '![Uploading image...]()'
                      const imageMarkdown = `![image](${imageUrl})`;
                      
                      if (textarea) {
                        const uploadStart = parseInt(textarea.dataset.uploadStart || '0');
                        const currentContent = content;
                        const placeholderIndex = currentContent
                          .indexOf(uploadingText, uploadStart > 0 ? uploadStart - uploadingText.length : 0);
                        
                        if (placeholderIndex !== -1) {
                          const newContent = currentContent.substring(0, placeholderIndex) + 
                            imageMarkdown + 
                            currentContent.substring(placeholderIndex + uploadingText.length);
                          setContent(newContent);
                          
                          // Reset cursor position after content update
                          setTimeout(() => {
                            textarea.focus();
                            const newCursorPos = placeholderIndex + imageMarkdown.length;
                            textarea.setSelectionRange(newCursorPos, newCursorPos);
                          }, 0);
                        } else {
                          // Fallback: append at the end if placeholder not found
                          setContent(content + '\n' + imageMarkdown);
                        }
                      } else {
                        setContent(content + '\n' + imageMarkdown);
                      }
                    }}
                  >
                    <label htmlFor="content" className="sr-only">
                      Content
                    </label>
                    <textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={20}
                      className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text font-mono"
                      placeholder="Enter module content in Markdown format. LaTeX is supported using $...$ for inline math and $$...$$ for block math. You can paste images directly into the editor."
                      required
                    />
                  </ImagePasteHandler>
                </div>
              ) : (
                <div className="prose dark:prose-invert prose-primary max-w-none min-h-[300px] p-4 border border-secondary-200 dark:border-dark-border rounded-md text-secondary-700 dark:text-dark-text break-words">
                  {content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 break-words overflow-wrap-anywhere"
                          />
                        ),
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-secondary-500 dark:text-dark-muted italic">
                      Preview will appear here. Start typing in the edit tab.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow mb-6">
            <div className="p-4 border-b border-secondary-200 dark:border-dark-border">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-dark-text">Attachments</h3>
                  <p className="mt-1 text-sm text-secondary-500 dark:text-dark-muted">
                    Add files that students can download.
                  </p>
                </div>
                <div className="text-sm text-secondary-600 dark:text-dark-muted">
                  <span className={files.length + newFiles.length >= MAX_FILES ? "text-red-500 dark:text-red-400 font-medium" : ""}>
                    {files.length + newFiles.length} / {MAX_FILES} files
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4">
              {/* Existing Files */}
              {files.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">Current Files</h4>
                  <ul className="divide-y divide-secondary-200 dark:divide-dark-border">
                    {files.map((file) => (
                      <li key={file.id} className="py-3 flex justify-between items-center">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-secondary-500 dark:text-dark-muted">
                            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" clipRule="evenodd" />
                            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                          </svg>
                          <div>
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              {file.file_name}
                            </a>
                            <p className="text-xs text-secondary-500 dark:text-dark-muted">
                              {(file.file_size / 1024).toFixed(2)} KB • {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingFile(file.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          aria-label="Remove file"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* New Files */}
              {newFiles.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">New Files to Upload</h4>
                  <ul className="divide-y divide-secondary-200 dark:divide-dark-border">
                    {newFiles.map((file, index) => (
                      <li key={index} className="py-3 flex justify-between items-center">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-secondary-500 dark:text-dark-muted">
                            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" clipRule="evenodd" />
                            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-secondary-900 dark:text-dark-text">{file.name}</p>
                            <p className="text-xs text-secondary-500 dark:text-dark-muted">
                              {(file.size / 1024).toFixed(2)} KB • {file.type || 'Unknown type'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewFile(index)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          aria-label="Remove file"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* File Upload Input */}
              <div className="mt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-dark-text">
                    Add Files
                  </label>
                  {files.length + newFiles.length >= MAX_FILES && (
                    <span className="text-xs text-red-500 dark:text-red-400">
                      Maximum file limit reached
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file-upload"
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-secondary-300 dark:border-dark-border border-dashed rounded-lg ${
                      files.length + newFiles.length >= MAX_FILES
                        ? 'bg-secondary-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
                        : 'bg-secondary-50 dark:bg-gray-700 hover:bg-secondary-100 dark:hover:bg-gray-600 cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-3 text-secondary-400 dark:text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      <p className="mb-2 text-sm text-secondary-500 dark:text-dark-muted">
                        {files.length + newFiles.length >= MAX_FILES
                          ? <span>Maximum file limit reached</span>
                          : <span><span className="font-semibold">Click to upload</span> or drag and drop</span>
                        }
                      </p>
                      <p className="text-xs text-secondary-500 dark:text-dark-muted">
                        PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, RAR, etc.
                      </p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={files.length + newFiles.length >= MAX_FILES}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(isEditing && id ? `/modules/${id}` : `/classes/${classId}`)}
              className="px-4 py-2 border border-secondary-300 dark:border-dark-border text-secondary-700 dark:text-dark-text rounded-md hover:bg-secondary-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Module' : 'Create Module'
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-secondary-900 dark:text-dark-text mb-4">Markdown and LaTeX Help</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-md font-medium text-secondary-800 dark:text-dark-text mb-2">Markdown Syntax</h3>
              <ul className="text-sm text-secondary-700 dark:text-dark-muted space-y-1">
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded"># Heading 1</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">## Heading 2</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">Paste images directly into editor</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">**bold text**</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">*italic text*</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">[link text](url)</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">![alt text](image-url)</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">- list item</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">1. numbered item</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">`inline code`</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">```code block```</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">| Header | Header |</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">| ------ | ------ |</code></li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">| Cell   | Cell   |</code></li>
              </ul>
            </div>
            <div>
              <h3 className="text-md font-medium text-secondary-800 dark:text-dark-text mb-2">LaTeX Syntax</h3>
              <ul className="text-sm text-secondary-700 dark:text-dark-muted space-y-1">
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">$x^2 + y^2 = z^2$</code> (inline math)</li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">$$E = mc^2$$</code> (block math)</li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">${'$\\frac{a}{b}$'}</code> (fractions)</li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">${'$\\sqrt{x}$'}</code> (square root)</li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">${'$\\sum_{i=1}^{n}$'}</code> (summation)</li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">${'$\\int_{a}^{b}$'}</code> (integral)</li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">${'$\\alpha, \\beta, \\gamma$'}</code> (Greek letters)</li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">${'$\\mathbf{A}$'}</code> (bold)</li>
                <li><code className="bg-secondary-100 dark:bg-gray-700 px-1 rounded">${'$\\begin{matrix}a & b \\\\ c & d\\end{matrix}$'}</code> (matrix)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleForm;
