
const express = require('express');
const mm = require('@magenta/music/node/music_rnn');
const {
    check,
    body,
    query,
    // ...
    validationResult,
  } = require("express-validator");
const path = require('path');

const router = express.Router();


const pool = require('../../db');
const modelStore = require('../../modelStore');
const userStore = require('../../userStore');
const sessionStore = require('../../sessionStore');

function rchoice (arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function getUserWithScore (userId, client) {
    const userQuery = {
        text: 'SELECT score FROM users WHERE id = $1',
        values: [userId]
    };
    const userResult = await client.query(userQuery);
    if (userResult.rows.length === 0) {
        return res.status(400).send({ message: 'Invalid user' });
    }
    const user = userResult.rows[0];
    if (user.score.length === 0) {
        return res.status(400).send({ message: 'Invalid user score' });
    }
    return user;
}

router.post('/score/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    
    // compare req.body to userStore
    const userScoreStatus = req.body.userScoreStatus;
    const userIds = Object.keys(userScoreStatus);
    if (! userIds.some(userId => userStore[userId] !== userScoreStatus[userId])) {
        const session = sessionStore[sessionId];

        const now = Date.now();
        // in the grace period; no need to send any new data
        if (now - session.lastRequested <= 20000) { return res.send({}); }

        // if it isn't this user's turn, don't send anything
        if (req.body.userId !== session.participants[session.counter]) { return res.send({}); }

        session.lastRequested = now;
        session.counter = (session.counter + 1) % session.participants.length;
        
        const client = await pool.connect();
        try {
            const user = await getUserWithScore(req.body.userId, client);
            if (user.status) {
                // this is a response not a user
                return otherUser;
            }
            // choose a random other user
            const otherUserId = rchoice(userIds.filter((oid)=> parseInt(oid) !== req.body.userId));
            const otherUser = await getUserWithScore(otherUserId, client);
            if (otherUser.status) {
                // this is a response not a user
                return otherUser;
            }

            const modelObj = modelStore[sessionId];
            if (! modelObj || ! modelObj.initialized) {
                return res.status(400).send({ message: 'Model not initialized' });
            }

            const choices = await generateChoices(user, otherUser, modelObj);
            return res.send({ choices, otherUserId });
        } finally {
            client && client.release();
        }
    }

    const client = await pool.connect();
    try {
        const userQuery = {
            text: 'SELECT * FROM users WHERE "sessionId" = $1 ORDER BY id',
            values: [sessionId],
            rowMode: Array,
        };

        const userResult = await client.query(userQuery);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid session: no users' });
        }
        
        const users = userResult.rows;
        users.forEach(user => {
            if (user.score?.length === 0) {
                return res.status(400).json({ message: 'Invalid session: no scores' });
            }
            delete user.createdAt;
            delete user.name;
            user.numSamples = user.score.length;
            user.sample = user.score[user.score.length - 1];
            delete user.score;
        });
        return res.send({ users });
    } finally {
        client && client.release();
    }
});

router.post('/reroll', async (req, res) => {
    const client = await pool.connect();
    try {
        const { chooserId, otherUserId, sessionId } = req.body;
        const user = await getUserWithScore(chooserId, client);
        if (user.status) {
            // this is a response not a user
            return user;
        }

        const otherUser = await getUserWithScore(otherUserId, client);
        if (otherUser.status) {
            // this is a response not a user
            return otherUser;
        }

        const modelObj = modelStore[sessionId];
        if (! modelObj || ! modelObj.initialized) {
            return res.status(400).send({ message: 'Model not initialized' });
        }

        const choices = await generateChoices(user, otherUser, modelObj);
        return res.send({ choices });
    } finally {
        client && client.release();
    }
});

async function generateChoices(user, otherUser, modelObj) {
    let choices = [];

    // push one or two of our own samples into choices
    const scoreChoices = user.score.filter((sample) => !! sample.notes);
    if (scoreChoices.length > 0) {
        // add your current sample to the choices
        choices.push(scoreChoices.pop());
    }
    if (scoreChoices.length > 0) {
        // add a random previous sample to the choices
        choices.push(rchoice(scoreChoices));
    }
    if (Math.random() < 0.5) {
        choices.push({
            type: Math.random() < 0.5 ? "EMPTY" : "IMPROVISE"
        });
    }
    
    const otherUserScore = otherUser.score.filter((sample) => sample.notes);
    if (otherUserScore.length === 0) {
        return choices;
    }
    const lastSample = otherUserScore.pop();
    for (let i = 0; i < (5 - choices.length); i += 1) {
        const sample = await modelObj.model.continueSequence(lastSample, 16, 1.5);
        keepSampleInValidRange(sample); // TODO: maybe save the actual choice in the db
        choices.push(sample);
    }
    return choices;
}

function keepSampleInValidRange(sample, minPitch = 48, maxPitch = 83) {
    for (let note of sample.notes) {
        while (note.pitch > maxPitch) {
            note.pitch -= 12;
        }
        while (note.pitch < minPitch) {
            note.pitch += 12;
        }
    } 
}

// TODO: prevent those sneaky decision spoofers from making decisions
// when it isn't their turn >:(
router.post('/make-decision', async (req, res) => {
    const client = await pool.connect();
    try {
        const { chooserId, otherUserId, choiceInd, choices, rerolls } = req.body;
        const userQuery = {
            text: 'SELECT score, "sessionId" FROM users WHERE id = $1',
            values: [otherUserId]
        };
        const userResult = await client.query(userQuery);
        if (userResult.rows.length === 0) {
            return res.status(400).send({ message: 'Invalid user' });
        }
        const user = userResult.rows[0];
        const sessionId = user.sessionId;
        user.score.push(choices[choiceInd]);

        const query = {
            text: 'UPDATE users SET score = $1 WHERE id = $2',
            values: [JSON.stringify(user.score), otherUserId]
        };
        await client.query(query);
        userStore[otherUserId] = user.score.length;

        const decisionQuery = {
            text: 'INSERT INTO decisions ("sessionId", "chooserId", "otherUserId", "choiceOptions", "choiceIndex", rerolls, "decisionMadeAt") VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)',
            values: [sessionId, chooserId, otherUserId, JSON.stringify(choices), choiceInd, JSON.stringify(rerolls) ]
        }
        await client.query(decisionQuery);

        return res.status(200).send({ message: 'Choice submitted' });
    } finally {
        client && client.release();
    }
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
        const sessionId = result.rows[0].id;
        modelStore[sessionId] = new mmModel();

        res.send({id: sessionId});
    } finally {
        client && client.release();
    }
});

router.post('/join-session',
    body("name").trim().notEmpty().isString().isLength({max: 999}),
    body("clef").isString(),
    body("sessionCode").isInt(),
async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        res.status(400).send(JSON.stringify(result.mapped()));
        return;
    }
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
        if (sessionResult.rows[0].startedAt) {
            return res.status(400).json({ message: 'Session has already started' });
        }

        const query = {
            name: 'join-session',
            text: 'INSERT INTO users (name, clef, "sessionId", score) VALUES ($1, $2, $3, $4) RETURNING id',
            values: [name, clef, sessionCode, []],
            rowMode: Array
        };
        
        const result = await client.query(query);
        return res.status(201).send({ message: 'User added successfully', userId: result.rows[0].id });
    } finally {
        client && client.release();
    }
});

const QUANTIZED_TWINKLE_TWINKLE = {
    notes: [
      { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 2 }, // 0.0 to 0.5
      { pitch: 60, quantizedStartStep: 2, quantizedEndStep: 4 }, // 0.5 to 1.0
      { pitch: 67, quantizedStartStep: 4, quantizedEndStep: 6 }, // 1.0 to 1.5
      { pitch: 67, quantizedStartStep: 6, quantizedEndStep: 8 }, // 1.5 to 2.0
      { pitch: 69, quantizedStartStep: 8, quantizedEndStep: 10 }, // 2.0 to 2.5
      { pitch: 69, quantizedStartStep: 10, quantizedEndStep: 12 }, // 2.5 to 3.0
      { pitch: 67, quantizedStartStep: 12, quantizedEndStep: 16 }, // 3.0 to 4.0
      { pitch: 65, quantizedStartStep: 16, quantizedEndStep: 18 }, // 4.0 to 4.5
      { pitch: 65, quantizedStartStep: 18, quantizedEndStep: 20 }, // 4.5 to 5.0
      { pitch: 64, quantizedStartStep: 20, quantizedEndStep: 22 }, // 5.0 to 5.5
      { pitch: 64, quantizedStartStep: 22, quantizedEndStep: 24 }, // 5.5 to 6.0
      { pitch: 62, quantizedStartStep: 24, quantizedEndStep: 26 }, // 6.0 to 6.5
      { pitch: 62, quantizedStartStep: 26, quantizedEndStep: 28 }, // 6.5 to 7.0
      { pitch: 60, quantizedStartStep: 28, quantizedEndStep: 32 }, // 7.0 to 8.0  
    ],
    totalQuantizedSteps: 32, // total time converted to quantized steps
    quantizationInfo: {
        stepsPerQuarter: 4, // Number of steps per quarter note
        quantizePost: true,  // Consider if you want to enable quantization of MIDI output
    },
    totalTime: 8.0
  };

router.post('/start-session', async (req, res) => {
    const { sessionId } = req.body;
    const client = await pool.connect();

    try {
        // query to get the number of users in the session
        const userQuery = {
            text: 'SELECT id FROM users WHERE "sessionId" = $1',
            values: [sessionId]
        };
        const userResult = await client.query(userQuery);
        if (userResult.rows.length === 0) {
            return res.status(400).send({ message: 'No users in session' });
        }

        const modelObj = modelStore[sessionId];
        if (! modelObj || ! modelObj.initialized) {
            return res.status(400).send({ message: 'Model not initialized' });  
        }

        sessionStore[sessionId] = { 
            counter: 0,
            lastRequested: Date.now(),
            participants: userResult.rows.map(user => user.id)
        };

        const updatePromises = userResult.rows.map(user => {
            return modelObj.model.continueSequence(QUANTIZED_TWINKLE_TWINKLE, 16, 0.5).then(sample => {
                keepSampleInValidRange(sample);
                const query = {
                    text: 'UPDATE users SET score = $1 WHERE id = $2',
                    values: [JSON.stringify([sample]), user.id]
                };
                return client.query(query);
            });
        });
        await Promise.all(updatePromises);
        userResult.rows.forEach(user => {
            userStore[user.id] = 1;
        });

        const startQuery = {
            text: 'UPDATE sessions SET "startedAt" = CURRENT_TIMESTAMP WHERE id = $1',
            values: [sessionId]
        };
        await client.query(startQuery);
        return res.status(200).send({ message: 'Session started' });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: 'Internal server error' });
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
        return res.send({ 
            startedAt: result.rows[0].startedAt
         });

    } catch (err) {
        console.error(err);
        return res.status(500).send({ startedAt: null });
    } finally {
        client && client.release();
    }
});

router.get('/session-data/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    const client = await pool.connect();

    const query = {
        text: 'SELECT COUNT(*) FROM users WHERE "sessionId" = $1',
        values: [sessionId]
    };
    try {
        const result = await client.query(query);
        return res.send({ 
            count: result.rows[0].count,
            modelInitialized: modelStore[sessionId]?.initialized
        });

    } catch (err) {
        console.error(err);
        return res.status(500).send({ count: 0 });
    } finally {
        client && client.release();
    }
});

router.get('/participants/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    const client = await pool.connect();

    const query = {
        text: 'SELECT * FROM users WHERE "sessionId" = $1 ORDER BY id',
        values: [sessionId]
    };
    try {
        const result = await client.query(query);
        return res.send(result.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).send([]);
    } finally {
        client && client.release();
    }
});

class mmModel {
    constructor() {
        this.model = new mm.MusicRNN(
            'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
        this.initialized = false;
        
        this.model.initialize().then(() => {
            this.model.spec.dataConverter.args.minPitch = 1;
            this.model.spec.dataConverter.args.maxPitch = 127;
            this.initialized = true;
        });
    }
}


// export the router module so that server.js file can use it
module.exports = router;