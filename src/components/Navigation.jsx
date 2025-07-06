import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Typography
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Support,
  Dashboard,
  Chat as ChatIcon,
  Note as NoteIcon,
  Business,
  Person
} from '@mui/icons-material';

const Navigation = ({ currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.startsWith('/attendance')) return '/attendance';
    if (path.startsWith('/users')) return '/users';
    if (path.startsWith('/sectors')) return '/sectors';
    if (path.startsWith('/internal-chat')) return '/internal-chat';
    if (path.startsWith('/customer-notes')) return '/customer-notes';
    return '/bulk';
  };

  const handleTabChange = (event, newValue) => {
    navigate(newValue);
  };

  const tabs = [
    {
      value: '/bulk',
      label: 'Envio em Massa',
      icon: <WhatsAppIcon />
    },
    {
      value: '/attendance',
      label: 'Atendimento',
      icon: <Support />
    },
    {
      value: '/internal-chat',
      label: 'Chat Interno',
      icon: <ChatIcon />
    },
    {
      value: '/customer-notes',
      label: 'Observações',
      icon: <NoteIcon />
    }
  ];

  // Adicionar abas de admin se o usuário for admin
  if (currentUser?.role === 'admin') {
    tabs.push(
      {
        value: '/users',
        label: 'Usuários',
        icon: <Person />
      },
      {
        value: '/sectors',
        label: 'Setores',
        icon: <Business />
      }
    );
  }

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
      <Tabs
        value={getCurrentTab()}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            minHeight: 64,
            textTransform: 'none',
            fontSize: '0.875rem'
          }
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {tab.icon}
                <Typography variant="body2">
                  {tab.label}
                </Typography>
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default Navigation; 