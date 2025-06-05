import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Utility function to determine deadline status and color
const getDeadlineStatusClass = (deadline: string) => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'; // Passed
  } else if (diffDays <= 1) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'; // Due in 1 day or less
  } else if (diffDays <= 4) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'; // Due in 4 days or less
  } else {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'; // Due in more than 4 days
  }
};

// Utility function to get remaining time text
const getRemainingTimeText = (deadline: string): string => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  
  // If deadline has passed
  if (diffTime <= 0) {
    return "Passed";
  }
  
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
  } else {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
  }
};

interface Assignment {
  id: number;
  title: string;
  description: string;
  deadline: string;
  class_id: number;
  class_title: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
}

interface Submission {
  id: number;
  content: string;
  file_url: string;
  submitted_at: string;
  updated_at: string;
  grade?: number | null;
  feedback?: string | null;
  graded_at?: string | null;
  graded_by?: string | null;
}

const AssignmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignmentData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch assignment details
        const assignmentResponse = await axios.get(`${API_URL}/assignments/${id}`);
        setAssignment(assignmentResponse.data);

        // If user is praktikan, check if they have a submission
        if (user?.role === 'praktikan') {
          try {
            const submissionResponse = await axios.get(`${API_URL}/assignments/${id}/my-submission`);
            setSubmission(submissionResponse.data);
          } catch (err: any) {
            // It's okay if there's no submission yet
            if (err.response?.status !== 404) {
              console.error('Error fetching submission:', err);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching assignment data:', err);
        setError('Failed to load assignment data');
        setLoading(false);
      }
    };

    fetchAssignmentData();
  }, [id, user?.role]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/assignments/${id}`);
      navigate('/assignments');
    } catch (err) {
      console.error('Error deleting assignment:', err);
      setError('Failed to delete assignment');
    }
  };

  const isDeadlinePassed = assignment ? new Date(assignment.deadline) < new Date() : false;

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
        <Link to="/assignments" className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
          &larr; Back to Assignments
        </Link>
      </div>

      <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-dark-text">{assignment.title}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isDeadlinePassed
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                : getDeadlineStatusClass(assignment.deadline)
            }`}>
              {isDeadlinePassed ? 'Deadline passed' : `Due: ${new Date(assignment.deadline).toLocaleDateString()} • ${getRemainingTimeText(assignment.deadline)}`}
            </span>
          </div>

          <div className="mt-2 text-sm text-secondary-500 dark:text-dark-muted">
            <p>Class: {assignment.class_title}</p>
            <p>Created by: {assignment.creator_name}</p>
            <p>Created: {new Date(assignment.created_at).toLocaleDateString()}</p>
            {assignment.updated_at !== assignment.created_at && (
              <p>Updated: {new Date(assignment.updated_at).toLocaleDateString()}</p>
            )}
          </div>

          {user?.role === 'aslab' && (
            <div className="mt-4 mb-6 bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-dark-text mb-3">Instructor Actions</h2>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/assignments/${assignment.id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Edit Assignment
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete Assignment
                  </button>
                  <Link
                    to={`/assignments/${assignment.id}/submissions`}
                    className="inline-flex items-center px-4 py-2 border border-secondary-300 dark:border-dark-border rounded-md shadow-sm text-sm font-medium text-secondary-700 dark:text-dark-text bg-white dark:bg-gray-700 hover:bg-secondary-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    View Submissions
                  </Link>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'praktikan' && (
            <div className="mt-4 mb-6 bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-dark-text mb-3">Your Submission</h2>

                {submission ? (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {!isDeadlinePassed && (
                        <Link
                          to={`/assignments/${assignment.id}/submit`}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          Edit Submission
                        </Link>
                      )}
                    </div>

                    <div className="bg-secondary-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-secondary-600 dark:text-dark-muted mb-2">
                        Submitted: {new Date(submission.submitted_at).toLocaleString()}
                        {submission.updated_at !== submission.submitted_at && (
                          <span> (Updated: {new Date(submission.updated_at).toLocaleString()})</span>
                        )}
                      </p>

                      {/* Grade and Feedback Section */}
                      {submission.grade !== null && submission.grade !== undefined ? (
                        <div className="mb-4 border-t border-secondary-200 dark:border-dark-border pt-4 mt-4">
                          <h3 className="text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">Grade and Feedback:</h3>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3">
                            <div className="flex items-center mb-2">
                              <span className="text-lg font-bold text-secondary-900 dark:text-dark-text">
                                {submission.grade}/100
                              </span>
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                Graded
                              </span>
                            </div>
                            {submission.graded_at && (
                              <p className="text-xs text-secondary-500 dark:text-dark-muted mb-2">
                                Graded on {new Date(submission.graded_at).toLocaleString()}
                                {submission.graded_by && <span> by {submission.graded_by}</span>}
                              </p>
                            )}
                            {submission.feedback && (
                              <div className="mt-3">
                                <h4 className="text-xs font-medium text-secondary-700 dark:text-dark-text mb-1">Feedback:</h4>
                                <div className="text-sm text-secondary-600 dark:text-dark-muted p-3 bg-secondary-50 dark:bg-gray-700 rounded border border-secondary-200 dark:border-dark-border break-words">
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
                                    {submission.feedback}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 border-t border-secondary-200 dark:border-dark-border pt-4 mt-4">
                          <p className="text-sm text-secondary-600 dark:text-dark-muted">
                            Your submission has not been graded yet.
                          </p>
                        </div>
                      )}

                      {submission.file_url && (
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-secondary-700 dark:text-dark-text mb-2">Attached Files:</h3>
                          <div className="space-y-2">
                            {JSON.parse(submission.file_url).map((url: string, index: number) => (
                              <div key={index} className="flex flex-wrap items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 h-5 w-5 mr-2 text-secondary-500 dark:text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <a
                                  href={`${API_URL}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(`Assignment_${assignment.id}_Attachment_${index + 1}`)}`}
                                  download={`Assignment_${assignment.id}_Attachment_${index + 1}`}
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
                ) : (
                  <div>
                    {isDeadlinePassed ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative">
                        <p>The deadline for this assignment has passed. You did not submit any work.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-secondary-600 dark:text-dark-muted mb-4">You haven't submitted anything for this assignment yet.</p>
                        <Link
                          to={`/assignments/${assignment.id}/submit`}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          Submit Assignment
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 prose dark:prose-invert prose-primary max-w-none text-secondary-700 dark:text-dark-text break-words">
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
              {assignment.description}
            </ReactMarkdown>
          </div>
        </div>
      </div>




    </div>
  );
};

export default AssignmentDetail;
