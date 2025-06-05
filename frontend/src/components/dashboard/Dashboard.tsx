import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

interface Class {
  id: number;
  title: string;
  description: string;
  creator_name: string;
  created_at: string;
  image_url?: string | null;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  deadline: string;
  class_id: number;
  class_title: string;
}

interface News {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  author: string;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [enrolledClasses, setEnrolledClasses] = useState<Class[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [latestNews, setLatestNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setLoadingAssignments(true);
        setError(null);

        // Fetch enrolled classes
        const classesResponse = await axios.get(`${API_URL}/classes/enrolled/me`);
        setEnrolledClasses(classesResponse.data);

        // Fetch upcoming assignments
        try {
          console.log('Fetching upcoming assignments...');
          const assignmentsResponse = await axios.get(`${API_URL}/assignments/upcoming`);
          console.log('Upcoming assignments response:', assignmentsResponse.data);
          setUpcomingAssignments(assignmentsResponse.data);
        } catch (assignmentErr) {
          console.error('Error fetching assignments:', assignmentErr);
        } finally {
          setLoadingAssignments(false);
        }

        // Fetch latest news
        const newsResponse = await axios.get(`${API_URL}/news?limit=3`);
        setLatestNews(newsResponse.data);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
        setLoadingAssignments(false);
      }
    };

    // Only fetch data if the user is authenticated
    if (user && user.id) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-secondary-900 dark:text-dark-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-dark-text">
          Welcome, {user?.username}!
        </h1>
        <p className="text-secondary-600 dark:text-dark-muted mt-2">
          {user?.role === 'aslab' ? 'Teaching Assistant Dashboard' : 'Student Dashboard'}
        </p>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-secondary-200 dark:border-dark-border">
          <h2 className="text-lg font-medium text-secondary-900 dark:text-dark-text">Upcoming Deadlines</h2>
        </div>
        <div className="p-4">
          {loadingAssignments ? (
            <div className="flex justify-center py-4">
              <svg className="animate-spin h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : upcomingAssignments.length === 0 ? (
            <div className="text-center py-4">
              {enrolledClasses.length === 0 && user?.role === 'praktikan' ? (
                <div>
                  <p className="text-secondary-600 dark:text-dark-muted mb-2">You are not enrolled in any classes</p>
                  <Link to="/classes" className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                    Browse classes to enroll
                  </Link>
                </div>
              ) : (
                <p className="text-secondary-600 dark:text-dark-muted">No upcoming deadlines</p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-secondary-200 dark:divide-dark-border">
              {upcomingAssignments.map((assignment) => (
                <li key={assignment.id} className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link
                        to={`/assignments/${assignment.id}`}
                        className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                      >
                        {assignment.title}
                      </Link>
                      <p className="text-sm text-secondary-500 dark:text-dark-muted mt-1">
                        {assignment.class_title}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDeadlineStatusClass(assignment.deadline)}`}>
                        Due: {new Date(assignment.deadline).toLocaleDateString()} • {getRemainingTimeText(assignment.deadline)}
                      </span>
                      {user?.role === 'praktikan' && (
                        <Link
                          to={`/assignments/${assignment.id}/submit`}
                          className="mt-2 text-xs text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          Submit &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {upcomingAssignments.length > 0 && (
            <div className="mt-4 text-right">
              <Link
                to="/assignments"
                className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                View all assignments &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Spacing between sections */}
      <div className="mb-10"></div>

      {/* Enrolled Classes */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-dark-text">
            Your Classes
          </h2>
          <Link to="/classes" className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            View all
          </Link>
        </div>

        {enrolledClasses.length === 0 ? (
          <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-6 text-center">
            <p className="text-secondary-600 dark:text-dark-muted">You are not enrolled in any classes</p>
            <Link to="/classes/browse" className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 btn-hover">
              Browse Classes
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrolledClasses.map((classItem) => (
              <div key={classItem.id} className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden card-hover">
                {classItem.image_url ? (
                  <div className="h-48 w-full overflow-hidden">
                    <img
                      src={classItem.image_url}
                      alt={classItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-white opacity-75">
                      <path d="M11.7 2.805a.75.75 0 0 1 .6 0A60.65 60.65 0 0 1 22.83 8.72a.75.75 0 0 1-.231 1.337 49.948 49.948 0 0 0-9.902 3.912l-.003.002c-.114.06-.227.119-.34.18a.75.75 0 0 1-.707 0A50.88 50.88 0 0 0 7.5 12.173v-.224c0-.131.067-.248.172-.311a54.615 54.615 0 0 1 4.653-2.52.75.75 0 0 0-.65-1.352 56.123 56.123 0 0 0-4.78 2.589 1.858 1.858 0 0 0-.859 1.228 49.803 49.803 0 0 0-4.634-1.527.75.75 0 0 1-.231-1.337A60.653 60.653 0 0 1 11.7 2.805Z" />
                      <path d="M13.06 15.473a48.45 48.45 0 0 1 7.666-3.282c.134 1.414.22 2.843.255 4.284a.75.75 0 0 1-.46.71 47.87 47.87 0 0 0-8.105 4.342.75.75 0 0 1-.832 0 47.87 47.87 0 0 0-8.104-4.342.75.75 0 0 1-.461-.71c.035-1.442.121-2.87.255-4.286.921.304 1.83.634 2.726.99v1.27a1.5 1.5 0 0 0-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.66a6.727 6.727 0 0 0 .551-1.607 1.5 1.5 0 0 0 .14-2.67v-.645a48.549 48.549 0 0 1 3.44 1.667 2.25 2.25 0 0 0 2.12 0Z" />
                      <path d="M4.462 19.462c.42-.419.753-.89 1-1.395.453.214.902.435 1.347.662a6.742 6.742 0 0 1-1.286 1.794.75.75 0 0 1-1.06-1.06Z" />
                    </svg>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-dark-text">
                    {classItem.title}
                  </h3>
                  <div className="mt-2 text-sm text-secondary-600 dark:text-dark-muted line-clamp-2 prose-sm prose-headings:mt-0 prose-headings:mb-1 prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0 prose dark:prose-invert break-words">
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
                      {classItem.description}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-secondary-500 dark:text-dark-muted">
                      By {classItem.creator_name}
                    </span>
                    <Link to={`/classes/${classItem.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                      View class
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest News */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-dark-text">
            Latest News
          </h2>
          <Link to="/news" className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            View all
          </Link>
        </div>

        {latestNews.length === 0 ? (
          <div className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-6 text-center">
            <p className="text-secondary-600 dark:text-dark-muted">No news available</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latestNews.map((news) => (
              <div key={news.id} className="bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 rounded-lg shadow overflow-hidden">
                {news.image_url && (
                  <div className="h-48 w-full overflow-hidden">
                    <img src={news.image_url} alt={news.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-dark-text">
                    {news.title}
                  </h3>
                  <p className="mt-2 text-sm text-secondary-600 dark:text-dark-muted line-clamp-3">
                    {news.content}
                  </p>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-secondary-500 dark:text-dark-muted">
                      By {news.author} • {new Date(news.created_at).toLocaleDateString()}
                    </span>
                    <Link to={`/news/${news.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                      Read more
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
