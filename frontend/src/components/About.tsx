import { Link } from 'react-router-dom';

interface TeamMember {
  name: string;
  role: string;
  image?: string;
}

const About = () => {
  const teamMembers: TeamMember[] = [
    {
      name: 'Daffa Sayra Firdaus',
      role: 'Main Developer',
    },
    {
      name: '*********************',
      role: 'Team Member',
    },
    {
      name: 'Alexander Christian',
      role: 'Rispek Developer',
    },
    {
      name: '**********************',
      role: 'Team Member',
    },
  ];

  return (
    <div className="container-custom py-8 page-transition">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-1">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Back to Notes
          </Link>
        </div>

        <div className="card dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 dark:border dark:border-dark-border">
          <h1 className="text-3xl font-bold mb-2 text-secondary-900 dark:text-dark-text">About Our Team</h1>
          <p className="text-secondary-600 dark:text-dark-muted mb-8">
            We are a team of students working on this markdown notes application as part of our Sistem Basis Data course's project.
          </p>

          <h2 className="text-xl font-semibold mb-4 text-secondary-800 dark:text-dark-text pb-2 border-b border-secondary-200 dark:border-dark-border">
            Team Members
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-secondary-100 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 border border-secondary-200 dark:border-dark-border flex items-center space-x-4"
              >
                <div className="w-12 h-12 rounded-full bg-primary-200 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-lg">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900 dark:text-dark-text">{member.name}</h3>
                  <p className="text-sm text-secondary-600 dark:text-dark-muted">{member.role}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-4 text-secondary-800 dark:text-dark-text pb-2 border-b border-secondary-200 dark:border-dark-border">
            About the Project
          </h2>

          <p className="text-secondary-700 dark:text-dark-muted mb-4">
            This application was built using:
          </p>

          <ul className="list-disc pl-5 mb-6 text-secondary-700 dark:text-dark-muted space-y-2">
            <li>React with TypeScript for the frontend</li>
            <li>Express.js for the backend API</li>
            <li>NeonDB (PostgreSQL) for the database</li>
            <li>Redis for caching (login/session manager)</li>
            <li>Docker for containerization</li>
            <li>Tailwind CSS for styling</li>
          </ul>

          <p className="text-secondary-700 dark:text-dark-muted">
            The application allows users to create, edit, and view markdown notes for various subjects.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
