import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { Subject } from '../services/api';

const SubjectList = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await api.getSubjects();
        setSubjects(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch subjects');
        setLoading(false);
        console.error(err);
      }
    };

    fetchSubjects();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await api.deleteSubject(id);
        setSubjects(subjects.filter(subject => subject._id !== id));
      } catch (err) {
        setError('Failed to delete subject');
        console.error(err);
      }
    }
  };

  if (loading) return <div className="text-center py-10 dark:text-dark-text">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500 dark:text-red-400">{error}</div>;

  return (
    <div className="container-custom py-8 page-transition">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-dark-text">My Notes</h1>
          <p className="text-secondary-600 dark:text-dark-muted mt-1">Manage your markdown notes</p>
        </div>
        <Link
          to="/subjects/new"
          className="btn-primary flex items-center space-x-2 self-start"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          <span>Create New Note</span>
        </Link>
      </div>

      {subjects.length === 0 ? (
        <div className="card dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 dark:border dark:border-dark-border text-center py-16 mt-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-16 h-16 mx-auto text-secondary-300 dark:text-dark-border mb-4"
          >
            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
            <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
          </svg>
          <h2 className="text-xl font-semibold text-secondary-700 dark:text-dark-text mb-2">No notes found</h2>
          <p className="text-secondary-500 dark:text-dark-muted mb-6">Create your first note to get started!</p>
          <Link
            to="/subjects/new"
            className="btn-primary inline-flex items-center space-x-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            <span>Create New Note</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div
              key={subject._id}
              className="card dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 dark:border dark:border-dark-border hover:shadow-lg dark:hover:shadow-dark-card hover:translate-y-[-2px] group"
            >
              <h2 className="text-xl font-semibold mb-2 text-secondary-900 dark:text-dark-text group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
                {subject.title}
              </h2>
              <p className="text-secondary-600 dark:text-dark-muted mb-6 line-clamp-3 h-[4.5rem]">
                {subject.content.substring(0, 150)}
                {subject.content.length > 150 ? '...' : ''}
              </p>
              <div className="flex justify-between items-center pt-4 border-t border-secondary-200 dark:border-dark-border">
                <div className="text-sm text-secondary-500 dark:text-dark-muted">
                  {subject.updatedAt ? new Date(subject.updatedAt).toLocaleDateString() : 'Recently updated'}
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/subjects/${subject._id}`}
                    className="btn-secondary text-sm py-1 px-3 flex items-center space-x-1 dark:bg-dark-border dark:text-dark-text dark:hover:bg-slate-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                    </svg>
                    <span>View</span>
                  </Link>
                  <Link
                    to={`/subjects/${subject._id}/edit`}
                    className="btn-primary text-sm py-1 px-3 flex items-center space-x-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                    </svg>
                    <span>Edit</span>
                  </Link>
                  <button
                    onClick={() => subject._id && handleDelete(subject._id)}
                    className="btn-danger text-sm py-1 px-3 flex items-center space-x-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectList;
