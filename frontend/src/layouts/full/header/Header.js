import React from 'react';
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
} from '@mui/material';
import PropTypes from 'prop-types';
import _ from 'lodash';

// components
import Profile from './Profile';
import { IconBellRinging, IconMenu, IconLogout } from '@tabler/icons-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../../slices/authSlice';

const Header = (props) => {
  // const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  // const lgDown = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

        <IconButton
          size="large"
          aria-label="Notifications"
          color="inherit"
        >
          <Badge variant="dot" color="primary">
            <IconBellRinging size="21" stroke="1.5" />
          </Badge>
        </IconButton>
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
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<IconLogout size={16} />}
            onClick={handleQuickLogout}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Logout
          </Button>
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
