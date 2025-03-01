const express = require('express');
const {
    check,
    body,
    // ...
    validationResult,
  } = require("express-validator");
const router = express.Router();

const utils = require('../utils');

router.post('/create-user',
  body("name").trim().notEmpty().isString().isLength({max: 999}),
  body("clef").isInt({min:0, max:2}),
  body("isHost").isBoolean(),
  body("sessionId").isInt(),
 (req, res) => {
    // name: { type: 'varchar(1000)', notNull: true },
    // clef: { type: 'integer', notNull: true},
    // isHost: { type: 'boolean', notNull: true},
    // sessionId: {
    //   type: 'integer',
    //   notNull: true,
    //   references: '"sessions"',
    //   onDelete: 'cascade',
    // },
    const req_json = JSON.parse(req.body);


    const query = {
        name: 'create-session',
        text: 'INSERT INTO users (name, clef, isHost, sessionId) VALUES ($1, $2, $3, $4)',
        values: [req_json.name, req_json.clef, req_json.isHost, req_json.sessionId],
        rowMode: Array,
    };
    const client = utils.getSession();
    const result = client.query(query);

});



// export the router module so that server.js file can use it
module.exports = router;