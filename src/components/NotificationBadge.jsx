import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Tooltip, Menu, MenuItem, Box, Typography, Chip } from '@mui/material';
import { Notifications, AlternateEmail, History, Message } from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationBadge = ({ onClick }) => {
  const { 
    getTotalUnreadCount, 
    notificationHistory, 
    showHistoryDialog, 
    setShowHistoryDialog,
    unreadCounts,
    clearMentionsCount
  } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const totalUnread = getTotalUnreadCount();
  const unreadMentions = unreadCounts.mentions || 0;

  const totalNotifications = totalUnread + unreadMentions;

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
    // Limpar contador de menções quando abrir o menu
    if (unreadMentions > 0) {
      clearMentionsCount();
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleShowHistory = () => {
    setShowHistoryDialog(true);
    handleMenuClose();
  };

  const recentNotifications = notificationHistory.slice(0, 5); // Mostrar apenas as 5 mais recentes

  return (
    <>
      <Tooltip title={
        totalNotifications > 0 
          ? `${totalUnread} mensagem(s) + ${unreadMentions} menção(ões) não lida(s)` 
          : 'Nenhuma notificação'
      }>
        <IconButton
          color="inherit"
          onClick={handleMenuClick}
          sx={{
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Badge
            badgeContent={totalNotifications}
            color="error"
            invisible={totalNotifications === 0}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.75rem',
                height: '20px',
                minWidth: '20px',
                borderRadius: '10px'
              }
            }}
          >
            {unreadMentions > 0 ? <AlternateEmail /> : <Notifications />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            minWidth: '300px',
            maxHeight: '400px'
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Notificações
          </Typography>
          <Box display="flex" gap={1} alignItems="center">
            <Chip 
              icon={<Message />} 
              label={`${totalUnread} mensagens`} 
              size="small" 
              color={totalUnread > 0 ? "primary" : "default"}
            />
            <Chip 
              icon={<AlternateEmail />} 
              label={`${unreadMentions} menções`} 
              size="small" 
              color={unreadMentions > 0 ? "warning" : "default"}
            />
          </Box>
        </Box>

        {recentNotifications.length > 0 ? (
          <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {recentNotifications.map((notification) => (
              <MenuItem 
                key={notification.id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': {
                    borderBottom: 'none'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
                  <Box sx={{ 
                    color: notification.type === 'mention' ? 'warning.main' : 'primary.main',
                    mt: 0.5
                  }}>
                    {notification.type === 'mention' ? <AlternateEmail fontSize="small" /> : <Message fontSize="small" />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ 
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.timestamp?.toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Box>
        ) : (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              Nenhuma notificação recente
            </Typography>
          </MenuItem>
        )}

        <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <MenuItem onClick={handleShowHistory} sx={{ justifyContent: 'center' }}>
            <History sx={{ mr: 1 }} />
            Ver histórico completo
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBadge; 