
const express = require('express');
const path = require('path');

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
    const query = {
        name: 'create-session',
        text: 'INSERT INTO sessions (body) VALUES (\'{}\') RETURNING id',
        rowMode: Array,
    };
    const client = utils.getSession();
    const result = await client.query(query);

    res.send({id: result.rows[0].id});
});

router.post('/join-session', async (req, res) => {
    const { name, clef, sessionCode } = req.body;
    const client = utils.getSession();

    const validClefs = ['treble', 'bass', 'alto'];
    if (! validClefs.includes(clef)) {
        res.status(400).send('Invalid clef');
        return;
    }

    const sessionQuery = {
        text: 'SELECT * FROM sessions WHERE id = $1', // Adjust the query based on your sessions table structure
        values: [sessionCode],
    };

    const sessionResult = await client.query(sessionQuery);
    if (sessionResult.rows.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
    }

    const query = {
        name: 'join-session',
        text: 'INSERT INTO users (name, clef, "isHost", "sessionId") VALUES ($1, $2, $3, $4) RETURNING id',
        values: [name, clef, false, sessionCode],
        rowMode: Array
    };
    
    const result = await client.query(query);

    return res.status(201).send({ message: 'User added successfully', userId: result.rows[0].id });
});

router.get('/users-in-session', (req, res) => {
    // TODO: get num users in session
});


// export the router module so that server.js file can use it
module.exports = router;