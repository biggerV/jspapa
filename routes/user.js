var express = require('express');
var bodyParser = require('body-parser');
var C = require('../controllers/user');

var router = express.Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

//是否登陆
router.use(C.isLogin);

//用户个人中心首页
router.get('/:name', C.home);

//用户主题列表
router.get('/:name/topics', C.topics);

//信息设置页面
router.get('/:name/setting', C.setting);

//信息设置保存
router.post('/:name/setting', C.updateSetting);

//退出登录
router.get('/:name/logout', C.logout);

//上传图片接口
router.post('/upload/', C.uploadPicSet, C.uploadPic);

//消息列表
router.get('/:name/message', C.message);

//消息列表
router.get('/:name/message/:id', C.showMessage);

//发送私信
router.get('/:name/privatemsg', C.privateMessage);
router.post('/:name/privatemsg', C.privateMsg);

module.exports = router;
