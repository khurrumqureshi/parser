var express = require('express');
var http = require('http');
var logger = require('morgan');
var questions = require('./questions.json');
var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');
var cache = require('memory-cache');
var Repeat = require('repeat');
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    host: 'smtp.sparkpostmail.com',
    port: 587,
    auth: {
        user: 'SMTP_Injection',
        pass: '87f55a9c87ee222d3e7021a08a6a7ea614ea50be'
    }
});

var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));


var server = http.createServer(app);

// Start Express server
server.listen(3040, '', function () {
    console.log('------------------------------------------');
    console.log('Parser - > %s', "http://localhost :3040");
    console.log('------------------------------------------');
    Repeat(function (done) {
        parseQuestions(function () {
            done();
        })
    })
        .every(5, 'minutes')
        .start.now();
});

function parseQuestions(callback) {
    var cacheQuestions = cache.get('questions');
    var changeStatusQuestion = [];
    async.forEachSeries(questions, function (question, cb) {
        request.get({url: question.url}, function (e, r, html) {
            if (e) {
                cb();
            }
            else {
                var $ = cheerio.load(html);
                var data = $('.answer_count').text();
                var arr = data ? data.split(' ') : [];
                question.answerCount = arr && arr.length > 0 ? _.parseInt(arr[0]) : 0;
                var cacheQuestion = _.find(cacheQuestions, {code: question.code}) || {};
                console.log('Cache Count -> ' + cacheQuestion.answerCount + ' Current Count -> ' + question.answerCount);
                if (question.answerCount > cacheQuestion.answerCount) {
                    changeStatusQuestion.push(question);
                }
                cb();
            }
        });
    }, function (err, result) {
        cache.put('questions', _.cloneDeep(questions));
        console.log(changeStatusQuestion);
        if(changeStatusQuestion.length > 0){
            sendEmail(changeStatusQuestion);
        }
        callback();
    })
}

function sendEmail(data) {
    // setup email data with unicode symbols
    var html = '';
    _.forEach(data, function (obj) {
        html += obj.url + '<br><br>';
    });
    var mailOptions = {
        from: 'sandyrobertsreviews@sparkpostbox.com',
        to: 'mkhurrumq@gmail.com, mafskhan2013@gmail.com',
        subject: 'Quora Update - New Answers',
        text: 'Hello,',
        html: html
    };

// send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
}

