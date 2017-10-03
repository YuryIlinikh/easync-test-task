var system = require('system');
var p = require('webpage');

/**
 * прасим логин/пароль
 * @returns {*}
 */
function parseInput() {
    var useHelp = 'Usage: npm start \'{"login":"<login>", "password": "<password>"}\'';
    var exHelp = 'Example: npm start \'{"login":"yuryilinikh@gmail.com", "password": "qwertyui"}\'';
    var argv = system.args;
    if (argv.length !== 2) {
        throw new Error(
            'Incorrect arguments.'
            + "\n" + useHelp + "\n" + exHelp
        );
    }
    var args = null;
    try {
        args = JSON.parse(argv[1]);
    } catch (e) {
        var msg = 'Incorrect arguments: "' + e.message + '"';
        msg += "\n" + useHelp + "\n" + exHelp;
        throw new Error(msg);
    }
    return args
}

/**
 * wrapper чтобы пробрасиывать аргументы в page.evaluate
 * @param page
 * @param func
 * @returns {mixed|Object}
 */
function evaluate(page, func) {
    var args = [].slice.call(arguments, 2);
    var fn = "function() { return (" + func.toString() + ").apply(this, " + JSON.stringify(args) + ");}";
    return page.evaluate(fn);
}

/**
 * первый запрос, чтоб заполнились все нужные поля формы
 * @param page
 * @param cb
 */
function firstGetReq(page, cb) {
    page.open('https://www.topcashback.co.uk/logon', function (status) {
        if (status !== 'success') {
            return cb('FAIL to load the address https://www.topcashback.co.uk/logon', null);
        } else {
            cb(null, null);
        }
    });
}

/**
 * заполнение и отправка формы логина
 * @param page
 * @param args
 * @param cb
 */
function fillAndSubmitForm(page, args, cb) {
     page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
        evaluate(page, function (formData) {
            document.getElementById('ctl00_GeckoOneColPrimary_Login_txtEmail').value = formData.login;
            document.getElementById('ctl00_GeckoOneColPrimary_Login_txtPassword').value = formData.password;
            $('#ctl00_GeckoOneColPrimary_Login_Loginbtn').click();
        }, args);
        cb(null);
    });
}

/**
 * парсит результрующую страничку и возвращает результат (err, authorized)
 * @param page
 * @param cb
 */
function getLoginResult(page, cb) {
    page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {
        var result = page.evaluate(function () {
            var errEl = $('.gecko-login-error');
            if (errEl) {
                errEl = errEl.text();
            }
            return {
                err: errEl,
                authorized: !!document.getElementById('ctl00_ctl22_hypAccount')
            };
        });
        cb(result.err, result.authorized);
    });
}

function app() {
    var args = null;
    try {
        args = parseInput();
    } catch (e) {
        console.error(e.message);
        phantom.exit();
        return;
    }
    var page = p.create();

    // прячем ошибки js в браузере
    page.onError = function (msg, trace) {
        var msgStack = ['ERROR: ' + msg];
        if (trace && trace.length) {
            msgStack.push('TRACE:');
            trace.forEach(function (t) {
                msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
            });
        }
        // console.error(msgStack.join('\n'));
    };
    // прячем ошибки js в браузере
    page.onConsoleMessage = function (msg) {
        // console.log(msg);
    };
    // нужно для отладки
    // page.onLoadStarted = function () {
    //     console.log("load started");
    // };
    // page.onLoadFinished = function () {
    //     console.log("load finished");
    // };
    var t = Date.now();
    var onFirstReq = function (err) {
        if (err) {
            console.error(err);
            return phantom.exit();
        } else {
            fillAndSubmitForm(page, args, function() {
                // ждем пока pahntomjs догрузит страничку
                setTimeout(function () {
                    getLoginResult(page, function(err, authorized) {
                        // делает скрин залогиненной странички
                        // page.render("nextPage.png");
                        t = Date.now() - t;
                        var res = { err: err, authorized: authorized};
                        var jsonRes = JSON.stringify(res);
                        console.log(jsonRes);
                        phantom.exit();
                    });
                }, 5000);
            });
        }
    };
    firstGetReq(page, onFirstReq);
}

app();