var config = {
  "mongodbUrl": "mongodb:",

  "domain": "www.jspapa.com",
  "siteName": "JSpapa.com",

  "uploadPath": "",

  "cates": {                //网站栏目
    "all": "全部",
    "js": "JavaScript",
    "nodejs": "Node.js",
    "jquery": "jQuery",
    "h5": "HTML5",
    "wx": "微信开发",
    "job": "招聘",
    "career": "职业生涯"
  },

  "email": {                //系统邮件发送
    "pwd": "",
    "user": "",
    "host": "",
    "smtp": ""
  },

  "pointRules": {
    "register": 10,         //注册成功
    "publishTopic": 3,      //发布一个新主题
    "topicTop": 50,         //主题被置顶
    "topicGood": 30,        //主题被加精
    "commentTopic": 1,      //评论主题
    "perfectInfo": 30,      //完善个人信息

    "delTopic": -10,        //主题被删除
    "sendPrivateMsg": -5,   //发送私信
    "commentSpam": -5,       //垃圾评论*
    "noPerfectInfo": -30     //取消完善个人信息
  }
}

module.exports = config;