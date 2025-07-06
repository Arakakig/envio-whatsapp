import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BulkMessage from '../components/BulkMessage';
import AttendanceLayout from '../components/AttendanceLayout';
import UserManagement from '../components/UserManagement';
import SectorManagement from '../components/SectorManagement';
import InternalChat from '../components/InternalChat';
import CustomerNotes from '../components/CustomerNotes';
import Login from '../components/Login';
import Register from '../components/Register';

const AppRoutes = ({ 
  isAuthenticated, 
  currentUser, 
  handleLogin, 
  handleRegister, 
  handleLogout,
  switchToLogin,
  switchToRegister,
  authView 
}) => {
  // Se não estiver autenticado, mostrar tela de login/registro
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route 
          path="/login" 
          element={
            <Login 
              onLogin={handleLogin}
              onSwitchToRegister={switchToRegister}
              view={authView}
            />
          } 
        />
        <Route 
          path="/register" 
          element={
            <Register 
              onRegister={handleRegister}
              onSwitchToLogin={switchToLogin}
              view={authView}
            />
          } 
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Se estiver autenticado, mostrar as rotas da aplicação
  return (
    <Routes>
      {/* Rota padrão - redireciona para bulk */}
      <Route path="/" element={<Navigate to="/bulk" replace />} />
      
      {/* Envio em massa */}
      <Route path="/bulk" element={<BulkMessage />} />
      
      {/* Atendimento ao cliente */}
      <Route path="/attendance" element={<AttendanceLayout />} />
      <Route path="/attendance/:conversationId" element={<AttendanceLayout />} />
      
      {/* Gerenciamento de usuários (apenas admin) */}
      {currentUser?.role === 'admin' && (
        <Route path="/users" element={<UserManagement />} />
      )}
      
      {/* Gerenciamento de setores (apenas admin) */}
      {currentUser?.role === 'admin' && (
        <Route path="/sectors" element={<SectorManagement />} />
      )}
      
      {/* Chat interno */}
      <Route path="/internal-chat" element={<InternalChat />} />
      
      {/* Observações de clientes */}
      <Route path="/customer-notes" element={<CustomerNotes />} />
      
      {/* Rota catch-all - redireciona para bulk */}
      <Route path="*" element={<Navigate to="/bulk" replace />} />
    </Routes>
  );
};

export default AppRoutes; 