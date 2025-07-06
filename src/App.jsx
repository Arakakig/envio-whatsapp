import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Support,
  Dashboard,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Chat as ChatIcon,
  Note as NoteIcon,
  Business,
  Person
} from '@mui/icons-material';

import AppRoutes from './routes/AppRoutes';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConversationProvider, useConversations } from './contexts/ConversationContext';
import NotificationBadge from './components/NotificationBadge';
import Navigation from './components/Navigation';

// Componente wrapper para passar o contexto das conversas para o NotificationProvider
const NotificationProviderWrapper = ({ children }) => {
  const conversationContext = useConversations();
  
  return (
    <NotificationProvider conversationContext={conversationContext}>
      {children}
    </NotificationProvider>
  );
};

function App() {
  const [socket, setSocket] = useState(null);
  const [chatwoodLogs, setChatwoodLogs] = useState([]);
  const [showChatwood, setShowChatwood] = useState(false);

  // Estados de autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login', 'register'
  const [anchorEl, setAnchorEl] = useState(null);

  // Configurar Socket.IO
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('chatwood-log', (logEntry) => {
      setChatwoodLogs(prev => [...prev, logEntry].slice(-100)); // Manter apenas os últimos 100 logs
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        handleLogout();
      }
    }
  }, []);

  const verifyToken = async (token, user) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  };

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleRegister = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAnchorEl(null);
  };

  const switchToLogin = () => {
    setAuthView('login');
  };

  const switchToRegister = () => {
    setAuthView('register');
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Router>
      <ConversationProvider>
        <NotificationProviderWrapper>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* AppBar apenas quando autenticado */}
            {isAuthenticated && (
              <AppBar position="static">
                <Toolbar>
                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    WhatsApp Manager
                  </Typography>
                  
                  {/* Notificação Badge */}
                  <NotificationBadge />
                  
                  {/* Menu do usuário */}
                  <IconButton
                    color="inherit"
                    onClick={handleMenuOpen}
                  >
                    <Avatar sx={{ width: 32, height: 32 }}>
                      <Person />
                    </Avatar>
                  </IconButton>
                  
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem disabled>
                      <Typography variant="body2">
                        {currentUser?.full_name || currentUser?.username}
                      </Typography>
                    </MenuItem>
                    <MenuItem disabled>
                      <Typography variant="caption" color="text.secondary">
                        {currentUser?.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </Typography>
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>
                      <LogoutIcon sx={{ mr: 1 }} />
                      Sair
                    </MenuItem>
                  </Menu>
                </Toolbar>
              </AppBar>
            )}

            {/* Navegação */}
            <Navigation currentUser={currentUser} />

            {/* Conteúdo principal */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <AppRoutes
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                handleLogin={handleLogin}
                handleRegister={handleRegister}
                handleLogout={handleLogout}
                switchToLogin={switchToLogin}
                switchToRegister={switchToRegister}
                authView={authView}
              />
            </Box>
          </Box>
        </NotificationProviderWrapper>
      </ConversationProvider>
    </Router>
  );
}

export default App;
