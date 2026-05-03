import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import FeedbackPage from './pages/FeedbackPage';
import LoginPage from './pages/loginPage';
import NewProject from './pages/NewProject';
import ProjectPage from './pages/ProjectPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/projects/new" element={<NewProject />} />
      <Route path="/projects" element={<ProjectPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/feedback" element={<FeedbackPage />} />
      </Route>
    </Routes>
  );
}

export default App;
