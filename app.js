var config = require('./config');
var express = require('express');
var session = require('express-session');
var mongoose = require('mongoose');

var fs = require('fs');
var http = require('http');
var https = require('https');
var credentials = {key: fs.readFileSync('./your.key', 'utf8'), cert: fs.readFileSync('./your.crt', 'utf8')};

global.db = mongoose.createConnection(config.mongodbUrl);

//routes
var home = require('./routes/index');
var user = require('./routes/user');
var topic = require('./routes/topic');
var tool = require('./routes/tool');

var apiRoutes = require('./api/v1/routes');

//app
var app = express();

//模板引擎
app.set('views', './views');
app.set('view engine', 'pug');

//静态文件
app.use(express.static('static'));
app.use(express.static(config.uploadPath));
app.use(express.static('vue'));

app.use(session({
  secret: 'jspapa',
  cookie: {maxAge: 3600000},
  rolling: true,
  resave: true,
  saveUninitialized: true
}));

app.use(function(req, res, next){
  if(req.protocol == "http"){
    res.redirect("https://"+req.hostname+req.originalUrl);
    return;
  }
  res.locals.siteName = config.siteName;
  res.locals.cates = config.cates;
  res.locals.user = req.session.user;
  next();
});

//routes
app.use('/', home);
app.use('/user', user);
app.use('/topic', topic);
app.use('/tool', tool);

app.use('/api/v1', apiRoutes);

//404
app.get("*", function(req, res){
  res.render("error", {msg: "404，未找到页面"});
});


var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80, function() {
  console.log("httpServer is OK");
});
httpsServer.listen(443, function() {
  console.log("httpsServer is OK");
});
//app.listen(80);