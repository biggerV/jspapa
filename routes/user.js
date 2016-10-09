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
router.post('/:name/setting', C.uploadAvatar, C.updateSetting);

//退出登录
router.get('/:name/logout', C.logout);


module.exports = router;
