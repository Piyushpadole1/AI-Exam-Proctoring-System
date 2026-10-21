import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  styled,
  Stack,
  IconButton,
  Badge,
  Button,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
} from '@mui/material';
import PropTypes from 'prop-types';
import _ from 'lodash';

// components
import Profile from './Profile';
import { IconBellRinging, IconMenu, IconLogout, IconCheck, IconInbox } from '@tabler/icons-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../../slices/authSlice';
import axiosInstance from '../../../axios';
import { resolveNotificationRoute } from 'src/utils/notificationRoutes';

const Header = (props) => {
  // const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  // const lgDown = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Notification States
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Fetch unread count & periodic poll
  const fetchUnreadCount = async () => {
    try {
      const res = await axiosInstance.get('/api/notifications/unread-count');
      if (res.data && typeof res.data.unreadCount === 'number') {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (e) {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 12000);

    // SSE Real-time Notification Streaming
    let eventSource = null;
    try {
      eventSource = new EventSource('/api/notifications/stream', { withCredentials: true });
      eventSource.addEventListener('notification', (e) => {
        try {
          const item = JSON.parse(e.data);
          setNotifications((prev) => [item, ...prev]);
          setUnreadCount((c) => c + 1);
        } catch (err) {}
      });
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
      };
    } catch (e) {}

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, []);

  const handleOpenNotifications = async (event) => {
    setNotificationAnchor(event.currentTarget);
    setLoadingNotifications(true);
    try {
      const res = await axiosInstance.get('/api/notifications?limit=10');
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleCloseNotifications = () => {
    setNotificationAnchor(null);
  };

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.put('/api/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.warn('Mark all read failed:', e);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await axiosInstance.put(`/api/notifications/${notif.id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      }
    } catch (e) {
      console.warn('Mark notification read failed:', e);
    }

    handleCloseNotifications();

    const targetRoute = resolveNotificationRoute(notif) || notif.link;
    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  const handleQuickLogout = () => {
    dispatch(logout());
    localStorage.clear();
    sessionStorage.clear();
    navigate('/auth/login', { replace: true });
  };

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: '2px',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: '70px',
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={props.toggleMobileSidebar}
          sx={{
            display: {
              lg: 'none',
              xs: 'inline',
            },
          }}
        >
          <IconMenu width="20" height="20" />
        </IconButton>

        {/* Real-time Notification Bell */}
        <IconButton
          size="large"
          aria-label="Notifications"
          color="inherit"
          onClick={handleOpenNotifications}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <IconBellRinging size="21" stroke="1.5" />
          </Badge>
        </IconButton>

        {/* Notifications Popover Menu */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleCloseNotifications}
          PaperProps={{
            sx: {
              width: 360,
              maxHeight: 480,
              boxShadow: 4,
              borderRadius: 2,
              p: 0,
            },
          }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        >
          <Box
            sx={{
              p: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: '#f5f7fb',
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              Notifications {unreadCount > 0 && `(${unreadCount} new)`}
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                variant="text"
                startIcon={<IconCheck size={14} />}
                onClick={handleMarkAllRead}
                sx={{ fontSize: '11px', textTransform: 'none' }}
              >
                Mark all read
              </Button>
            )}
          </Box>
          <Divider />

          {loadingNotifications ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box textAlign="center" py={4} color="textSecondary">
              <IconInbox size={36} stroke="1" style={{ opacity: 0.5, marginBottom: 8 }} />
              <Typography variant="body2">No notifications yet</Typography>
            </Box>
          ) : (
            notifications.map((notif) => (
              <MenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                sx={{
                  py: 1.2,
                  px: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  whiteSpace: 'normal',
                  bgcolor: notif.isRead ? 'inherit' : 'rgba(25, 118, 210, 0.08)',
                  borderLeft: notif.isRead ? '3px solid transparent' : '3px solid #1976d2',
                  '&:hover': {
                    bgcolor: notif.isRead ? 'grey.100' : 'rgba(25, 118, 210, 0.14)',
                  },
                }}
              >
                <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                  <Typography variant="subtitle2" fontWeight={notif.isRead ? 500 : 700} color="textPrimary">
                    {notif.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px' }}>
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: '12px', mt: 0.5 }}>
                  {notif.message}
                </Typography>
              </MenuItem>
            ))
          )}
        </Menu>

        <Box flexGrow={1} />
        <Stack spacing={1.5} direction="row" alignItems="center">
          <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
            Hello, {_.startCase(userInfo?.name || 'User')}
          </Typography>
          {userInfo?.role && (
            <Chip
              label={userInfo.role.toUpperCase()}
              color={userInfo.role.toLowerCase().includes('teacher') ? 'secondary' : (userInfo.role.toLowerCase().includes('admin') ? 'error' : 'primary')}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          )}
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

Header.propTypes = {
  sx: PropTypes.object,
};

export default Header;
