if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}
const mysql = require('mysql');
const express =require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('express-flash');
const initializePassport = require('./passport-config');
initializePassport(
    passport, 
    email => users.find(user => {
        return user.email === email
    }),
    id => users.find(user => {
        return user.id === id
    })
    );
const app = express();
const port = 8000;

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
})

db.connect ( err => {
    if(err) throw err;
    else {
        console.log("database connected.")
    }
})
let users=[]
//load userlist at first and push it to users[]
function initUsers(){
    let sql = 'SELECT*FROM userInfo';
    db.query(sql, (err, result) => {
        if(err) throw err;
        else {
            for(i = 0; i < result.length; i++){
               users.push({ 
                id: result[i].id,
                email : result[i].email,
                name : result[i].name,
                password : result[i].password
               })
            }
        }
    })
}
initUsers();
//update every time you get registered
function updateUser(email) {
    let sql = `SELECT*FROM userInfo WHERE email='${email}'`;
    db.query(sql, (err, result)=> {
        if(err) throw err;
        else{
            users.push({
                id: result[0].id,
                email : result[0].email,
                name : result[0].name,
                password : result[0].password
            });
            console.log("update succeeded");
        }
    })
}


app.set('view-engine', "ejs");
app.use(express.urlencoded({extended : false}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true
}))
app.use(flash());
app.use(passport.initialize())
app.use(passport.session());
app.use(methodOverride('_method'))

//routes
app.get('/', checkAuthenticated, (req, res) => {
    console.log(req.session.passport);
    res.render('home.ejs', {name : req.body.name})
}
);

app.get('/register', (req, res) => res.render('register.ejs'))
app.get('/login', checkNotAuthenticated, (req,res) => res.render('login.ejs'))

app.delete('/logout', (req, res) => {
    req.logOut();
    res.redirect('/login');
})
app.post('/register', async (req, res) => {
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        
        //for db
        const {email} = req.body;
        let checkSql = 'SELECT email FROM userInfo WHERE email = ?';
        db.query(checkSql, [email], (err, result) => {
            if (err) throw err;
            else{
                if(result.length > 0) {
                    console.log('registered email')
                    return res.render('register.ejs', {
                    message : "That email is already registered"
                })
            }
                else {

                    let sql = `INSERT INTO userInfo (email, name, password) VALUES ('${req.body.email}', '${req.body.name}', '${hashedPassword}')`
                    let query = db.query(sql, (err, result) => {
                         if(err) throw err;
                         else {
                             console.log(result);
                             updateUser(email);
                             res.redirect('/login');
                }
        })
            }
                }
        }
        )
        
        }
    catch(e){
        if(e) throw e;
        res.redirect('/register');
    }
})
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect : '/',
    successFlash : "Welcome !",
    failureRedirect : '/login',
    failureFlash : true
}))
function checkAuthenticated(req,res,next) {
    if(req.isAuthenticated())
        return next()
    res.redirect('/login')
}
function checkNotAuthenticated(req,res,next) {
    if(req.isAuthenticated())
        res.redirect('/')
    else 
        return next();
}


app.listen(port, () => {
    return console.log("listening...")
})