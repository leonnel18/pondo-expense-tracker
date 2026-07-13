const { spawn } = require('child_process');

// Try to spawn node server.js
const nodeProcess = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

nodeProcess.on('error', (err) => {
  console.error('Failed to start server with node:', err.message);
  console.log('Trying with full path to node executable...');
  
  // Try with a common node path on Windows
  const nodeProcess2 = spawn('C:\\Program Files\\nodejs\\node.exe', ['server.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  nodeProcess2.on('error', (err) => {
    console.error('Failed to start server with full path:', err.message);
    console.log('Please make sure Node.js is installed and in your PATH.');
  });
});