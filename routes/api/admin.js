const express = require('express');
const pool = require('../../db');

const router = express.Router();

router.get('/session/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    const client = await pool.connect();

    try {
        const sessionQuery = {
            text: 'SELECT * FROM sessions WHERE id = $1',
            values: [sessionId]
        };
        const sessionResult = await client.query(sessionQuery);
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const usersQuery = {
            text: 'SELECT id, name, clef, score FROM users WHERE "sessionId" = $1 ORDER BY id',
            values: [sessionId]
        };
        const usersResult = await client.query(usersQuery);

        const decisionsQuery = {
            text: 'SELECT d.*, u.name as chooserName, u2.name as otherUserName FROM decisions d JOIN users u ON d."chooserId" = u.id JOIN users u2 ON d."otherUserId" = u2.id WHERE d."sessionId" = $1 ORDER BY d."decisionMadeAt"',
            values: [sessionId]
        };
        const decisionsResult = await client.query(decisionsQuery);

        return res.send({
            session: sessionResult.rows[0],
            users: usersResult.rows,
            decisions: decisionsResult.rows
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: 'Internal server error' });
    } finally {
        client && client.release();
    }
});


module.exports = router;