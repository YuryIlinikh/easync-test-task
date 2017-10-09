const request = require('request');
const async = require('async');
const cheerio = require('cheerio')
// const Agent = require('socks5-http-client/lib/Agent');
const proxyOpts = {
    // agentClass: Agent,
    // agentOptions: {
    //     socksHost: '127.0.0.1', // Defaults to 'localhost'.
    //     socksPort: 8888 // Defaults to 1080.
    // }
    proxy: 'http://127.0.0.1:8888',
    strictSSL: false
}

/**
 * прасим логин/пароль
 * @returns {*}
 */
function parseInput() {
    const useHelp = 'Usage: node ./native.js \'{"login":"<login>", "password": "<password>"}\'';
    const exHelp = 'Example: node ./native.js \'{"login":"yuryilinikh@gmail.com", "password": "qwertyui"}\'';
    let argv = process.argv;
    if (argv.length !== 3) {
        throw new Error(
            'Incorrect arguments.'
            + "\n" + useHelp + "\n" + exHelp
        );
    }
    let args = null;
    try {
        args = JSON.parse(argv[2]);
    } catch (e) {
        let msg = 'Incorrect arguments: "' + e.message + '"';
        msg += "\n" + useHelp + "\n" + exHelp;
        throw new Error(msg);
    }
    return args
}

/**
 * первый запрос, чтоб достать все нужные поля формы
 */
function makeFirstReq(jar, headers, cb) {
    let opts = Object.assign({
        'gzip': true,
        'method': 'GET',
        'url': 'https://www.topcashback.co.uk/logon',
        'headers': headers,
        'jar': jar
    }, proxyOpts);

    request(opts, function (err, res, body) {
        if (err) {
            return cb(err);
        }
        cb(null, body);
    });
}

/**
 * парсим результат гет запроса в данные формы для последующего пост запроса
 * @param body - body of response
 * @returns {{}}
 */
function parseGetRespToPostData(body, args) {
    const $ = cheerio.load(body);
    let formData = $('#aspnetForm').serializeArray();
    let postData = {};
    for(let i = 0; i < formData.length; i++) {
        let item = formData[i];
        postData[item.name] = item.value;
    }
    postData['ctl00$GeckoOneColPrimary$Login$txtEmail'] = args.login;
    postData['ctl00$GeckoOneColPrimary$Login$txtPassword'] = args.password;
    postData["ctl00$GeckoOneColPrimary$Login$Loginbtn"] = 'Login';
    // postData['ctl00$GeckoOneColPrimary$Login$deviceFingerprintControl$deviceFingerprintField'] = '4155893347';

    return postData;
}

/**
 * делает основной пост запрос авторизации
 * @param postData
 * @param headers
 */
function makeLoginReq(postData, jar, headers, cb) {
    let opts = Object.assign({
        'gzip': true,
        'method': 'POST',
        url: 'https://www.topcashback.co.uk/logon',
        // url: 'http://localhost:3000/',
        headers: headers,
        form: postData,
        jar: jar
        // 'headers': headers
    }, proxyOpts);

    request(opts, function (err, res, body) { /* ... */
        if (err) {
            return cb(err);
        }
        if (res.statusCode == 302
            && res.headers.location == 'https://www.topcashback.co.uk/account/overview/') {
            return cb(null, true);
        } else {
            const $ = cheerio.load(body);
            let errEl = $('.gecko-login-error');
            if (errEl) {
                errEl = errEl.text();
            }
            cb(errEl, false);
        }
    });
}


function app() {
    let args = null;
    try {
        args = parseInput();
    } catch (e) {
        console.error(e.message);
        return;
    }

    let headers = {
        'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        // 'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en,en-US;q=0.8,ru;q=0.6',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36'
        // 'user-agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:56.0) Gecko/20100101 Firefox/56.0'
    };
    let jar = request.jar();
    let tasks = [
        function (cb) {
            makeFirstReq(jar, headers, cb);
        },
        function (respBody, cb) {
            let postData = parseGetRespToPostData(respBody, args);
            headers['cache-control'] = 'max-age=0';
            headers['referer'] = 'https://www.topcashback.co.uk/logon';
            headers['origin'] = 'https://www.topcashback.co.uk';
            headers['authority'] = 'www.topcashback.co.uk';
            makeLoginReq(postData, jar, headers, cb);
        }
    ];
    async.waterfall(tasks, function (err, authorized) {
        var res = { err: err, authorized: authorized};
        var jsonRes = JSON.stringify(res);
        console.log(jsonRes);
    });
}

app();