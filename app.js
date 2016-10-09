var config = require('./config');
var express = require('express');
var session = require('express-session');
var mongoose = require('mongoose');

global.db = mongoose.createConnection(config.mongodbUrl);

//routes
var home = require('./routes/index');
var user = require('./routes/user');
var topic = require('./routes/topic');

var app = express();


//模板引擎
app.set('views', './views');
app.set('view engine', 'pug');

//静态文件
app.use(express.static('static'));

app.use(session({
  secret: 'jspapa',
  cookie: {maxAge: 3600000},
  rolling: true,
  resave: true,
  saveUninitialized: true
}));

app.use(function(req, res, next){
  res.locals.siteName = config.siteName;
  res.locals.cates = config.cates;
  res.locals.user = req.session.user;
  next();
});

//routes
app.use('/', home);
app.use('/user', user);
app.use('/topic', topic);


app.listen(3000);