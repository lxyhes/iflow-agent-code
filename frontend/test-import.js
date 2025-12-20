// Test script to import server with timeout
const start = Date.now();
const timeout = 10000; // 10 seconds

const importPromise = import('./server/index.js');

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error(`Import timed out after ${timeout}ms`)), timeout);
});

Promise.race([importPromise, timeoutPromise])
  .then(() => {
    console.log(`Import succeeded in ${Date.now() - start}ms`);
    process.exit(0);
  })
  .catch(err => {
    console.error(`Import failed: ${err.message}`);
    console.error(`Elapsed time: ${Date.now() - start}ms`);
    process.exit(1);
  });