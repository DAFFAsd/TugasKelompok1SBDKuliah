import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import api from '../services/api';
import type { Subject } from '../services/api';

interface SubjectFormProps {
  isEditing?: boolean;
}

const SubjectForm = ({ isEditing = false }: SubjectFormProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

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
    <div className="container-custom py-8 page-transition">
      <div className="max-w-3xl mx-auto">
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
              <div className="markdown-editor-container dark:markdown-editor-dark">
                <SimpleMDE
                  id="content"
                  value={content}
                  onChange={setContent}
                  getMdeInstance={(instance) => {
                    editorRef.current = instance;
                  }}
                  options={{
                    spellChecker: false,
                    placeholder: 'Write your content in markdown format...',
                    status: ['lines', 'words', 'cursor'],
                    autofocus: false,
                    toolbar: [
                      'bold', 'italic', 'heading', '|',
                      'quote', 'unordered-list', 'ordered-list', '|',
                      'link', 'image', '|',
                      'preview', 'side-by-side', 'fullscreen', '|',
                      'guide'
                    ],
                    previewClass: ['editor-preview', 'prose', 'max-w-none', 'dark:prose-invert', 'dark:text-dark-text'],
                    lineNumbers: false,
                    lineWrapping: true,
                    indentWithTabs: false,
                    tabSize: 2,
                    insertTexts: {
                      horizontalRule: ["", "\n\n-----\n\n"],
                      image: ["![](", ")"],
                      link: ["[", "](https://)"],
                      table: ["", "\n\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Text     | Text     | Text     |\n\n"],
                    }
                  }}
                />
              </div>
              <div className="text-xs text-secondary-500 dark:text-dark-muted mt-2">
                <span className="font-medium">Tip:</span> You can use Markdown syntax to format your content.
                <a
                  href="https://www.markdownguide.org/cheat-sheet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 ml-1"
                >
                  View Markdown Cheat Sheet
                </a>
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