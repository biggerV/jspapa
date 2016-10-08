var config = require('../config');
var express = require('express');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var crypto = require('crypto');

var M = require('../models');

var router = express.Router();

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


//首页-全部主题
router.get('/', function(req, res, next){
  var type = req.query.type ? {'type': req.query.type} : {};

  var cur = req.query.page ? Number(req.query.page) : 1;
  var limit = 15;
  var skip = (cur - 1) * limit;
  var data = {
    'cate': {'id': 'all', 'name': config.cates.all},
    'type': req.query.type
  };

  M.Topic.find(type, null, {'skip': skip, 'limit': limit, 'sort': {'created': -1}}).exec()
  .then(function(topicDocs){
    data.topics = topicDocs;
  })
  .then(function(){
    return M.Site.findOne({'name': 'counter'}).exec();
  })
  .then(function(siteCounterDoc){
    data.counter = siteCounterDoc;
  })
  .then(function(){
    return M.Topic.count(type).exec();
  })
  .then(function(count){
    data.page = {'total': Math.ceil(count/limit), 'count': count, 'cur': cur}
  })
  .then(function(){
    res.render('index', data);
  });

});


//首页-栏目
router.get('/cate/:id', function(req, res, next){
  var cid = req.params.id;
  var type = req.query.type ? {"cate": cid, "type": req.query.type} : {"cate": cid};

  var cur = req.query.page ? Number(req.query.page) : 1;
  var limit = 15;
  var skip = (cur - 1) * limit;
  var data = {
    'cate': {'id': cid, 'name': config.cates[cid]},
    'type': req.query.type
  };

  if(cid === "all"){
    var alltype = req.query.type ? "?type=good" : "";
    res.redirect("/"+alltype);
    return false;
  }

  M.Topic.find(type, null, {'skip': skip, 'limit': limit, 'sort': {'created': -1}}).exec()
  .then(function(topicDocs){
    data.topics = topicDocs;
  })
  .then(function(){
    return M.Site.findOne({'name': 'counter'}).exec();
  })
  .then(function(siteCounterDoc){
    data.counter = siteCounterDoc;
  })
  .then(function(){
    return M.Topic.count(type).exec();
  })
  .then(function(count){
    data.page = {'total': Math.ceil(count/limit), 'count': count, 'cur': cur}
  })
  .then(function(){
    res.render('index', data);
  });

});


//登陆页面
router.get('/login', function(req, res){
  res.render("login");
});

//登陆信息提交
router.post('/login', function(req, res){

    var uPwd = crypto.createHash('md5').update(req.body.pwd).digest('hex');

    if(!req.body.name || !req.body.pwd){
      res.render("login", {"msg": "用户名或密码不能为空"});
      return;
    }

    M.User.findOne({"name": req.body.name, "pwd": uPwd}).exec()
    .then(function(result){
      if(result){
        req.session.user = result;
        res.redirect(req.session.lastpage || "/user/"+result.name);
      }else{
        res.render("login", {"msg": "用户名或密码错误"});
      }
    });
  
});


//注册页面
router.get('/reg', function(req, res){
  res.render("reg");
});

//提交注册信息
router.post('/reg', function(req, res){

  if(!req.body.name || !req.body.pwd || !req.body.email){
    res.render("reg", {"msg": '账号、密码、邮箱必填'});
    return false;
  }

  M.User.findOne({"$or": [{"name": req.body.name}, {"email": req.body.email}]}).exec()
  .then(function(result){
    if(result){
      var msg = "";
      if(result.name === req.body.name){
        msg = req.body.name+" 用户名已被注册";
      }else{
        msg = req.body.email+" 邮箱已被注册";
      }
      res.render("reg", {"msg": msg});
    }else{
      req.body.pwd = crypto.createHash('md5').update(req.body.pwd).digest('hex');
      M.User.create(req.body, function(err){
        if(err){
          console.log(err);
        }else{
          res.redirect("/regsuc");

          //用户数计数
          M.Site.updateUsers();
        }
      });
    }
  });

});


//注册成功页面
router.get('/regsuc', function(req, res){

  res.render("reg-success");
});

//找回密码页面
router.get('/forgot', function(req, res){

  res.render("forgot");
});

//找回密码
router.post('/forgot', function(req, res){

  if(!req.body.email){
    res.render("forgot", {"msg": "邮箱不能为空"});
    return false;
  }

  //发送邮件
  function sendMail(email, tempwd, cb){
    var transporter = nodemailer.createTransport('smtps://'+config.email.user+'%40qq.com:'+config.email.pwd+'@smtp.'+config.email.host);
    var mailOptions = {
      from: '"JSpapa.com" <'+config.email.user+'@'+config.email.host+'>',
      to: email,
      subject: '您的密码已经重置',
      text: '密码重置',
      html: '<p>您好：<br>您的密码已经重置为：<b>'+tempwd+'</b><br>建议您可以登录后台修改密码以便记忆。</p><p>如果不是您操作的请忽略或登陆网站修改密码！</p><p>--邮件发自<a href="http://jspapa.com"><b>JSpapa.com</b></a>社区找回密码页面</p>' // html body
    };
    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        return console.log(error);
        res.render("error", {"msg": error});
      }
      cb();
    });
  }

  M.User.findOne({"email": req.body.email}).exec()
  .then(function(doc){
    if(doc){
      //发送重置密码邮件
      var tempwd = crypto.createHash('md5').update(Math.random().toString()).digest('hex').substr(0,6);

      doc.pwd = tempwd;

      doc.save(function(err, result){
        if(err){
          return console.log(err);
        }

        sendMail(req.body.email, tempwd, function(){
          res.render("forgot", {"msg": "已发送重置密码链接至邮箱 "+req.body.email});
        });
      });
      
    }else{
      res.render("forgot", {"msg": req.body.email+" 邮箱未注册"});
    }
  });

});



module.exports = router;
