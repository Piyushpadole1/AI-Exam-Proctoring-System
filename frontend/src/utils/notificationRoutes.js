/**
 * Shared Notification Route Resolver
 * Maps backend notification events and entity references to canonical frontend routes.
 */

export const resolveNotificationRoute = (notification) => {
  if (!notification) return null;

  const { type, link, relatedExamId, relatedRequestId } = notification;

  switch (type) {
    case 'ENROLLMENT_REQUEST': {
      const examParam = relatedExamId ? `&examCode=${encodeURIComponent(relatedExamId)}` : '';
      const reqParam = relatedRequestId ? `&requestId=${encodeURIComponent(relatedRequestId)}` : '';
      return `/user-approvals?tab=pending${examParam}${reqParam}`;
    }

    case 'ENROLLMENT_APPROVED': {
      if (relatedExamId) {
        return `/exam/${encodeURIComponent(relatedExamId)}`;
      }
      return '/exam';
    }

    case 'ENROLLMENT_REJECTED': {
      return '/exam';
    }

    case 'EXAM_RESULT':
    case 'RESULT_PUBLISHED': {
      if (relatedRequestId) {
        return `/result?attemptId=${encodeURIComponent(relatedRequestId)}`;
      }
      return '/result';
    }

    case 'PROCTORING_ALERT':
    case 'PROCTORING_TERMINATED': {
      if (relatedExamId) {
        return `/live-monitoring?examCode=${encodeURIComponent(relatedExamId)}`;
      }
      return '/live-monitoring';
    }

    default: {
      if (link) {
        if (link.startsWith('/teacher/approvals')) {
          return link.replace('/teacher/approvals', '/user-approvals?tab=pending');
        }
        if (link.startsWith('/student/exams')) {
          return '/exam';
        }
        return link;
      }
      return null;
    }
  }
};
