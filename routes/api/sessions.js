
const express = require('express');
const path = require('path');

const router = express.Router();

const utils = require('../utils');

const pool = require('../../db');

router.post('/create-session', async (req, res) => {
    const client = await pool.connect();
    const query = {
        name: 'create-session',
        text: 'INSERT INTO sessions (body, createdAt) VALUES (\'{}\', CURRENT_TIMESTAMP) RETURNING id',
        rowMode: Array,
    };

    try {
        const client = utils.getSession();
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