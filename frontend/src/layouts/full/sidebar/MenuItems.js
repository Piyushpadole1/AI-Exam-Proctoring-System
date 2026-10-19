import {
  IconCopy,
  IconLayoutDashboard,
  IconLogin,
  IconMoodHappy,
  IconTypography,
  IconUserPlus,
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
    title: 'My Exams',
    icon: IconTypography,
    href: '/teacher/exams',
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
];

export default Menuitems;
