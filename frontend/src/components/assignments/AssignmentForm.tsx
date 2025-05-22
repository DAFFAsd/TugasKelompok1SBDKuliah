import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

interface Class {
  id: string;
  title: string;
}

// This interface is used in the component
interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  class_id: string;
}

interface AssignmentFormProps {
  isEditing?: boolean;
}

const AssignmentForm = ({ isEditing = false }: AssignmentFormProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const classIdFromQuery = queryParams.get('classId');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [classId, setClassId] = useState<string | null>(classIdFromQuery || null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch classes for dropdown
        const classesResponse = await axios.get(`${API_URL}/classes`);
        setClasses(classesResponse.data);

        // If editing, fetch assignment details
        if (isEditing && id) {
          const assignmentResponse = await axios.get(`${API_URL}/assignments/${id}`);
          const assignment = assignmentResponse.data;

          setTitle(assignment.title);
          setDescription(assignment.description);

          // Format deadline for datetime-local input
          const deadlineDate = new Date(assignment.deadline);
          const formattedDeadline = deadlineDate.toISOString().slice(0, 16);
          setDeadline(formattedDeadline);

          setClassId(assignment.class_id);

          // Find the selected class
          const selectedClass = classesResponse.data.find((c: Class) => c.id === assignment.class_id);
          setSelectedClass(selectedClass || null);
        } else if (classIdFromQuery) {
          // If creating from a class page, find the selected class
          const selectedClass = classesResponse.data.find((c: Class) => c.id === classIdFromQuery);
          setSelectedClass(selectedClass || null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditing, classIdFromQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please provide a title');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    if (!deadline) {
      setError('Please provide a deadline');
      return;
    }

    if (!classId) {
      setError('Please select a class');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const assignmentData = {
        title,
        description,
        deadline: new Date(deadline).toISOString(),
        class_id: classId
      };

      if (isEditing && id) {
        await axios.put(`${API_URL}/assignments/${id}`, assignmentData);
        navigate(`/assignments/${id}`);
      } else {
        const response = await axios.post(`${API_URL}/assignments`, assignmentData);
        navigate(`/assignments/${response.data.id}`);
      }
    } catch (err: any) {
      console.error('Error saving assignment:', err);
      setError(err.response?.data?.message || 'Failed to save assignment');
      setSubmitting(false);
    }
  };

  // Only aslab users can create/edit assignments
  if (user?.role !== 'aslab') {
    navigate('/unauthorized');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-dark-text mb-6">
          {isEditing ? 'Edit Assignment' : 'Create Assignment'}
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
          <div className="p-6">
            {/* Class Selection */}
            <div className="mb-6">
              <label htmlFor="class" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">
                Class
              </label>
              {selectedClass ? (
                <div className="flex justify-between items-center">
                  <div className="text-secondary-900 dark:text-dark-text font-medium">
                    {selectedClass.title}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClass(null);
                      setClassId(null);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <select
                  id="class"
                  value={classId || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setClassId(selectedId);
                    const selected = classes.find(c => c.id === selectedId);
                    setSelectedClass(selected || null);
                  }}
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
              )}
            </div>

            {/* Title */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                placeholder="Assignment title"
                required
              />
            </div>

            {/* Deadline */}
            <div className="mb-6">
              <label htmlFor="deadline" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">
                Deadline
              </label>
              <input
                type="datetime-local"
                id="deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="description" className="block text-sm font-medium text-secondary-700 dark:text-dark-text">
                  Description
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(false)}
                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                      !previewMode
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'bg-secondary-100 text-secondary-700 dark:bg-gray-700 dark:text-dark-muted'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                      previewMode
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'bg-secondary-100 text-secondary-700 dark:bg-gray-700 dark:text-dark-muted'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {!previewMode ? (
                <ImagePasteHandler
                  onUploadStart={() => {
                    // Insert placeholder at cursor position
                    const textarea = document.getElementById('description') as HTMLTextAreaElement;
                    const uploadingText = '![Uploading image...]()'

                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const newContent = description.substring(0, start) + uploadingText + description.substring(end);
                      setDescription(newContent);

                      // Store cursor position for later
                      textarea.dataset.uploadStart = start.toString();
                    } else {
                      setDescription(description + '\n' + uploadingText);
                    }
                  }}
                  onImageUpload={(imageUrl) => {
                    // Replace placeholder with actual image markdown
                    const textarea = document.getElementById('description') as HTMLTextAreaElement;
                    const uploadingText = '![Uploading image...]()'
                    const imageMarkdown = `![image](${imageUrl})`;

                    if (textarea) {
                      const uploadStart = parseInt(textarea.dataset.uploadStart || '0');
                      const currentContent = description;
                      const placeholderIndex = currentContent
                        .indexOf(uploadingText, uploadStart > 0 ? uploadStart - uploadingText.length : 0);

                      if (placeholderIndex !== -1) {
                        const newContent = currentContent.substring(0, placeholderIndex) +
                          imageMarkdown +
                          currentContent.substring(placeholderIndex + uploadingText.length);
                        setDescription(newContent);

                        // Reset cursor position after content update
                        setTimeout(() => {
                          textarea.focus();
                          const newCursorPos = placeholderIndex + imageMarkdown.length;
                          textarea.setSelectionRange(newCursorPos, newCursorPos);
                        }, 0);
                      } else {
                        // Fallback: append at the end if placeholder not found
                        setDescription(description + '\n' + imageMarkdown);
                      }
                    } else {
                      setDescription(description + '\n' + imageMarkdown);
                    }
                  }}
                >
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                    placeholder="Enter assignment description. You can use Markdown formatting. You can paste images directly into the editor."
                    required
                  />
                </ImagePasteHandler>
              ) : (
                <div className="prose dark:prose-invert prose-primary max-w-none min-h-[200px] p-4 border border-secondary-200 dark:border-dark-border rounded-md text-secondary-700 dark:text-dark-text break-words">
                  {description ? (
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
                      {description}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-secondary-500 dark:text-dark-muted italic">
                      Preview will appear here. Start typing in the edit tab.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-secondary-300 dark:border-dark-border text-secondary-700 dark:text-dark-text rounded-md hover:bg-secondary-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  isEditing ? 'Update Assignment' : 'Create Assignment'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentForm;
