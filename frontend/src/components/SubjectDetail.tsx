import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import type { Subject } from '../services/api';

const SubjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubject = async () => {
      if (!id) return;

      try {
        const data = await api.getSubject(id);
        setSubject(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch subject');
        setLoading(false);
        console.error(err);
      }
    };

    fetchSubject();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;

    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await api.deleteSubject(id);
        navigate('/');
      } catch (err) {
        setError('Failed to delete subject');
        console.error(err);
      }
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!subject) return <div className="text-center py-10">Subject not found</div>;

  return (
    <div className="container-custom py-8 page-transition">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-1">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back to Notes
        </Link>
      </div>

      <div className="card dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 dark:border dark:border-dark-border dark:shadow-dark-card max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-secondary-200 dark:border-dark-border">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-dark-text">{subject.title}</h1>
          <div className="flex space-x-3 self-start">
            <Link
              to={`/subjects/${id}/edit`}
              className="btn-primary flex items-center space-x-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
              <span>Edit</span>
            </Link>
            <button
              onClick={handleDelete}
              className="btn-danger flex items-center space-x-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div className="prose w-full dark:prose-invert dark:text-dark-text">
          <ReactMarkdown>{subject.content}</ReactMarkdown>
        </div>

        {subject.updatedAt && (
          <div className="mt-8 pt-4 border-t border-secondary-200 dark:border-dark-border text-sm text-secondary-500 dark:text-dark-muted flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
            </svg>
            Last updated: {new Date(subject.updatedAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectDetail;
