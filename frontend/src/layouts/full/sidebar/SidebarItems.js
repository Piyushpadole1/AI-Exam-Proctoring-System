import React from 'react';
import Menuitems from './MenuItems';
import { useLocation, useNavigate } from 'react-router';
import { Box, List, Button, Typography, Paper, Chip } from '@mui/material';
import { IconLogout } from '@tabler/icons-react';
import NavItem from './NavItem';
import NavGroup from './NavGroup/NavGroup';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../../slices/authSlice';

const SidebarItems = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathDirect = pathname;

  let currentRole = 'student';
  if (userInfo?.role) {
    const r = userInfo.role.toLowerCase();
    if (r.includes('admin')) currentRole = 'admin';
    else if (r.includes('teacher')) currentRole = 'teacher';
    else currentRole = 'student';
  }

  // Filter items matching the current user role
  const filteredItems = Menuitems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole);
  });

  const handleLogout = () => {
    dispatch(logout());
    localStorage.clear();
    sessionStorage.clear();
    navigate('/auth/login', { replace: true });
  };

  return (
    <Box sx={{ px: 3, pb: 4 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {filteredItems.map((item) => {
          if (item.subheader) {
            return <NavGroup item={item} key={item.subheader} />;
          } else {
            return <NavItem item={item} key={item.id} pathDirect={pathDirect} />;
          }
        })}
      </List>

      {/* Prominent User Session & Logout Card in Sidebar */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 2,
          bgcolor: 'grey.100',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.300',
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} noWrap>
          {userInfo?.name || 'Current User'}
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block" noWrap mb={1}>
          {userInfo?.email || 'Logged in'}
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Chip
            label={currentRole.toUpperCase()}
            size="small"
            color={currentRole === 'teacher' ? 'secondary' : currentRole === 'admin' ? 'error' : 'primary'}
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
        <Button
          variant="contained"
          color="error"
          size="small"
          fullWidth
          startIcon={<IconLogout size={16} />}
          onClick={handleLogout}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Sign Out / Switch
        </Button>
      </Paper>
    </Box>
  );
};

export default SidebarItems;
