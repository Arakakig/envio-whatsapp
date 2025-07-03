import React from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { Notifications } from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationBadge = ({ onClick }) => {
  const { getTotalUnreadCount } = useNotifications();
  const totalUnread = getTotalUnreadCount();

  return (
    <Tooltip title={totalUnread > 0 ? `${totalUnread} mensagem(s) não lida(s)` : 'Nenhuma notificação'}>
      <IconButton
        color="inherit"
        onClick={onClick}
        sx={{
          position: 'relative',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <Badge
          badgeContent={totalUnread}
          color="error"
          invisible={totalUnread === 0}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.75rem',
              height: '20px',
              minWidth: '20px',
              borderRadius: '10px'
            }
          }}
        >
          <Notifications />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default NotificationBadge; 