import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

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
}

const AssignmentList = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_URL}/assignments`);
        setAssignments(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments');
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Group assignments by class
  const assignmentsByClass = assignments.reduce((acc, assignment) => {
    const classId = assignment.class_id;
    if (!acc[classId]) {
      acc[classId] = {
        id: classId,
        title: assignment.class_title,
        assignments: []
      };
    }
    acc[classId].assignments.push(assignment);
    return acc;
  }, {} as Record<number, { id: number; title: string; assignments: Assignment[] }>);

  // Sort assignments by deadline (upcoming first)
  Object.values(assignmentsByClass).forEach(classGroup => {
    classGroup.assignments.sort((a, b) =>
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-dark-text">Assignments</h1>
        {user?.role === 'aslab' && (
          <Link
            to="/assignments/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Assignment
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-6 text-center">
          <p className="text-secondary-600 dark:text-dark-muted">No assignments found</p>
          {user?.role === 'praktikan' && (
            <p className="mt-2 text-sm text-secondary-500 dark:text-dark-muted">
              Assignments will appear here once your instructors create them.
            </p>
          )}
          {user?.role === 'aslab' && (
            <Link
              to="/assignments/create"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Create Your First Assignment
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(assignmentsByClass).map(classGroup => (
            <div key={classGroup.id} className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden card-hover">
              <div className="px-6 py-4 border-b border-secondary-200 dark:border-dark-border">
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-dark-text">{classGroup.title}</h2>
              </div>
              <div className="divide-y divide-secondary-200 dark:divide-dark-border">
                {classGroup.assignments.map(assignment => {
                  const isDeadlinePassed = new Date(assignment.deadline) < new Date();
                  return (
                    <div key={assignment.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-secondary-900 dark:text-dark-text">
                            {assignment.title}
                          </h3>
                          <p className="mt-1 text-sm text-secondary-600 dark:text-dark-muted line-clamp-2">
                            {assignment.description}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isDeadlinePassed
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : getDeadlineStatusClass(assignment.deadline)
                        }`}>
                          {isDeadlinePassed ? 'Deadline passed' : `Due: ${new Date(assignment.deadline).toLocaleDateString()} • ${getRemainingTimeText(assignment.deadline)}`}
                        </span>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-xs text-secondary-500 dark:text-dark-muted">
                          Created by {assignment.creator_name}
                        </span>
                        <div className="flex space-x-2">
                          <Link
                            to={`/assignments/${assignment.id}`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 dark:text-primary-300 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 btn-hover"
                          >
                            View Details
                          </Link>
                          {user?.role === 'praktikan' && !isDeadlinePassed && (
                            <Link
                              to={`/assignments/${assignment.id}/submit`}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 btn-hover"
                            >
                              Submit
                            </Link>
                          )}
                          {user?.role === 'aslab' && (
                            <Link
                              to={`/assignments/${assignment.id}/edit`}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
                            >
                              Edit
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
