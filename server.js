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

// Use routes
app.use('/sessions', sessionsRoute);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

const port = process.env.PORT || 3000; // You can use environment variables for port configuration
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
