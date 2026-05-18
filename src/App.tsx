import { Routes, Route } from 'react-router-dom';
import FeedbackPage from './pages/FeedbackPage';
import ActorMappingPage from './pages/ActorMappingPage';
import LoginPage from './pages/loginPage';
import NewProject from './pages/NewProject';
import ProjectPage from './pages/ProjectPage';
import ReviewPage from './pages/ReviewPage';
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
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route
        path="/project/:projectId/workspace/:sessionId/feedback"
        element={<FeedbackPage />}
      />
      <Route
        path="/project/:projectId/workspace/:sessionId/actors"
        element={<ActorMappingPage />}
      />
      <Route
        path="/project/:projectId/workspace/:sessionId/review"
        element={<ReviewPage />}
      />
    </Routes>
  );
}

export default App;
