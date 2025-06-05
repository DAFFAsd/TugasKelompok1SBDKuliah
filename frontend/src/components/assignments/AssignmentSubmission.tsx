import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Assignment {
  id: number;
  title: string;
  description: string;
  deadline: string;
  class_id: number;
  class_title: string;
  creator_name: string;
}

interface Submission {
  id: number;
  content: string;
  file_url: string;
  submitted_at: string;
  updated_at: string;
}

const AssignmentSubmission = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Maximum number of files allowed per submission
  const MAX_FILES = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch assignment details
        const assignmentResponse = await axios.get(`${API_URL}/assignments/${id}`);
        setAssignment(assignmentResponse.data);

        // Check if deadline has passed
        const deadline = new Date(assignmentResponse.data.deadline);
        if (deadline < new Date()) {
          setError('The deadline for this assignment has passed');
          setLoading(false);
          return;
        }

        // Check if user has an existing submission
        try {
          const submissionResponse = await axios.get(`${API_URL}/assignments/${id}/my-submission`);
          const submission = submissionResponse.data;
          setExistingSubmission(submission);
          setContent(submission.content || '');

          // Parse file URLs from JSON string
          if (submission.file_url) {
            try {
              const fileUrls = JSON.parse(submission.file_url);
              setExistingFiles(Array.isArray(fileUrls) ? fileUrls : []);
            } catch (e) {
              console.error('Error parsing file URLs:', e);
              setExistingFiles([]);
            }
          }
        } catch (err: any) {
          // It's okay if there's no submission yet
          if (err.response?.status !== 404) {
            console.error('Error fetching submission:', err);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching assignment data:', err);
        setError('Failed to load assignment data');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const totalFiles = files.length + existingFiles.length + filesArray.length;

      if (totalFiles > MAX_FILES) {
        setError(`Cannot add more files. Maximum ${MAX_FILES} files allowed per submission.`);
        return;
      }

      setFiles([...files, ...filesArray]);
      setError(null);
    }
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Handle existing file removal
  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles(existingFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Please provide some content for your submission');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create FormData to handle file uploads
      const formData = new FormData();
      formData.append('content', content);

      // Add existing files that weren't removed
      formData.append('existingFiles', JSON.stringify(existingFiles));

      // Add new files
      files.forEach(file => {
        formData.append('files', file);
      });

      await axios.post(`${API_URL}/assignments/${id}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      navigate(`/assignments/${id}`);
    } catch (err: any) {
      console.error('Error submitting assignment:', err);
      setError(err.response?.data?.message || 'Failed to submit assignment');
      setSubmitting(false);
    }
  };

  // Only praktikan users can submit assignments
  if (user?.role !== 'praktikan') {
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
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (error && error === 'The deadline for this assignment has passed') {
    return (
      <div className="container-custom py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
        <Link to={`/assignments/${id}`} className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
          &larr; Back to Assignment
        </Link>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="container-custom py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">Assignment not found</span>
        </div>
        <Link to="/assignments" className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
          &larr; Back to Assignments
        </Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="mb-6">
        <Link to={`/assignments/${id}`} className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
          &larr; Back to Assignment
        </Link>
      </div>

      <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-dark-text mb-2">
            Submit: {assignment.title}
          </h1>
          <p className="text-secondary-600 dark:text-dark-muted mb-4">
            Class: {assignment.class_title} | Due: {new Date(assignment.deadline).toLocaleDateString()}
          </p>

          {error && error !== 'The deadline for this assignment has passed' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="content" className="block text-sm font-medium text-secondary-700 dark:text-dark-text">
                  Your Submission
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
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                  placeholder="Enter your submission here. You can use Markdown formatting."
                  required
                />
              ) : (
                <div className="prose dark:prose-invert prose-primary max-w-none min-h-[200px] p-4 border border-secondary-200 dark:border-dark-border rounded-md text-secondary-700 dark:text-dark-text break-words">
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

            {/* File Upload Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-secondary-700 dark:text-dark-text">
                  Attachments
                </label>
                <div className="text-sm text-secondary-600 dark:text-dark-muted">
                  <span className={files.length + existingFiles.length >= MAX_FILES ? "text-red-500 dark:text-red-400 font-medium" : ""}>
                    {files.length + existingFiles.length} / {MAX_FILES} files
                  </span>
                </div>
              </div>

              {/* Existing Files */}
              {existingFiles.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">Current Files</h4>
                  <ul className="divide-y divide-secondary-200 dark:divide-dark-border">
                    {existingFiles.map((fileUrl, index) => (
                      <li key={index} className="py-3 flex justify-between items-center">
                        <div className="flex flex-wrap items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 w-5 h-5 mr-2 text-secondary-500 dark:text-dark-muted">
                            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" clipRule="evenodd" />
                            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                          </svg>
                          <div className="flex-grow min-w-0 mr-2">
                            <a
                              href={`${API_URL}/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(`Assignment_${assignment.id}_Attachment_${index + 1}`)}`}
                              download={`Assignment_${assignment.id}_Attachment_${index + 1}`}
                              className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 break-words"
                            >
                              Attachment {index + 1}
                            </a>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingFile(index)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          aria-label="Remove file"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* New Files */}
              {files.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">New Files to Upload</h4>
                  <ul className="divide-y divide-secondary-200 dark:divide-dark-border">
                    {files.map((file, index) => (
                      <li key={index} className="py-3 flex justify-between items-center">
                        <div className="flex flex-wrap items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 w-5 h-5 mr-2 text-secondary-500 dark:text-dark-muted">
                            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" clipRule="evenodd" />
                            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                          </svg>
                          <div className="flex-grow min-w-0 mr-2">
                            <p className="text-sm font-medium text-secondary-900 dark:text-dark-text break-words">{file.name}</p>
                            <p className="text-xs text-secondary-500 dark:text-dark-muted">
                              {(file.size / 1024).toFixed(2)} KB • {file.type || 'Unknown type'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          aria-label="Remove file"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
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
                  {files.length + existingFiles.length >= MAX_FILES && (
                    <span className="text-xs text-red-500 dark:text-red-400">
                      Maximum file limit reached
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file-upload"
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-secondary-300 dark:border-dark-border border-dashed rounded-lg ${
                      files.length + existingFiles.length >= MAX_FILES
                        ? 'bg-secondary-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
                        : 'bg-secondary-50 dark:bg-gray-700 hover:bg-secondary-100 dark:hover:bg-gray-600 cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-3 text-secondary-400 dark:text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      <p className="mb-2 text-sm text-secondary-500 dark:text-dark-muted">
                        {files.length + existingFiles.length >= MAX_FILES
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
                      disabled={files.length + existingFiles.length >= MAX_FILES}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                to={`/assignments/${id}`}
                className="px-4 py-2 border border-secondary-300 dark:border-dark-border text-secondary-700 dark:text-dark-text rounded-md hover:bg-secondary-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </Link>
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
                    Submitting...
                  </>
                ) : (
                  existingSubmission ? 'Update Submission' : 'Submit Assignment'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignmentSubmission;
