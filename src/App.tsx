import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import FeedbackPage from './pages/FeedbackPage';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/feedback" element={<FeedbackPage />} />
      </Route>
    </Routes>
  );
}

export default App;
