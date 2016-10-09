var express = require('express');
var bodyParser = require('body-parser');
var C = require('../controllers/index');

var router = express.Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


//首页-全部主题
router.get('/', C.getTopics);

//首页-栏目
router.get('/cate/:id', C.getTopics);

//登陆页面
router.get('/login', C.login);

//登陆信息提交验证
router.post('/login', C.passport);

//注册页面
router.get('/reg', C.reg);

//提交注册信息
router.post('/reg', C.register);

//注册成功页面
router.get('/regsuc', C.regsuc);

//找回密码页面
router.get('/forgot', C.forgot);

//找回密码
router.post('/forgot', C.forget);



module.exports = router;
