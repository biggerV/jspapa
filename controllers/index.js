var config = require('../config');
var nodemailer = require('nodemailer');
var crypto = require('crypto');

var M = require('../models');

module.exports = {

  getTopics: function(req, res, next){
    
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

    M.Topic.find(query, null, {'skip': skip, 'limit': limit, 'sort': {'created': -1}}).exec()
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
