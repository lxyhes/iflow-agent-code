// Mock node-pty for Windows when build tools aren't available
export default {
  spawn: (shell, shellArgs, options) => {
    console.warn('WARNING: Using mock PTY - terminal functionality will not work');
    console.warn('Install Visual Studio Build Tools to enable full terminal functionality');
    
    return {
      pid: 9999,
      on: (event, callback) => {
        if (event === 'data') {
          // Simulate shell prompt
          setTimeout(() => callback('$ '), 100);
        }
      },
      write: (data) => {
        console.log('Mock PTY write:', data);
      },
      kill: () => {
        console.log('Mock PTY killed');
      },
      resize: (cols, rows) => {
        console.log('Mock PTY resize:', cols, rows);
      }
    };
  }
};