import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import YarisugiSales from './YarisugiSales';
import CustomerDetailPage from './pages/CustomerDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<YarisugiSales />} />
        <Route path="/customer/:customerId" element={<CustomerDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;

