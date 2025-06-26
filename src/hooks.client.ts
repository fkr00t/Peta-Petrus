import type { HandleClientError } from '@sveltejs/kit';

// Custom error handler for client-side errors
export const handleError: HandleClientError = ({ error, event }) => {
  console.error('Error in client:', error);
  
  // You can add your own error handling logic here
  // For example, logging to console or showing error message to user
  
  return {
    message: 'An unexpected error occurred',
    code: (error as any)?.code || 'UNKNOWN'
  };
};
