import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';
import type { Subject } from '../services/api';

interface SubjectFormProps {
  isEditing?: boolean;
}

// Helper function to insert markdown syntax
const insertMarkdown = (
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = ''
) => {
  // Store current scroll position
  const scrollTop = textarea.scrollTop;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const newText = before + selectedText + after;

  // Modern approach instead of execCommand
  const textBefore = textarea.value.substring(0, start);
  const textAfter = textarea.value.substring(end);

  // Create a new value with the markdown inserted
  const newValue = textBefore + newText + textAfter;

  // Calculate new cursor position
  const newCursorPos = selectedText.length > 0
    ? start + before.length + selectedText.length + after.length
    : start + before.length;

  // Update React state directly instead of using dispatchEvent
  // This prevents scroll jumping

  // Update the value manually
  textarea.value = newValue;

  // Focus and set cursor position
  textarea.focus();
  textarea.selectionStart = newCursorPos;
  textarea.selectionEnd = newCursorPos;

  // Restore scroll position
  textarea.scrollTop = scrollTop;

  // Return the new value so we can update React state
  return newValue;
};

const SubjectForm = ({ isEditing = false }: SubjectFormProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mode: 'edit', 'preview', atau 'side-by-side'
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'side-by-side'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  // Function to sync scrolling in side-by-side mode
  const syncScroll = (source: 'editor' | 'preview', scrollTop: number) => {
    if (editorMode !== 'side-by-side') return;

    const textarea = textareaRef.current;
    const preview = previewRef.current;

    if (!textarea || !preview) return;

    // Calculate scroll ratio
    const sourceElement = source === 'editor' ? textarea : preview;
    const targetElement = source === 'editor' ? preview : textarea;

    const sourceScrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight;
    const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight;

    if (sourceScrollHeight <= 0 || targetScrollHeight <= 0) return;

    const scrollRatio = scrollTop / sourceScrollHeight;
    const targetScrollTop = scrollRatio * targetScrollHeight;

    // Apply scroll to target element
    targetElement.scrollTop = targetScrollTop;
  };

  // Function to handle markdown toolbar actions
  const handleMarkdownAction = (action: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Store current scroll position
    const scrollTop = textarea.scrollTop;
    let newContent = '';

    switch (action) {
      case 'bold':
        newContent = insertMarkdown(textarea, '**', '**');
        break;
      case 'italic':
        newContent = insertMarkdown(textarea, '*', '*');
        break;
      case 'heading':
        newContent = insertMarkdown(textarea, '## ');
        break;
      case 'link':
        newContent = insertMarkdown(textarea, '[', '](https://)');
        break;
      case 'image':
        newContent = insertMarkdown(textarea, '![alt text](', ')');
        break;
      case 'code':
        newContent = insertMarkdown(textarea, '```\n', '\n```');
        break;
      case 'quote':
        newContent = insertMarkdown(textarea, '> ');
        break;
      case 'ul':
        newContent = insertMarkdown(textarea, '- ');
        break;
      case 'ol':
        newContent = insertMarkdown(textarea, '1. ');
        break;
      case 'hr':
        newContent = insertMarkdown(textarea, '\n\n---\n\n');
        break;
      default:
        break;
    }

    // Update React state with new content
    if (newContent) {
      setContent(newContent);

      // Ensure scroll position is maintained after state update
      requestAnimationFrame(() => {
        if (textarea) {
          textarea.scrollTop = scrollTop;

          // Also sync preview scroll in side-by-side mode
          if (editorMode === 'side-by-side') {
            syncScroll('editor', scrollTop);
          }
        }
      });
    }
  };

  // Disable scroll restoration when this component is mounted
  useLayoutEffect(() => {
    if (window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }

    // Prevent scroll jumps
    const handleScroll = (e: Event) => {
      if (textareaRef.current) {
        // If the textarea has focus, prevent default scroll behavior
        if (document.activeElement === textareaRef.current) {
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      // Re-enable scroll restoration when component unmounts
      if (window.history.scrollRestoration) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useEffect(() => {
    const fetchSubject = async () => {
      if (isEditing && id) {
        try {
          const data = await api.getSubject(id);
          setTitle(data.title);
          setContent(data.content);
          setLoading(false);
        } catch (err) {
          setError('Failed to fetch subject');
          setLoading(false);
          console.error(err);
        }
      }
    };

    fetchSubject();
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    const subjectData: Subject = {
      title: title.trim(),
      content: content.trim()
    };

    try {
      if (isEditing && id) {
        await api.updateSubject(id, subjectData);
        navigate(`/subjects/${id}`);
      } else {
        const newSubject = await api.createSubject(subjectData);
        navigate(`/subjects/${newSubject._id}`);
      }
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} subject`);
      setSubmitting(false);
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-10 dark:text-dark-text">Loading...</div>;

  return (
    <div className={`container-custom py-8 page-transition prevent-scroll-reset ${editorMode === 'side-by-side' ? 'side-by-side-container' : ''}`} ref={formContainerRef}>
      <div className={`mx-auto ${editorMode === 'side-by-side' ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-1">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Back to Notes
          </Link>
        </div>

        <div className="card dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 dark:border dark:border-dark-border">
          <h1 className="text-2xl font-bold mb-6 text-secondary-900 dark:text-dark-text pb-4 border-b border-secondary-200 dark:border-dark-border">
            {isEditing ? 'Edit Note' : 'Create New Note'}
          </h1>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 mb-6 rounded-md">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-red-500 dark:text-red-400">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="title" className="block text-secondary-700 dark:text-dark-text font-medium mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 dark:border-dark-border dark:text-dark-text dark:focus:ring-primary-700"
                placeholder="Enter note title"
                required
              />
            </div>

            <div className="mb-8">
              <label htmlFor="content" className="block text-secondary-700 dark:text-dark-text font-medium mb-2">
                Content (Markdown)
              </label>
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditorMode('edit')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        editorMode === 'edit'
                          ? 'bg-primary-600 text-white dark:bg-primary-700'
                          : 'bg-secondary-200 text-secondary-700 dark:bg-dark-border dark:text-dark-text'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('preview')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        editorMode === 'preview'
                          ? 'bg-primary-600 text-white dark:bg-primary-700'
                          : 'bg-secondary-200 text-secondary-700 dark:bg-dark-border dark:text-dark-text'
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('side-by-side')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        editorMode === 'side-by-side'
                          ? 'bg-primary-600 text-white dark:bg-primary-700'
                          : 'bg-secondary-200 text-secondary-700 dark:bg-dark-border dark:text-dark-text'
                      }`}
                    >
                      Side by Side
                    </button>
                  </div>
                  <div className="text-xs text-secondary-500 dark:text-dark-muted">
                    <a
                      href="https://www.markdownguide.org/cheat-sheet/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Markdown Guide
                    </a>
                  </div>
                </div>

                {editorMode === 'edit' ? (
                  <div className="markdown-editor-container dark:markdown-editor-dark no-scroll-anchor">
                    <div className="flex flex-wrap gap-1 p-2 bg-secondary-100 dark:bg-gray-800 border border-secondary-300 dark:border-dark-border rounded-t-md">
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('bold')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Bold"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('italic')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Italic"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <line x1="19" y1="4" x2="10" y2="4"></line>
                          <line x1="14" y1="20" x2="5" y2="20"></line>
                          <line x1="15" y1="4" x2="9" y2="20"></line>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('heading')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Heading"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M6 12h12"></path>
                          <path d="M6 4v16"></path>
                          <path d="M18 4v16"></path>
                        </svg>
                      </button>
                      <span className="w-px h-6 bg-secondary-300 dark:bg-gray-600 self-center"></span>
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('quote')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Quote"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('code')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Code"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <polyline points="16 18 22 12 16 6"></polyline>
                          <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('ul')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Unordered List"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <line x1="8" y1="6" x2="21" y2="6"></line>
                          <line x1="8" y1="12" x2="21" y2="12"></line>
                          <line x1="8" y1="18" x2="21" y2="18"></line>
                          <line x1="3" y1="6" x2="3.01" y2="6"></line>
                          <line x1="3" y1="12" x2="3.01" y2="12"></line>
                          <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('ol')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Ordered List"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <line x1="10" y1="6" x2="21" y2="6"></line>
                          <line x1="10" y1="12" x2="21" y2="12"></line>
                          <line x1="10" y1="18" x2="21" y2="18"></line>
                          <path d="M4 6h1v4"></path>
                          <path d="M4 10h2"></path>
                          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                        </svg>
                      </button>
                      <span className="w-px h-6 bg-secondary-300 dark:bg-gray-600 self-center"></span>
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('link')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Link"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('image')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkdownAction('hr')}
                        className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                        title="Horizontal Rule"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                    </div>
                    <textarea
                      id="content"
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => {
                        // Store current cursor position and scroll position
                        const textarea = textareaRef.current;
                        const selectionStart = textarea?.selectionStart;
                        const selectionEnd = textarea?.selectionEnd;
                        const scrollTop = textarea?.scrollTop;

                        // Update content state
                        setContent(e.target.value);

                        // Use requestAnimationFrame to ensure the DOM has updated
                        requestAnimationFrame(() => {
                          if (textarea) {
                            // Restore focus
                            textarea.focus();

                            // Restore cursor position if we have it
                            if (selectionStart !== undefined && selectionEnd !== undefined) {
                              textarea.selectionStart = selectionStart;
                              textarea.selectionEnd = selectionEnd;
                            }

                            // Restore scroll position if we have it
                            if (scrollTop !== undefined) {
                              textarea.scrollTop = scrollTop;
                            }
                          }
                        });
                      }}
                      className="w-full h-64 p-4 border border-secondary-300 dark:border-dark-border border-t-0 rounded-b-md
                                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 dark:text-dark-text
                                font-mono text-base resize-y"
                      placeholder="Write your content in markdown format..."
                    />
                  </div>
                ) : editorMode === 'preview' ? (
                  <div
                    ref={previewRef}
                    className="markdown-preview prose max-w-none dark:prose-invert dark:text-dark-text p-4 border border-secondary-300 dark:border-dark-border rounded-md min-h-[16rem] overflow-auto dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700"
                  >
                    {content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-secondary-500 dark:text-dark-muted italic">
                        Preview will appear here. Start writing in the editor.
                      </p>
                    )}
                  </div>
                ) : (
                  // Side by Side View
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="w-full lg:w-1/2 markdown-editor-container dark:markdown-editor-dark no-scroll-anchor">
                      <div className="flex flex-wrap gap-1 p-2 bg-secondary-100 dark:bg-gray-800 border border-secondary-300 dark:border-dark-border rounded-t-md">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault(); // Prevent default button behavior
                            handleMarkdownAction('bold');
                          }}
                          className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                          title="Bold"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleMarkdownAction('italic');
                          }}
                          className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                          title="Italic"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <line x1="19" y1="4" x2="10" y2="4"></line>
                            <line x1="14" y1="20" x2="5" y2="20"></line>
                            <line x1="15" y1="4" x2="9" y2="20"></line>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleMarkdownAction('heading');
                          }}
                          className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                          title="Heading"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M6 12h12"></path>
                            <path d="M6 4v16"></path>
                            <path d="M18 4v16"></path>
                          </svg>
                        </button>
                        <span className="w-px h-6 bg-secondary-300 dark:bg-gray-600 self-center"></span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleMarkdownAction('link');
                          }}
                          className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                          title="Link"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleMarkdownAction('image');
                          }}
                          className="p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-gray-700 text-secondary-700 dark:text-dark-text"
                          title="Image"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                        </button>
                      </div>
                      <textarea
                        id="content"
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => {
                          // Store current cursor position and scroll position
                          const textarea = textareaRef.current;
                          const selectionStart = textarea?.selectionStart;
                          const selectionEnd = textarea?.selectionEnd;
                          const scrollTop = textarea?.scrollTop;

                          // Update content state
                          setContent(e.target.value);

                          // Use requestAnimationFrame to ensure the DOM has updated
                          requestAnimationFrame(() => {
                            if (textarea) {
                              // Restore focus
                              textarea.focus();

                              // Restore cursor position if we have it
                              if (selectionStart !== undefined && selectionEnd !== undefined) {
                                textarea.selectionStart = selectionStart;
                                textarea.selectionEnd = selectionEnd;
                              }

                              // Restore scroll position if we have it
                              if (scrollTop !== undefined) {
                                textarea.scrollTop = scrollTop;

                                // Sync scroll in side-by-side mode
                                if (editorMode === 'side-by-side') {
                                  syncScroll('editor', scrollTop);
                                }
                              }
                            }
                          });
                        }}
                        onScroll={(e) => {
                          if (editorMode === 'side-by-side') {
                            syncScroll('editor', e.currentTarget.scrollTop);
                          }
                        }}
                        className="w-full h-64 p-4 border border-secondary-300 dark:border-dark-border border-t-0 rounded-b-md
                                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                  dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 dark:text-dark-text
                                  font-mono text-base resize-y"
                        placeholder="Write your content in markdown format..."
                      />
                    </div>
                    <div
                      ref={previewRef}
                      onScroll={(e) => {
                        if (editorMode === 'side-by-side') {
                          syncScroll('preview', e.currentTarget.scrollTop);
                        }
                      }}
                      className="w-full lg:w-1/2 markdown-preview prose max-w-none dark:prose-invert dark:text-dark-text p-4 border border-secondary-300 dark:border-dark-border rounded-md min-h-[16rem] overflow-auto dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700"
                    >
                      {editorMode !== 'side-by-side' && (
                        <div className="p-2 bg-secondary-100 dark:bg-gray-800 border-b border-secondary-300 dark:border-dark-border mb-4">
                          <h3 className="text-sm font-medium text-secondary-700 dark:text-dark-text">Preview</h3>
                        </div>
                      )}
                      {content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {content}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-secondary-500 dark:text-dark-muted italic">
                          Preview will appear here. Start writing in the editor.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200 dark:border-dark-border">
              <button
                type="button"
                onClick={() => navigate(isEditing && id ? `/subjects/${id}` : '/')}
                className="btn-secondary dark:bg-dark-border dark:text-dark-text dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  isEditing ? 'Update Note' : 'Create Note'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubjectForm;