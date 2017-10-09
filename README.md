# easync-test-task

Для установки (ubuntu 16.04, nodejs 6.11, npm):
1. cd ./easync-test-task
2. npm install

Сделал 2мя способами:

1. Рабочий вариант, сделан с помощью библиотек request и cheerio.
   * Запуск: npm start '{"login":"yuryilinikh@gmail.com", "password": "qwertyui"}'
   * Проходит авторизацию и выводит ошибки.
   * Этому варианту ранее не хватало послать "ctl00$GeckoOneColPrimary$Login$Loginbtn": 'Login!!!
   * Так как браузерный девтулз не показал кнопку в отправляемой форме :(.


1. Рабочий вариант, сделан с помощью безголового браузера phantomjs.
   * Запуск: ./node_modules/.bin/phantomjs ./phantom.js '{"login":"yuryilinikh@gmail.com", "password": "qwertyui"}'
   * С этими данными пройдет авторизацию.
   * С другими выведет ошибку, которая под формой логина появляется на сайте.
   * Для наглядного представления можно раскомментировать строчку в phantom.js page.render("nextPage.png"); Эта штука сделает скрин вида безголового браузера.
