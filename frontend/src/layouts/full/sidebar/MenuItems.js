import {
  IconAperture,
  IconCopy,
  IconLayoutDashboard,
  IconLogin,
  IconMoodHappy,
  IconTypography,
  IconUserPlus,
  IconPlayerPlayFilled,
  IconUserCheck,
  IconChartBar,
  IconEye,
  IconDeviceDesktopAnalytics
} from '@tabler/icons-react';

import { uniqueId } from 'lodash';

const Menuitems = [
  // Student Items
  {
    navlabel: true,
    subheader: 'Student Portal',
    roles: ['student'],
  },
  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: IconLayoutDashboard,
    href: '/dashboard',
    roles: ['student'],
  },
  {
    id: uniqueId(),
    title: 'Exams',
    icon: IconTypography,
    href: '/exam',
    roles: ['student'],
  },
  {
    id: uniqueId(),
    title: 'My Results',
    icon: IconCopy,
    href: '/result',
    roles: ['student'],
  },

  // Teacher Items
  {
    navlabel: true,
    subheader: 'Teacher Panel',
    roles: ['teacher'],
  },
  {
    id: uniqueId(),
    title: 'Teacher Dashboard',
    icon: IconDeviceDesktopAnalytics,
    href: '/admin-dashboard',
    roles: ['teacher'],
  },
  {
    id: uniqueId(),
    title: 'Create Exam',
    icon: IconMoodHappy,
    href: '/create-exam',
    roles: ['teacher'],
  },
  {
    id: uniqueId(),
    title: 'Add Questions',
    icon: IconLogin,
    href: '/add-questions',
    roles: ['teacher'],
  },
  {
    id: uniqueId(),
    title: 'Student Enrollment',
    icon: IconUserCheck,
    href: '/user-approvals',
    roles: ['teacher'],
  },
  {
    id: uniqueId(),
    title: 'Exam Logs & Cheating',
    icon: IconUserPlus,
    href: '/exam-log',
    roles: ['teacher'],
  },
  {
    id: uniqueId(),
    title: 'Live Monitoring',
    icon: IconEye,
    href: '/live-monitoring',
    roles: ['teacher'],
  },
  {
    id: uniqueId(),
    title: 'Exam Analytics',
    icon: IconChartBar,
    href: '/analytics',
    roles: ['teacher'],
  },
  {
    id: uniqueId(),
    title: 'All Results',
    icon: IconCopy,
    href: '/result',
    roles: ['teacher'],
  },

  // Admin Items
  {
    navlabel: true,
    subheader: 'Admin Control',
    roles: ['admin'],
  },
  {
    id: uniqueId(),
    title: 'Admin Dashboard',
    icon: IconDeviceDesktopAnalytics,
    href: '/admin-dashboard',
    roles: ['admin'],
  },
  {
    id: uniqueId(),
    title: 'Enrollment & Users',
    icon: IconUserCheck,
    href: '/user-approvals',
    roles: ['admin'],
  },
  {
    id: uniqueId(),
    title: 'System Exam Logs',
    icon: IconUserPlus,
    href: '/exam-log',
    roles: ['admin'],
  },
  {
    id: uniqueId(),
    title: 'Live Monitoring',
    icon: IconEye,
    href: '/live-monitoring',
    roles: ['admin'],
  },
  {
    id: uniqueId(),
    title: 'System Analytics',
    icon: IconChartBar,
    href: '/analytics',
    roles: ['admin'],
  },
];

export default Menuitems;
