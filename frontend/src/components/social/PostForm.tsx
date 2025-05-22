import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ImagePasteHandler from '../common/ImagePasteHandler';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface PostFormProps {
  onPostCreated: () => void;
  initialContent?: string;
  initialImageUrl?: string | null;
  initialEntityType?: string;
  initialEntityId?: string;
  isEditing?: boolean;
  postId?: number;
}

interface ClassOption {
  id: number;
  title: string;
}

interface ModuleFolderOption {
  id: number;
  title: string;
  class_id: number;
  modules: ModuleOption[];
}

interface ModuleOption {
  id: number;
  title: string;
  folder_id: number | null;
  class_id: number;
}

interface AssignmentOption {
  id: number;
  title: string;
  class_id: number;
}

const PostForm = ({
  onPostCreated,
  initialContent = '',
  initialImageUrl = null,
  initialEntityType = '',
  initialEntityId = '',
  isEditing = false,
  postId
}: PostFormProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Linked entity options
  const [linkedType, setLinkedType] = useState<'class' | 'module' | 'assignment' | ''>(
    initialEntityType as 'class' | 'module' | 'assignment' | ''
  );
  const [linkedId, setLinkedId] = useState<string>(initialEntityId);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  // Data for hierarchical dropdowns
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [moduleFolders, setModuleFolders] = useState<ModuleFolderOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showEntityOptions, setShowEntityOptions] = useState(false);

  useEffect(() => {
    if (initialContent || initialEntityType) {
      setIsExpanded(true);
    }
  }, [initialContent, initialEntityType]);

  // Fetch classes for the main dropdown when showing entity options
  useEffect(() => {
    if (showEntityOptions) {
      fetchClasses();

      // If we're editing and have linked entities, fetch the relevant data
      if (isEditing && linkedType && linkedId) {
        if (linkedType === 'module' || linkedType === 'assignment') {
          fetchEntityDetails(linkedType, linkedId);
        } else if (linkedType === 'class') {
          setSelectedClassId(linkedId);
        }
      }
    }
  }, [showEntityOptions, isEditing, linkedType, linkedId]);

  // Reset selection when type changes
  useEffect(() => {
    setLinkedId('');
    setSelectedClassId('');
    setSelectedFolderId('');
  }, [linkedType]);

  // Fetch entity details to set up dropdowns when editing
  const fetchEntityDetails = async (entityType: string, entityId: string) => {
    try {
      let response;
      if (entityType === 'module') {
        response = await axios.get(`${API_URL}/modules/${entityId}`);
        const moduleData = response.data;
        setSelectedClassId(moduleData.class_id.toString());
        if (moduleData.folder_id) {
          setSelectedFolderId(moduleData.folder_id.toString());
        }
        console.log(`Fetched module details: class_id=${moduleData.class_id}, folder_id=${moduleData.folder_id}`);

        // Now fetch folders and modules for this class
        if (moduleData.class_id) {
          fetchModuleFoldersForClass(moduleData.class_id.toString());
        }
      } else if (entityType === 'assignment') {
        response = await axios.get(`${API_URL}/assignments/${entityId}`);
        const assignmentData = response.data;
        setSelectedClassId(assignmentData.class_id.toString());
        console.log(`Fetched assignment details: class_id=${assignmentData.class_id}`);

        // Now fetch assignments for this class
        if (assignmentData.class_id) {
          fetchModuleFoldersForClass(assignmentData.class_id.toString());
        }
      }
    } catch (err) {
      console.error(`Error fetching ${entityType} details:`, err);
    }
  };

  // Fetch classes for the main dropdown
  const fetchClasses = async () => {
    setLoadingOptions(true);
    try {
      const response = await axios.get(`${API_URL}/classes`);
      setClasses(response.data.map((c: any) => ({
        id: c.id,
        title: c.title
      })));
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoadingOptions(false);
    }
  };

  // Fetch module folders for a specific class
  const fetchModuleFoldersForClass = async (classId: string) => {
    if (!classId) return;

    setLoadingOptions(true);
    try {
      // Fetch folders for the selected class
      const foldersResponse = await axios.get(`${API_URL}/folders/class/${classId}`);
      const folders = foldersResponse.data.map((f: any) => ({
        id: f.id,
        title: f.title,
        class_id: f.class_id,
        modules: [] // Will be populated later
      }));

      // Fetch modules for the selected class
      const modulesResponse = await axios.get(`${API_URL}/modules/class/${classId}`);
      const modulesData = modulesResponse.data.map((m: any) => ({
        id: m.id,
        title: m.title,
        folder_id: m.folder_id,
        class_id: m.class_id
      }));

      // Group modules by folder
      const modulesByFolder = modulesData.reduce((acc: any, module: ModuleOption) => {
        if (module.folder_id) {
          if (!acc[module.folder_id]) acc[module.folder_id] = [];
          acc[module.folder_id].push(module);
        }
        return acc;
      }, {});

      // Add modules to their respective folders
      const foldersWithModules = folders.map((folder: ModuleFolderOption) => {
        return {
          ...folder,
          modules: modulesByFolder[folder.id] || []
        };
      });

      setModuleFolders(foldersWithModules);
      setModules(modulesData);

      // Fetch assignments for the selected class
      const assignmentsResponse = await axios.get(`${API_URL}/assignments/class/${classId}`);
      setAssignments(assignmentsResponse.data.map((a: any) => ({
        id: a.id,
        title: a.title,
        class_id: a.class_id
      })));
    } catch (err) {
      console.error('Error fetching content for class:', err);
      setError('Failed to load class content');
    } finally {
      setLoadingOptions(false);
    }
  };

  // Handle class selection
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClassId = e.target.value;
    console.log(`Selected class ID: ${newClassId}`);
    setSelectedClassId(newClassId);
    setSelectedFolderId('');

    if (linkedType === 'class') {
      setLinkedId(newClassId);
      console.log(`Setting linkedId to ${newClassId} for class`);
    } else {
      setLinkedId(''); // Reset linked ID when changing class for module/assignment
    }

    if (newClassId) {
      fetchModuleFoldersForClass(newClassId);
    }
  };

  // Handle linked entity type change
  const handleLinkedTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'class' | 'module' | 'assignment' | '';
    setLinkedType(newType);
  };

  // Handle module selection through hierarchy
  const handleModuleSelection = (moduleId: string) => {
    console.log(`Selected module ID: ${moduleId}`);
    setLinkedId(moduleId);
  };

  // Handle assignment selection
  const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const assignmentId = e.target.value;
    console.log(`Selected assignment ID: ${assignmentId}`);
    setLinkedId(assignmentId);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setImage(file);

      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Please enter some content for your post');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create FormData object to handle file upload
      const formData = new FormData();
      formData.append('content', content);
      if (image) {
        formData.append('image', image);
      }

      // Add entity linking information if provided
      if (linkedType && linkedId) {
        formData.append('entityType', linkedType);
        formData.append('entityId', linkedId);
      }

      // Send the request to the server
      if (isEditing && postId) {
        // Update existing post
        await axios.put(`${API_URL}/social/posts/${postId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Create new post
        await axios.post(`${API_URL}/social/posts`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      // Reset form
      setContent('');
      setImage(null);
      setImagePreview(null);
      setLinkedType('');
      setLinkedId('');
      setSelectedClassId('');
      setSelectedFolderId('');
      setIsExpanded(false);
      setShowEntityOptions(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent component
      onPostCreated();
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  // Render the hierarchical entity selection based on linked type
  const renderEntitySelection = () => {
    if (!linkedType) return null;

    return (
      <div className="mt-3 space-y-3">
        {/* Class selection - always shown for all entity types */}
        <div>
          <label htmlFor="class-select" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
            {linkedType === 'class' ? 'Select Class' : 'Select Parent Class'}
          </label>
          <select
            id="class-select"
            value={selectedClassId}
            onChange={handleClassChange}
            className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
          >
            <option value="">Select a class</option>
            {classes.map(option => (
              <option key={option.id} value={option.id}>{option.title}</option>
            ))}
          </select>
        </div>

        {/* Module selection - show when linkedType is 'module' */}
        {linkedType === 'module' && selectedClassId && (
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
              Select Module
            </label>

            {loadingOptions ? (
              <div className="p-3 text-center text-secondary-500 dark:text-dark-muted border border-secondary-300 dark:border-dark-border rounded-md">
                Loading modules...
              </div>
            ) : modules.length === 0 ? (
              <div className="p-3 text-center text-secondary-500 dark:text-dark-muted border border-secondary-300 dark:border-dark-border rounded-md">
                No modules found for this class
              </div>
            ) : (
              <div className="border border-secondary-300 dark:border-dark-border rounded-md divide-y divide-secondary-300 dark:divide-dark-border">
                {/* Modules with folders */}
                {moduleFolders.map(folder => (
                  <div key={folder.id} className="p-2">
                    <div className="font-medium text-secondary-700 dark:text-dark-text pb-1">📁 {folder.title}</div>
                    <div className="pl-4 space-y-1">
                      {folder.modules.map(module => (
                        <div key={module.id} className="flex items-center">
                          <input
                            type="radio"
                            id={`module-${module.id}`}
                            name="module"
                            value={module.id}
                            checked={linkedId === module.id.toString()}
                            onChange={() => handleModuleSelection(module.id.toString())}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 dark:bg-gray-700 dark:border-dark-border"
                          />
                          <label
                            htmlFor={`module-${module.id}`}
                            className="ml-2 text-sm text-secondary-700 dark:text-dark-text cursor-pointer"
                          >
                            {module.title}
                          </label>
                        </div>
                      ))}
                      {folder.modules.length === 0 && (
                        <div className="text-xs italic text-secondary-500 dark:text-dark-muted pl-2">No modules in this folder</div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Modules without folders */}
                {modules.filter(m => !m.folder_id).length > 0 && (
                  <div className="p-2">
                    <div className="font-medium text-secondary-700 dark:text-dark-text pb-1">Other Modules</div>
                    <div className="pl-4 space-y-1">
                      {modules.filter(m => !m.folder_id).map(module => (
                        <div key={module.id} className="flex items-center">
                          <input
                            type="radio"
                            id={`module-${module.id}`}
                            name="module"
                            value={module.id}
                            checked={linkedId === module.id.toString()}
                            onChange={() => handleModuleSelection(module.id.toString())}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 dark:bg-gray-700 dark:border-dark-border"
                          />
                          <label
                            htmlFor={`module-${module.id}`}
                            className="ml-2 text-sm text-secondary-700 dark:text-dark-text cursor-pointer"
                          >
                            {module.title}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Assignment selection - show when linkedType is 'assignment' */}
        {linkedType === 'assignment' && selectedClassId && (
          <div>
            <label htmlFor="assignment-select" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
              Select Assignment
            </label>
            {loadingOptions ? (
              <div className="p-3 text-center text-secondary-500 dark:text-dark-muted border border-secondary-300 dark:border-dark-border rounded-md">
                Loading assignments...
              </div>
            ) : (
              <select
                id="assignment-select"
                value={linkedId}
                onChange={handleAssignmentChange}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
              >
                <option value="">Select an assignment</option>
                {assignments.map(option => (
                  <option key={option.id} value={option.id}>{option.title}</option>
                ))}
              </select>
            )}
            {assignments.length === 0 && selectedClassId && !loadingOptions && (
              <p className="mt-1 text-xs text-secondary-500 dark:text-dark-muted">
                No assignments found for this class
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-md p-4">
      {error && (
        <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-md text-sm">
          {error}
          <button
            className="float-right"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <ImagePasteHandler
            onUploadStart={() => {
              // Insert placeholder at cursor position
              const textarea = document.getElementById('post-content') as HTMLTextAreaElement;
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
              const textarea = document.getElementById('post-content') as HTMLTextAreaElement;
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
            <textarea
              id="post-content"
              placeholder={isExpanded ? "What's on your mind? (Supports Markdown). You can paste images directly here!" : "Create a post..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onClick={() => setIsExpanded(true)}
              className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
              rows={isExpanded ? 4 : 1}
            />
          </ImagePasteHandler>
          {isExpanded && (
            <div className="mt-1 text-xs text-secondary-500 dark:text-dark-muted">
              <span className="font-medium">Pro tip:</span> You can use Markdown formatting - **bold**, *italic*,
              [links](url), # headings, and more!
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            {/* Image upload and preview */}
            {imagePreview ? (
              <div className="mb-3 relative">
                <img
                  src={imagePreview}
                  alt="Upload Preview"
                  className="w-full h-auto rounded-md max-h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-black bg-opacity-70 hover:bg-opacity-80 text-white rounded-full p-1 focus:outline-none"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 mb-3 border-t border-b border-secondary-200 dark:border-dark-border">
              <div className="flex mb-2 sm:mb-0">
                {/* Image upload button */}
                <label htmlFor="image-upload" className="flex items-center mr-3 px-2 py-1 rounded-md text-secondary-700 dark:text-dark-text hover:bg-secondary-100 dark:hover:bg-gray-700 cursor-pointer">
                  <svg className="h-5 w-5 text-secondary-600 dark:text-dark-text mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Image
                  <input
                    id="image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                </label>

                {/* Entity link toggle button */}
                <button
                  type="button"
                  onClick={() => setShowEntityOptions(!showEntityOptions)}
                  className={`flex items-center px-2 py-1 rounded-md text-secondary-700 dark:text-dark-text hover:bg-secondary-100 dark:hover:bg-gray-700 ${showEntityOptions ? 'bg-secondary-100 dark:bg-gray-700' : ''}`}
                >
                  <svg className="h-5 w-5 text-secondary-600 dark:text-dark-text mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Link
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    setContent('');
                    setImage(null);
                    setImagePreview(null);
                    setShowEntityOptions(false);
                    setLinkedType('');
                    setLinkedId('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-3 py-1.5 mr-2 text-sm text-secondary-700 dark:text-dark-text hover:bg-secondary-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Posting...
                    </div>
                  ) : (
                    isEditing ? 'Update Post' : 'Post'
                  )}
                </button>
              </div>
            </div>

            {/* Entity linking section */}
            {showEntityOptions && (
              <div className="mb-3 p-3 bg-secondary-50 dark:bg-gray-700 rounded-md border border-secondary-200 dark:border-dark-border">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                    Link to Entity (Optional)
                  </label>
                  <select
                    value={linkedType}
                    onChange={handleLinkedTypeChange}
                    className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                  >
                    <option value="">Not linked to any entity</option>
                    <option value="class">Link to a Class</option>
                    <option value="module">Link to a Module</option>
                    <option value="assignment">Link to an Assignment</option>
                  </select>
                </div>

                {renderEntitySelection()}
              </div>
            )}
          </>
        )}
      </form>
    </div>
  );
};

export default PostForm;
