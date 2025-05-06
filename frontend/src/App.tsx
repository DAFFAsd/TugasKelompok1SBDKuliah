import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import SubjectList from './components/SubjectList';
import SubjectDetail from './components/SubjectDetail';
import SubjectForm from './components/SubjectForm';
import { ThemeProvider } from './context/ThemeContext';
import About from './components/About';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-secondary-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-zinc-900 dark:text-dark-text transition-colors duration-200">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<SubjectList />} />
              <Route path="/subjects/new" element={<SubjectForm />} />
              <Route path="/subjects/:id" element={<SubjectDetail />} />
              <Route path="/subjects/:id/edit" element={<SubjectForm isEditing />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
