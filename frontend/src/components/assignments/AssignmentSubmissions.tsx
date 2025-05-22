import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useTable, useSortBy, useGlobalFilter } from 'react-table';
import type { Column } from 'react-table';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  class_id: string;
  class_title: string;
  creator_name: string;
}

interface Submission {
  id: string;
  user_id: string;
  username: string;
  content: string;
  file_url: string;
  submitted_at: string;
  updated_at: string;
  grade?: number | null;
  feedback?: string | null;
  graded_at?: string | null;
  graded_by?: string | null;
}

const AssignmentSubmissions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [gradingSuccess, setGradingSuccess] = useState(false);

  // Function to handle grading a submission
  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;

    // Validate grade input
    const grade = parseFloat(gradeInput);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      setGradingError('Please enter a valid grade between 0 and 100');
      return;
    }

    try {
      setGradingLoading(true);
      setGradingError(null);
      setGradingSuccess(false);

      // Send the grade and feedback to the server
      await axios.post(`${API_URL}/assignments/${id}/submissions/${selectedSubmission.id}/grade`, {
        grade,
        feedback: feedbackInput
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Update the local state
      const updatedSubmission = {
        ...selectedSubmission,
        grade,
        feedback: feedbackInput,
        graded_at: new Date().toISOString(),
        graded_by: user?.username
      };

      setSelectedSubmission(updatedSubmission);

      // Update the submission in the submissions array
      const updatedSubmissions = submissions.map(sub =>
        sub.id === selectedSubmission.id ? updatedSubmission : sub
      );

      setSubmissions(updatedSubmissions);
      setGradingSuccess(true);

    } catch (err) {
      console.error('Error grading submission:', err);
      setGradingError('Failed to save grade. Please try again.');
    } finally {
      setGradingLoading(false);
    }
  };

  // Reset grading form when a new submission is selected
  useEffect(() => {
    if (selectedSubmission) {
      setGradeInput(selectedSubmission.grade?.toString() || '');
      setFeedbackInput(selectedSubmission.feedback || '');
      setGradingError(null);
      setGradingSuccess(false);
    }
  }, [selectedSubmission]);

  useEffect(() => {
    // Only aslab can view all submissions
    if (user?.role !== 'aslab') {
      navigate('/unauthorized');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch assignment details
        const assignmentResponse = await axios.get(`${API_URL}/assignments/${id}`);
        setAssignment(assignmentResponse.data);

        // Fetch all submissions for this assignment
        const submissionsResponse = await axios.get(`${API_URL}/assignments/${id}/submissions`);
        setSubmissions(submissionsResponse.data);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, navigate]);

  // Setup for react-table
  const columns = useMemo<Column<Submission>[]>(() => [
    {
      Header: 'Student',
      accessor: 'username',
    },
    {
      Header: 'Submitted',
      accessor: 'submitted_at',
      Cell: ({ value }: { value: string }) => new Date(value).toLocaleString(),
    },
    {
      Header: 'Updated',
      accessor: 'updated_at',
      Cell: ({ value, row }: { value: string, row: { original: Submission } }) =>
        value !== row.original.submitted_at
          ? new Date(value).toLocaleString()
          : '-',
    },
    {
      Header: 'Grade',
      accessor: 'grade',
      Cell: ({ value }: { value: number | null | undefined }) =>
        value !== null && value !== undefined ? `${value}/100` : 'Not graded',
    }
  ], []);

  // Filter submissions based on search term
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(submission =>
      submission.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [submissions, searchTerm]);

  // Setup react-table
  const tableInstance = useTable<Submission>(
    {
      columns,
      data: filteredSubmissions,
      initialState: { 
    }
  },
  useGlobalFilter,
  useSortBy
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = tableInstance;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="container-custom py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error || 'Assignment not found'}</span>
        </div>
        <div className="mt-4">
          <Link to="/assignments" className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            &larr; Back to Assignments
          </Link>
        </div>
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
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-dark-text">
            Submissions: {assignment.title}
          </h1>
          <p className="text-secondary-600 dark:text-dark-muted mt-2">
            Class: {assignment.class_title} | Due: {new Date(assignment.deadline).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-secondary-200 dark:border-dark-border">
              <h2 className="text-lg font-medium text-secondary-900 dark:text-dark-text mb-3">
                Student Submissions ({submissions.length})
              </h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text text-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-secondary-400 dark:text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            {submissions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-secondary-600 dark:text-dark-muted">No submissions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table {...getTableProps()} className="min-w-full divide-y divide-secondary-200 dark:divide-dark-border">
                  <thead className="bg-secondary-50 dark:bg-gray-700">
                    {headerGroups.map(headerGroup => (
                      <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                          <th
                            {...column.getHeaderProps()}
                            {...(column as any).getSortByToggleProps?.()}
                            className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-dark-muted uppercase tracking-wider"
                          >
                            {column.render('Header')}
                            <span>
                              {(column as any).isSorted
                                ? (column as any).isSortedDesc
                                  ? ' 🔽'
                                  : ' 🔼'
                                : ''}
                            </span>
                          </th>
                        ))}
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-dark-muted uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()} className="bg-white dark:bg-gray-800 divide-y divide-secondary-200 dark:divide-dark-border">
                    {rows.map(row => {
                      prepareRow(row);
                      return (
                        <tr
                          {...row.getRowProps()}
                          className={`hover:bg-secondary-50 dark:hover:bg-gray-700 ${
                            selectedSubmission?.id === row.original.id ? 'bg-secondary-100 dark:bg-gray-700' : ''
                          }`}
                        >
                          {row.cells.map(cell => (
                            <td
                              {...cell.getCellProps()}
                              className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900 dark:text-dark-text"
                            >
                              {cell.render('Cell')}
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900 dark:text-dark-text">
                            <button
                              onClick={() => setSelectedSubmission(row.original)}
                              className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Submission Detail */}
        <div className="lg:col-span-2">
          {selectedSubmission ? (
            <div className="space-y-6">
              {/* Grading Section */}
              <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-secondary-200 dark:border-dark-border">
                  <h2 className="text-lg font-medium text-secondary-900 dark:text-dark-text">
                    Grade Submission
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="grade" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                        Grade (0-100)
                      </label>
                      <input
                        type="number"
                        id="grade"
                        min="0"
                        max="100"
                        value={gradeInput}
                        onChange={(e) => setGradeInput(e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                        Status
                      </label>
                      <div className="text-sm">
                        {selectedSubmission.grade !== null && selectedSubmission.grade !== undefined ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                            Graded: {selectedSubmission.grade}/100
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                            Not Graded
                          </span>
                        )}
                        {selectedSubmission.graded_at && (
                          <p className="mt-1 text-xs text-secondary-500 dark:text-dark-muted">
                            Last graded: {new Date(selectedSubmission.graded_at).toLocaleString()}
                            {selectedSubmission.graded_by && ` by ${selectedSubmission.graded_by}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="feedback" className="block text-sm font-medium text-secondary-700 dark:text-dark-text mb-1">
                      Feedback
                    </label>
                    <textarea
                      id="feedback"
                      rows={4}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text"
                      placeholder="Provide feedback to the student..."
                    ></textarea>
                  </div>

                  {gradingError && (
                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative">
                      {gradingError}
                    </div>
                  )}

                  {gradingSuccess && (
                    <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded relative">
                      Grade saved successfully!
                    </div>
                  )}

                  <button
                    onClick={handleGradeSubmission}
                    disabled={gradingLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gradingLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Grade'
                    )}
                  </button>
                </div>
              </div>

              {/* Submission Content */}
              <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-secondary-200 dark:border-dark-border">
                  <h2 className="text-lg font-medium text-secondary-900 dark:text-dark-text">
                    Submission by {selectedSubmission.username}
                  </h2>
                  <p className="text-xs text-secondary-500 dark:text-dark-muted mt-1">
                    Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}
                    {selectedSubmission.updated_at !== selectedSubmission.submitted_at && (
                      <span> (Updated: {new Date(selectedSubmission.updated_at).toLocaleString()})</span>
                    )}
                  </p>
                </div>
                <div className="p-6">
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
                      {selectedSubmission.content}
                    </ReactMarkdown>
                  </div>

                  {selectedSubmission.file_url && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">Attached Files:</h3>
                      <div className="space-y-2">
                        {JSON.parse(selectedSubmission.file_url).map((url: string, index: number) => (
                          <div key={index} className="flex flex-wrap items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 h-5 w-5 mr-2 text-secondary-500 dark:text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <a
                              href={`${API_URL}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(`Submission_${selectedSubmission.username}_Attachment_${index + 1}`)}`}
                              download={`Submission_${selectedSubmission.username}_Attachment_${index + 1}`}
                              className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 break-words"
                            >
                              Attachment {index + 1}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
              <div className="p-6 text-center">
                <p className="text-secondary-600 dark:text-dark-muted">
                  Select a submission from the list to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentSubmissions;
