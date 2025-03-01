
const express = require('express');

const router = express.Router();

const utils = require('../utils');

// Define a route
router.get('/', (req, res) => {
    res.send('this is user route');
    console.log('hi');
});

router.get('/101', (req, res) => {
    console.log('hello');
    res.send('this is user 101 route');

    console.log(process.env.DATABASE_URL);

    const client = utils.getSession();
    
    client.query('SELECT * FROM sessions;', (err, res) => {
      if (err) throw err;
      for (let row of res.rows) {
        console.log(JSON.stringify(row));
      }
      client.end();
    });
    console.log('done');
});

router.get('/102', (req, res) => {
    res.send('this is user 102 route');
});

router.post('/create-session', async (req, res) => {
    console.log('yo');
    const query = {
        name: 'create-session',
        text: 'INSERT INTO sessions (body) VALUES (\'{}\') RETURNING id',
        rowMode: Array,
    };
    const client = utils.getSession();
    const result = await client.query(query);
    console.log('id');
    console.log(result);

    res.send({id: result.rows[0].id});
});

router.get('/users-in-session', (req, res) => {
    // TODO: get num users in session
})


// export the router module so that server.js file can use it
module.exports = router;