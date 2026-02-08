import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import AdaptationLab from './pages/AdaptationLab';
import Friends from './pages/Friends';
import FriendProfile from './pages/FriendProfile';
import ImportWorkouts from './pages/ImportWorkouts';
import References from './pages/References';

export default function App() {
  const auth = useAuthProvider();

  if (auth.loading) {
    return <div className='loading-screen'>Loading...</div>;
  }

  if (!auth.user) {
    return (
      <AuthContext.Provider value={auth}>
        <Login />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path='/' element={<Dashboard />} />
            <Route path='/calendar' element={<Calendar />} />
            <Route path='/adaptation' element={<AdaptationLab />} />
            <Route path='/friends' element={<Friends />} />
            <Route path='/friends/:uid' element={<FriendProfile />} />
            <Route path='/import' element={<ImportWorkouts />} />
            <Route path='/references' element={<References />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
