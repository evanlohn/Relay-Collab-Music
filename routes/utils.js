const { Client } = require('pg');

module.exports = { 
    getSession: () => {
        const client = new Client({
            connectionString: process.env.DATABASE_URL,
        //   ssl: {
        //     rejectUnauthorized: false
        //   }
        });
        client.connect();

        return client
    }
}