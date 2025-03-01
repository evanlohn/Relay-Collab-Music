
const express = require('express');
const router = express.Router();

// Define a route
router.get('/', (req, res) => {
    res.send('this is user route');
    console.log('hi');
});

router.get('/101', (req, res) => {
    res.send('this is user 101 route');
});

router.get('/102', (req, res) => {
    res.send('this is user 102 route');
});

// export the router module so that server.js file can use it
module.exports = router;