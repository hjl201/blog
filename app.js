const express = require('express');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

const app = express();

// 设置 EJS 作为模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));
app.use('/software', express.static(path.join(__dirname, 'software')));

// 解析 POST 请求中的 URL 编码和 JSON 数据
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 配置会话管理
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// 配置文件上传
app.use(fileUpload());

// 读取博客文章数据
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'posts.json')));

// 读取软件数据
const softwareList = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'software.json')));

// 中间件：检查用户是否已登录
function checkAuth(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
}

// 路由：主页，显示所有博客文章
app.get('/', (req, res) => {
    res.render('index', { posts });
});

// 路由：博客文章详情页
app.get('/post/:id', (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (post) {
        res.render('post', { post });
    } else {
        res.status(404).send('Post not found');
    }
});

// 路由：软件发布页，显示所有软件
app.get('/software', (req, res) => {
    res.render('software', { softwareList });
});

// 路由：软件详情页
app.get('/software/:id', (req, res) => {
    const software = softwareList.find(s => s.id === parseInt(req.params.id));
    if (software) {
        res.render('software_detail', { software });
    } else {
        res.status(404).send('Software not found');
    }
});

// 路由：管理员登录页面
app.get('/login', (req, res) => {
    res.render('login');
});

// 路由：处理管理员登录请求
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // 替换成你自己的用户名和密码检查逻辑
    if (username === 'admin' && password === 'password') {
        req.session.loggedIn = true;
        res.redirect('/admin');
    } else {
        res.send('Invalid login credentials');
    }
});

// 路由：管理员页面（上传软件）
app.get('/admin', checkAuth, (req, res) => {
    res.render('admin', { softwareList });
});

// 路由：处理文件上传
app.post('/upload', checkAuth, (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    // 处理文件上传
    let uploadedFile = req.files.file;
    let softwareName = req.body.name;
    let softwareDir = path.join(__dirname, 'software', softwareName);

    // 创建软件目录
    if (!fs.existsSync(softwareDir)) {
        fs.mkdirSync(softwareDir);
    }

    // 保存文件
    let uploadPath = path.join(softwareDir, uploadedFile.name);

    uploadedFile.mv(uploadPath, (err) => {
        if (err) return res.status(500).send(err);

        // 更新软件数据
        const newSoftware = {
            id: softwareList.length + 1,
            name: req.body.name,
            version: req.body.version,
            description: req.body.description,
            fileName: uploadedFile.name,
            releaseDate: new Date().toISOString().split('T')[0]
        };
        softwareList.push(newSoftware);

        // 保存到软件数据文件
        fs.writeFileSync(path.join(__dirname, 'data', 'software.json'), JSON.stringify(softwareList, null, 2));

        res.send('File uploaded successfully!');
    });
});

// 路由：登出
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 设置服务器端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
