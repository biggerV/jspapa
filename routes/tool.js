var express = require('express');
var router = express.Router();
var C = require('../controllers/tool');

router.get('/alphabet', C.alphabet);

module.exports = router;