var config = require('../config');
var express = require('express');
var mongodb = require('mongodb');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var crypto = require('crypto');

var router = express.Router();
var MongoClient = mongodb.MongoClient;

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


//首页-全部主题
router.get('/', function(req, res, next){
  var type = req.query.type ? {"type": req.query.type} : {};

  var cur = req.query.page ? Number(req.query.page) : 1;
  var limit = 15;
  var skip = (cur - 1) * limit;
  var total = 0;

  MongoClient.connect(config.mongodbUrl, function(err, db) {
    var topic = db.collection('topic');
    var site = db.collection('site');

    topic.count(type, function(err, count){
      total = Math.ceil(count/limit);
      topic.find(type).skip(skip).limit(limit).sort({"created": -1}).toArray(function(err, topicResult){
        site.findOne({"name": "counter"}, function(err, siteResult){
          res.render('index', {"topics": topicResult, "page": {"total": total, "count": count, "cur": cur}, "cate": {"id": "all", "name": config.cates.all}, "counter": siteResult, "type": req.query.type });
          db.close();
        });
      });
    });

  });


});


//首页-栏目
router.get('/cate/:id', function(req, res, next){
  var cid = req.params.id;
  var type = req.query.type ? {"cate": cid, "type": req.query.type} : {"cate": cid};

  var cur = req.query.page ? Number(req.query.page) : 1;
  var limit = 15;
  var skip = (cur - 1) * limit;
  var total = 0;

  if(cid === "all"){
    var alltype = req.query.type ? "?type=good" : "";
    res.redirect("/"+alltype);
    return false;
  }

  MongoClient.connect(config.mongodbUrl, function(err, db) {
    var topic = db.collection('topic');
    var site = db.collection('site');

    topic.count(type,function(err, count){
      total = Math.ceil(count/limit);
      topic.find(type).sort({"created": -1}).skip(skip).limit(limit).toArray(function(err, topicResult){
        site.findOne({"name": "counter"}, function(err, siteResult){
          res.render('index', {"topics": topicResult, "page": {"total": total, "count": count, "cur": cur}, "cate": {"id": cid, "name": config.cates[cid]}, "counter": siteResult, "type": req.query.type});
          db.close();
        });
      });
    });

  });


});


//登陆页面
router.get('/login', function(req, res){
  res.render("login");
});

//登陆信息提交
router.post('/login', function(req, res){
  
  MongoClient.connect(config.mongodbUrl, function(err, db){
    var collection = db.collection("user");
    var uPwd = crypto.createHash('md5').update(req.body.pwd).digest('hex');

    if(req.body.name && req.body.pwd){
      collection.findOne({"name": req.body.name, "pwd": uPwd}, function(err, result){
        if(err){
          console.log(err);
        }else{
          if(result){
            req.session.user = result;
            res.redirect(req.session.lastpage || "/user/"+result.name);
          }else{
            res.render("login", {"msg": "用户名或密码错误"});
          }
          db.close();
        }
      });
    }else{
      res.render("login", {"msg": "用户名或密码不能为空"});
    }

  });
  
});


//注册页面
router.get('/reg', function(req, res){
  res.render("reg");
});

//提交注册信息
router.post('/reg', function(req, res){

  MongoClient.connect(config.mongodbUrl, function(err, db) {
    var user = db.collection('user');
    var site = db.collection("site");
    var mirror = {"name": "姓名", "pwd": "密码", "email": "邮件"};

    for(var k in req.body){
      if(!req.body[k]){
        res.render("reg", {"msg": mirror[k]+" 为必填"});
        return false;
      }
    }

    user.findOne({"$or": [{"name": req.body.name}, {"email": req.body.email}]}, function(err, result){
      if(err){
        console.log(err);
      }else{
        if(result){
          var msg = "";
          if(result.name == req.body.name){
            msg = req.body.name+" 用户名已被注册";
          }else{
            msg = req.body.email+" 邮箱已被注册";
          }

          db.close();
          res.render("reg", {"msg": msg});

        }else{
          req.body.pwd = crypto.createHash('md5').update(req.body.pwd).digest('hex');
          req.body.created = new Date();
          req.body.topics = [];
          req.body.replies = [];

          user.insert(req.body, function(err, result){
            if(err){
              console.log(err);
            }else{
              res.redirect("/regsuc");

              //注册用户数计数器
              site.updateOne({"name": "counter"}, {"$inc": {"users": 1}}, function(err, siteResult){
                if(err){
                  console.log(err);
                }else{
                  db.close();
                }
              });

            }
          });
        }
      }
    });

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

  //生成密码
  function tempwd(){
    return crypto.createHash('md5').update(Math.random().toString()).digest('hex').substr(0,6);
  }

  //发送邮件
  function sendMail(email, tempwd, cb){
    var transporter = nodemailer.createTransport('smtps://'+config.email.user+'%40qq.com:'+config.email.pwd+'@smtp.'+config.email.host);
    var mailOptions = {
      from: '"JSpapa.com" <'+config.email.user+'@'+config.email.host+'>', // sender address
      to: email, // list of receivers
      subject: '您的密码已经重置',
      text: '密码重置', // plaintext body
      html: '<p>您好：<br>您的密码已经重置为：<b>'+tempwd+'</b><br>建议您可以登录后台修改密码以便记忆。</p><p>如果不是您操作的请忽略或登陆网站修改密码！</p><p>--邮件发自<a href="http://jspapa.com"><b>JSpapa.com</b></a>社区找回密码页面</p>' // html body
    };
    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        return console.log(error);
      }
      cb();
      //console.log('Message sent: ' + info.response);
    });
  }

  //更新密码到数据库
  function updatePwd(collection, tempwd, cb){
    var pwd = crypto.createHash('md5').update(tempwd).digest('hex');
    collection.updateOne({"email": req.body.email}, {"$set": {"pwd": pwd}}, function(err, result){
      if(err){
        console.log(err);
      }else{
        cb();
      }
      
    });
  }

  MongoClient.connect(config.mongodbUrl, function(err, db){
    var user = db.collection("user");

    user.findOne({"email": req.body.email}, function(err, result){
      if(err){
        console.log(err);
      }else{
        if(result){
          //发送重置密码邮件
          var pwd = tempwd();

          updatePwd(user, pwd, function(){
            sendMail(req.body.email, pwd, function(){
              res.render("forgot", {"msg": "已发送重置密码链接至邮箱 "+req.body.email});
            });
          });
          
        }else{
          res.render("forgot", {"msg": req.body.email+" 邮箱未注册"});
        }
        db.close();
      }
    });
  });

  
});



module.exports = router;
