import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from './components/auth/Login';
import YarisugiSales from './YarisugiSales';
import CustomerDetailPage from './pages/CustomerDetailPage';
import { configureAmplify } from './utils/awsConfig';

// AWS Amplify設定を初期化
configureAmplify();

function App() {
  return (
    <Router>
      <AuthProvider>
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
      </AuthProvider>
    </Router>
  );
}

export default App;

