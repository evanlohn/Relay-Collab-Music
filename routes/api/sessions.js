
const express = require('express');
const path = require('path');

const router = express.Router();


const pool = require('../../db');
const TIMESTEP = 1;
const STEPS_PER_CHOICE = 30;

// Retrieves the current user session
router.get('/', async (req, res) => {
    const { sessionCode } = req.params;
    const client = await pool.connect();
    
    const sessionQuery = {
        text: 'SELECT * FROM sessions WHERE sessions.id = $1',
        values: [sessionCode],
        rowMode: Array,
    };

    const userQuery = {
        text: 'SELECT * FROM users WHERE sessionId = $1 ORDER BY id',
        values: [sessionCode],
        rowMode: Array,
    };

    let [sessionResult, usersResult] = await Promise.all([client.query(sessionQuery), client.query(userQuery)]);


    if (sessionResult.rows.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
    }
    else if (usersResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid session: no users' });
    }

    if (sessionResult.rows[0].startedAt !== null) {
        const ind = Date.now() - sessionResult.rows[0].startedAt;
        console.log(ind);
    }



    return res.status(200).send(sessionResult.rows[0]);
});

router.get('/101', async (req, res) => {
    console.log('hello');
    res.send('this is user 101 route');

    console.log(process.env.DATABASE_URL);

    const client = await pool.connect();
    
    client.query('SELECT * FROM sessions;', (err, res) => {
      if (err) throw err;
      for (let row of res.rows) {
        console.log(JSON.stringify(row));
      }
      client.end();
    });
    console.log('done');
});

router.post('/create-session', async (req, res) => {
    const client = await pool.connect();
    const query = {
        name: 'create-session',
        text: 'INSERT INTO sessions (body, "createdAt") VALUES (\'{}\', CURRENT_TIMESTAMP) RETURNING id',
        rowMode: Array,
    };

    try {
        const result = await client.query(query);

        res.send({id: result.rows[0].id});
    } finally {
        client && client.release();
    }
});

router.post('/join-session', async (req, res) => {
    const { name, clef, sessionCode } = req.body;
    const client = await pool.connect();
    try {
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
    } finally {
        client && client.release();
    }
});

router.post('/start-session', async (req, res) => {
    const { sessionId } = req.body;
    const client = await pool.connect();

    try {
        const query = {
            text: 'UPDATE sessions SET "startedAt" = CURRENT_TIMESTAMP WHERE id = $1',
            values: [sessionId]
        };

        await client.query(query);
        return res.status(200).send({ message: 'Session started' });
    } finally {
        client && client.release();
    }
});

router.get('/session-status/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    const client = await pool.connect();

    const query = {
        text: 'SELECT "startedAt" FROM sessions WHERE id = $1',
        values: [sessionId]
    };
    try {
        const result = await client.query(query);
        return res.send({ startedAt: result.rows[0].startedAt });

    } catch (err) {
        console.error(err);
        return res.status(500).send({ startedAt: null });
    } finally {
        client && client.release();
    }
});

router.get('/participants/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    const client = await pool.connect();

    const query = {
        text: 'SELECT COUNT(*) FROM users WHERE "sessionId" = $1',
        values: [sessionId]
    };
    try {
        const result = await client.query(query);
        return res.send({ count: result.rows[0].count });

    } catch (err) {
        console.error(err);
        return res.status(500).send({ count: 0 });
    } finally {
        client && client.release();
    }
});


// export the router module so that server.js file can use it
module.exports = router;