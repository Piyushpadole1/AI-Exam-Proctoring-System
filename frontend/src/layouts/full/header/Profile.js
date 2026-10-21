import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Menu,
  Button,
  IconButton,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material';

import { IconListCheck, IconUser, IconSettings } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from './../../../slices/authSlice';
import { useLogoutMutation, useGetProfilePhotoQuery } from './../../../slices/usersApiSlice';

const Profile = () => {
  const [anchorEl2, setAnchorEl2] = useState(null);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.auth);
  const { data: photoData } = useGetProfilePhotoQuery(undefined, {
    skip: !userInfo,
  });

  const handleClick2 = (event) => {
    setAnchorEl2(event.currentTarget);
  };
  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const [logoutApiCall] = useLogoutMutation();

  const logoutHandler = async () => {
    try {
      await logoutApiCall().unwrap();
    } catch (err) {
      console.warn('Logout API notice:', err);
    } finally {
      dispatch(logout());
      localStorage.clear();
      sessionStorage.clear();
      navigate('/auth/login', { replace: true });
    }
  };

  // Derive photo and initials
  const hasPhoto = Boolean(photoData?.hasPhoto && photoData?.photo);
  const userPhoto = photoData?.photo;
  const userInitials = photoData?.initials || (userInfo?.name ? userInfo.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U');

  const currentPath = location.pathname;

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="User Profile Menu"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          p: 0.5,
          border: '2px solid',
          borderColor: anchorEl2 ? 'primary.main' : 'divider',
          borderRadius: '50%',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
          },
        }}
        onClick={handleClick2}
      >
        {hasPhoto ? (
          <Avatar
            src={userPhoto}
            alt={userInfo?.name || 'User'}
            sx={{
              width: 36,
              height: 36,
            }}
          />
        ) : (
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            {userInitials}
          </Avatar>
        )}
      </IconButton>

      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        PaperProps={{
          elevation: 8,
          sx: {
            width: 230,
            borderRadius: 2,
            p: 1,
            mt: 1.5,
            boxShadow: '0 10px 30px 0 rgba(0,0,0,0.12)',
          },
        }}
      >
        <Box px={2} py={1.5}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {userInfo?.name || 'User'}
          </Typography>
          <Typography variant="body2" color="textSecondary" noWrap>
            {userInfo?.email || ''}
          </Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          component={Link}
          to="/user/profile"
          onClick={handleClose2}
          selected={currentPath === '/user/profile' || currentPath === '/profile'}
          sx={{
            borderRadius: 1,
            my: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              color: 'primary.main',
              fontWeight: 600,
              '& .MuiListItemIcon-root': {
                color: 'primary.main',
              },
            },
          }}
        >
          <ListItemIcon>
            <IconUser width={20} />
          </ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>

        <MenuItem
          component={Link}
          to="/user/account"
          onClick={handleClose2}
          selected={currentPath === '/user/account' || currentPath === '/account'}
          sx={{
            borderRadius: 1,
            my: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              color: 'primary.main',
              fontWeight: 600,
              '& .MuiListItemIcon-root': {
                color: 'primary.main',
              },
            },
          }}
        >
          <ListItemIcon>
            <IconSettings width={20} />
          </ListItemIcon>
          <ListItemText>My Account</ListItemText>
        </MenuItem>

        <MenuItem
          component={Link}
          to="/user/tasks"
          onClick={handleClose2}
          selected={currentPath === '/user/tasks' || currentPath === '/tasks'}
          sx={{
            borderRadius: 1,
            my: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              color: 'primary.main',
              fontWeight: 600,
              '& .MuiListItemIcon-root': {
                color: 'primary.main',
              },
            },
          }}
        >
          <ListItemIcon>
            <IconListCheck width={20} />
          </ListItemIcon>
          <ListItemText>My Tasks</ListItemText>
        </MenuItem>

        <Divider sx={{ my: 1 }} />
        <Box px={1} pb={0.5}>
          <Button
            variant="outlined"
            color="primary"
            onClick={logoutHandler}
            fullWidth
            size="small"
            sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none' }}
          >
            Logout
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;
