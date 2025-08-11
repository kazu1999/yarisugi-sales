import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from './components/auth/Login';
import YarisugiSales from './YarisugiSales';
import CustomerDetailPage from './pages/CustomerDetailPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute>
              <YarisugiSales />
            </PrivateRoute>
          } />
          <Route path="/customer/:customerId" element={
            <PrivateRoute>
              <CustomerDetailPage />
            </PrivateRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

