import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import ImagePasteHandler from '../common/ImagePasteHandler';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface NewsFormProps {
  isEditing?: boolean;
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

const NewsForm = ({ isEditing = false }: NewsFormProps) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  // UI state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [previewTab, setPreviewTab] = useState<'write' | 'preview'>('write');

  // Linked entity options
  const [linkedType, setLinkedType] = useState<'class' | 'module' | 'assignment' | ''>('');
  const [linkedId, setLinkedId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  // Data for hierarchical dropdowns
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [moduleFolders, setModuleFolders] = useState<ModuleFolderOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    // Check if there are any pre-filled linked entities from URL params
    const prefilledType = searchParams.get('type');
    const prefilledId = searchParams.get('id');

    if (prefilledType && prefilledId && ['class', 'module', 'assignment'].includes(prefilledType)) {
      setLinkedType(prefilledType as 'class' | 'module' | 'assignment');
      setLinkedId(prefilledId);

      // If prefilled with module or assignment, we'll need to load the class info later
      if (prefilledType === 'module' || prefilledType === 'assignment') {
        fetchEntityDetails(prefilledType, prefilledId);
      }
    }

    // If editing, fetch the news data
    if (isEditing && id) {
      fetchNewsData();
    }

    // Load initial classes data
    fetchClasses();
  }, [isEditing, id, searchParams]);

  // Fetch entity details to set up dropdowns when prefilled or editing
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
      } else if (entityType === 'assignment') {
        response = await axios.get(`${API_URL}/assignments/${entityId}`);
        const assignmentData = response.data;
        setSelectedClassId(assignmentData.class_id.toString());
        console.log(`Fetched assignment details: class_id=${assignmentData.class_id}`);
      }
    } catch (err) {
      console.error(`Error fetching ${entityType} details:`, err);
    }
  };

  // Fetch news data when editing
  const fetchNewsData = async () => {
    try {
      setInitialLoading(true);
      const response = await axios.get(`${API_URL}/news/${id}`);
      const newsData = response.data;
      console.log("Fetched news data:", newsData);

      setTitle(newsData.title);
      setContent(newsData.content);

      if (newsData.image_url) {
        setCurrentImageUrl(newsData.image_url);
        setImagePreview(newsData.image_url);
      }

      // Set linked entity if it exists
      if (newsData.linked_type) {
        console.log(`News is linked to ${newsData.linked_type} with ID ${newsData.linked_id}`);
        setLinkedType(newsData.linked_type);
        setLinkedId(newsData.linked_id.toString());

        // If linked to module or assignment, fetch details for hierarchy
        if (newsData.linked_type === 'module' || newsData.linked_type === 'assignment') {
          await fetchEntityDetails(newsData.linked_type, newsData.linked_id.toString());
        } else if (newsData.linked_type === 'class') {
          setSelectedClassId(newsData.linked_id.toString());
        }
      }

      setInitialLoading(false);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to load announcement data');
      setInitialLoading(false);
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

      // Find modules without folders
      const modulesWithoutFolder = modulesData.filter((m: ModuleOption) => !m.folder_id);

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

  // Reset selection when type changes
  useEffect(() => {
    setLinkedId('');
    setSelectedClassId('');
    setSelectedFolderId('');
  }, [linkedType]);

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

  // Handle image selection
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

  // Handle image removal
  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

    try {
      setLoading(true);
      setError(null);

      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      if (image) formData.append('image', image);

      // Add entity linking information if provided
      if (linkedType && linkedId) {
        formData.append('linkedType', linkedType);
        formData.append('linkedId', linkedId);
        console.log(`Linking announcement to ${linkedType} with ID ${linkedId}`);
      }

      if (isEditing && id) {
        // Update existing news
        const response = await axios.put(`${API_URL}/news/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        console.log("Updated news response:", response.data);
        navigate(`/news/${id}`);
      } else {
        // Create new news
        const response = await axios.post(`${API_URL}/news`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        console.log("Created news response:", response.data);
        navigate(`/news/${response.data.id}`);
      }
    } catch (err: any) {
      console.error('Error saving news:', err);
      setError(err.response?.data?.message || 'Failed to save announcement');
      setLoading(false);
    }
  };

  // Only aslab users can create/edit news
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
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading announcement data...</p>
        </div>
      </div>
    );
  }

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

        <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <span className="font-semibold block mb-1">Why link an announcement?</span>
            Linking this announcement to a {linkedType} will:
          </div>
          <ul className="list-disc list-inside ml-1 mt-1 text-xs text-blue-700 dark:text-blue-300">
            <li>Add a direct navigation button to the {linkedType}</li>
            <li>Show this announcement on the {linkedType}'s page</li>
            <li>Help users find related content more easily</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="container-custom py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-dark-text mb-4">
          {isEditing ? 'Edit Announcement' : 'Post New Announcement'}
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-5">
          <div className="mb-3">
            <label htmlFor="title" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
              placeholder="Enter announcement title"
              maxLength={100} // Match database VARCHAR(100) constraint
              required
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="content" className="block text-sm font-medium text-secondary-700 dark:text-dark-text">
                Content *
              </label>
              <div className="flex rounded-md overflow-hidden border border-secondary-300 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setPreviewTab('write')}
                  className={`px-3 py-1 text-xs font-medium ${
                    previewTab === 'write'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-secondary-700 dark:text-dark-text'
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('preview')}
                  className={`px-3 py-1 text-xs font-medium ${
                    previewTab === 'preview'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-secondary-700 dark:text-dark-text'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {previewTab === 'write' ? (
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
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text markdown-editor-container"
                  placeholder="Write your announcement content using Markdown. You can paste images directly into the editor."
                  maxLength={2000} // Set a reasonable limit for TEXT field
                  required
                />
              </ImagePasteHandler>
            ) : (
              <div className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm bg-secondary-50 dark:bg-gray-800 h-48 overflow-y-auto">
                <div className="prose dark:prose-invert prose-primary max-w-none text-secondary-700 dark:text-dark-text break-words">
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
                    {content || 'Preview will appear here...'}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-secondary-500 dark:text-dark-muted">
              Brief announcements work best. Supports basic Markdown formatting.
            </p>
          </div>

          {/* Linked Entity Selection */}
          <div className="mb-4 border-t border-secondary-200 dark:border-gray-600 pt-4 mt-4">
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

            {renderEntitySelection()}

            <p className="mt-1 text-xs text-secondary-500 dark:text-dark-muted">
              Link this announcement to a specific class, module, or assignment
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
              Image (Optional)
            </label>

            {imagePreview ? (
              <div className="mb-3">
                <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2">
                  <img
                    src={imagePreview}
                    alt="News preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 focus:outline-none"
                    aria-label="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-secondary-300 dark:border-dark-border border-dashed rounded-lg cursor-pointer bg-secondary-50 dark:bg-gray-700 hover:bg-secondary-100 dark:hover:bg-gray-600"
                >
                  <div className="flex flex-col items-center justify-center py-2">
                    <svg className="w-8 h-8 mb-1 text-secondary-400 dark:text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p className="text-xs text-secondary-500 dark:text-dark-muted">
                      <span className="font-semibold">Upload image</span> (optional)
                    </p>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                  />
                </label>
              </div>
            )}
            <p className="mt-1 text-xs text-secondary-500 dark:text-dark-muted">
              Image URL is stored as VARCHAR(255) - recommended max size 5MB
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(isEditing && id ? `/news/${id}` : '/news')}
              className="px-3 py-2 border border-secondary-300 dark:border-dark-border text-secondary-700 dark:text-dark-text rounded-md hover:bg-secondary-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditing ? 'Updating...' : 'Posting...'}
                </>
              ) : (
                isEditing ? 'Update Announcement' : 'Post Announcement'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewsForm;
