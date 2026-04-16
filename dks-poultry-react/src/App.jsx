import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChicksLog from './pages/ChicksLog';
import BatchArchive from './pages/BatchArchive';
import Sales from './pages/Sales';
import Purchase from './pages/Purchase';
import Medicine from './pages/Medicine';
import Food from './pages/Food';
import EditRecord from './pages/EditRecord';
import UserManagement from './pages/UserManagement';
import More from './pages/More';

const P = ({ children, adminOnly }) => (
    <ProtectedRoute adminOnly={adminOnly}>
        <Layout>{children}</Layout>
    </ProtectedRoute>
);

const App = () => (
    <AuthProvider>
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/"        element={<P><Dashboard /></P>} />
                <Route path="/chicks"  element={<P><ChicksLog /></P>} />
                <Route path="/archive" element={<P><BatchArchive /></P>} />
                <Route path="/sales"   element={<P><Sales /></P>} />
                <Route path="/purchase"element={<P><Purchase /></P>} />
                <Route path="/medicine"element={<P><Medicine /></P>} />
                <Route path="/food"    element={<P><Food /></P>} />
                <Route path="/edit"    element={<P><EditRecord /></P>} />
                <Route path="/more"    element={<P><More /></P>} />
                <Route path="/users"   element={<P adminOnly><UserManagement /></P>} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </AuthProvider>
);

export default App;
