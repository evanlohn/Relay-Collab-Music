// fileName : server.js 
// Example using Express.js
const express = require('express');
const favicon = require('serve-favicon');
const path = require('path');

const app = express();



// Place favicon middleware before other middleware and routes
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Set the directory where your EJS templates (views) are located
app.set('views', path.join(__dirname, 'views'));


// Include route files
const sessionsRoute = require('./routes/api/sessions');
const adminRoute = require('./routes/api/admin');


// Use routes
app.use('/sessions', sessionsRoute);
app.use('/admin', adminRoute);

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get('/start/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    res.render('startSession', { sessionId });
});

app.get('/join', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "joinSession.html"));
});

app.get('/waitingRoom/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const userId = req.query.userId;
    res.render('waitingRoom', { sessionId, userId });
});

app.get('/session/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const userId = req.query.userId;
    
    res.render('session', { 
        sessionId: sessionId, 
        userId: userId | null });
});

app.get('/summary', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// app.delete('/', (req, res) => {
//     const client = utils.getSession();

//     // could do smth like this if we change the endpoint and make it a POST
//     // probably should do legit auth if we care tho
//     // console.log(req);
//     // const body = req.body;

//     // if (body.adminKey != process.env.ADMIN_KEY) {
//     //     res.sendStatus(401);
//     //     return;
//     // }

//     client.query('TRUNCATE sessions CASCADE;', (err, res) => {
//       if (err) throw err;
//       client.end();
//     });
//     res.sendStatus(200);
// });

const port = process.env.PORT || 3000; // You can use environment variables for port configuration
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// example endpoint

// example of getting response from the backend
//
// const response = await fetch('http://localhost:3000/sessions/create-session', {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify({})
// });
// const parsed = await response.json();
// console.log(parsed);



// For cleaning up the db
// const response = await fetch('http://localhost:3000/', {
//     method: 'DELETE',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify({adminKey: process.env.ADMIN_KEY})
// });
// console.log(response.status);
