import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import FeedbackPage from './pages/FeedbackPage';
import ProjectPage from './pages/ProjectPage';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/projects" element={<ProjectPage />} />
      </Route>
    </Routes>
  );
}

export default App;
