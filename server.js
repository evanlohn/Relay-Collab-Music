// fileName : server.js 
// Example using Express.js
const express = require('express');
const favicon = require('serve-favicon');
const path = require('path');

const app = express();

// Place favicon middleware before other middleware and routes
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, "public")));


// Include route files
const sessionsRoute = require('./routes/api/sessions');
const usersRoute = require('./routes/api/users');

// Use routes
app.use('/sessions', sessionsRoute);
app.use('/users', usersRoute);

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

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
