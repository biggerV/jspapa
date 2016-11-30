var config = require('../config');
var nodemailer = require('nodemailer');
var crypto = require('crypto');

var M = require('../models');

module.exports = {

  listTopics: function(req, res, next){
    
    var cid = req.params.id;

    if(cid === "all"){
      var alltype = req.query.type ? "?type="+req.query.type : "";
      res.redirect("/"+alltype);
      return false;
    }
    
    var query;
    if(!cid){
      query = req.query.type ? {"type": req.query.type} : {};
    }else{
      query = req.query.type ? {"cate": cid, "type": req.query.type} : {"cate": cid};
    }

    var cur = req.query.page ? Number(req.query.page) : 1;
    var limit = 15;
    var skip = (cur - 1) * limit;
    var data = {
      'cate': {'id': cid || 'all', 'name': cid ? config.cates[cid] : config.cates.all},
      'type': req.query.type
    };

    M.Topic.find(query, {content:0}, {'skip': skip, 'limit': limit, 'sort': {"sorted": -1}}).exec()
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
      return M.Topic.count(query).exec();
    })
    .then(function(count){
      data.page = {'total': Math.ceil(count/limit), 'count': count, 'cur': cur}
    })
    .then(function(){
      res.render('index', data);
    })
    .catch(function(err){
      console.log(err);
    });
  },

  login: function(req, res, next){
    res.render("login");
  },

  passport: function(req, res, next){
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
    })
    .catch(function(err){
      console.log(err);
    });
  },

  reg: function(req, res, next){
    res.render("reg");
  },

  register: function(req, res, next){
    if(!req.body.name || !req.body.pwd || !req.body.email){
      res.render("reg", {"msg": '账号、密码、邮箱必填'});
      return false;
    }

    //发送邮件
    function sendMail(){
      var smtpConfig = {
          host: config.email.host,
          port: 465,
          secure: true, // use SSL 
          auth: {
              user: config.email.user,
              pass: config.email.pwd
          }
      };
      var transporter = nodemailer.createTransport(smtpConfig);
      var mailOptions = {
        from: '"JSpapa.com" <'+config.email.user+'>',
        to: req.body.email,
        subject: '恭喜您，注册账号成功！--JSpapa.com',
        text: '注册账号成功',
        html: '<p>尊敬的 <b>'+req.body.name+'</b>：</p><p>您已经注册账号成功！欢迎您加入JSpapa.com。</p><p>JSpapa是专业的JS开发者社区，这里聚集了大量的JS开发者，或者对JS有兴趣的开发人员。</p><p>您可以在这里提问、解答问题、发表技术研究、提出技术畅想、结交技术伙伴……</p><p>我们真诚的邀请您来共同维护和发展这个朝气蓬勃的社区。</p><p>祝好。</p><p>--邮件发自<a href="http://jspapa.com"><b>JSpapa.com</b></a></p>' // html body
      };
      transporter.sendMail(mailOptions, function(err, info){
        if(err){
          console.log(err);
          res.render("error", {"msg": err.toString()});
          return;
        }
      });
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
        req.body.created = new Date();
        M.User.create(req.body, function(err, doc){
          if(err){
            console.log(err);
          }else{

            sendMail();

            res.redirect("/regsuc");

            //用户数计数
            M.Site.updateUsers();

            //注册成功积分变动
            M.User.updatePointById(doc._id, "register");

            //注册者消息+1
            M.User.updateMessageById(doc._id);

            //给注册者发送积分变动消息
            M.Message.create({
              sender: {
                "name": "admin"
              },
              addressee: {
                "_id": doc._id,
                "name": doc.name
              },
              content: {
                point: config.pointRules.register,
                reason: "注册成功"
              },
              type: "point"
            });
          }
        });
      }
    })
    .catch(function(err){
      console.log(err);
    });
  },

  regsuc: function(req, res, next){
    res.render("reg-success");
  },

  forgot: function(req, res, next){
    res.render("forgot");
  },

  forget: function(req, res, next){
    if(!req.body.email){
      res.render("forgot", {"msg": "邮箱不能为空"});
      return false;
    }

    //发送邮件
    function sendMail(email, tempwd, cb){
      var smtpConfig = {
          host: config.email.host,
          port: 465,
          secure: true, // use SSL 
          auth: {
              user: config.email.user,
              pass: config.email.pwd
          }
      };
      var transporter = nodemailer.createTransport(smtpConfig);
      var mailOptions = {
        from: '"JSpapa.com" <'+config.email.user+'>',
        to: email,
        subject: '您的密码已经重置',
        text: '密码重置',
        html: '<p>您好：<br>您的密码已经重置为：<b>'+tempwd+'</b><br>建议您可以登录后台修改密码以便记忆。</p><p>如果不是您操作的请忽略或登陆网站修改密码！</p><p>--邮件发自<a href="http://jspapa.com"><b>JSpapa.com</b></a>社区找回密码页面</p>' // html body
      };
      transporter.sendMail(mailOptions, function(err, info){
        if(err){
          console.log(err);
          res.render("error", {"msg": err.toString()});
          return;
        }
        cb();
      });
    }

    M.User.findOne({"email": req.body.email}).exec()
    .then(function(doc){
      if(doc){
        //发送重置密码邮件
        var tempwd = crypto.createHash('md5').update(Math.random().toString()).digest('hex').substr(0,6);

        doc.pwd = crypto.createHash('md5').update(tempwd).digest('hex');

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
    })
    .catch(function(err){
      console.log(err);
    });
  }

}
