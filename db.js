const { Pool } = require('pg');

// Create a pool for managing PostgreSQL connections
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Ensure this variable is set
    // ssl: {
    //     rejectUnauthorized: false
    // },
    max: 20,  // Set the maximum number of clients in the pool
});

// Export the pool for use in other modules
module.exports = pool;