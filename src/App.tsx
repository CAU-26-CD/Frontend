import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import FeedbackPage from './pages/FeedbackPage';
import LoginPage from './pages/loginPage';
import NewProject from './pages/NewProject';
import ProjectPage from './pages/ProjectPage';
import WorkspacePage from './pages/WorkspacePage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/projects" element={<ProjectPage />} />
      <Route path="/project/new" element={<NewProject />} />
      <Route path="/project/:projectId/workspace" element={<WorkspacePage />} />
      <Route element={<MainLayout />}>
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route
          path="/project/:projectId/workspace/:sessionId/feedback"
          element={<FeedbackPage />}
        />
      </Route>
    </Routes>
  );
}

export default App;
