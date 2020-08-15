/** /*:
 * @author William Ramsey
 * @plugindesc Test your project in your default browser
 *
 * @param aldb
 * @text Allow Debugging
 * @type boolean
 * @default true
 *
 * @help
 * This basically launches your game in your default web browser.
 * If you don't support WebGL with your version of MV, this is perfect
 * for you. Keep in mind, nodejs-specific things (which likely are rare),
 * will not work in a browser.
 *
 * Enable "Allow Debugging" to allow the standard debug actions when
 * testing in the browser. Remember to disable it though,
 * before you export your project.
 */
(function () {
    var params = PluginManager.parameters('webLoader');
    Game_Temp.prototype.isPlaytest = function () {
        if (params['aldb'] == 'true')
            return true;
        return this._isPlaytest;
    };
    //ALIAS OVERRIDES/////////////////
    var sti = Scene_Base.prototype.initialize;
    Scene_Base.prototype.initialize = function () {
        if (Utils.isNwjs()) {
            var fs_1 = require('fs');
            var http = require('http');
            var mimeTypes_1 = {
                'js': 'text/javascript',
                'css': 'text/css',
                'html': 'text/html'
            };
            http.createServer(function (req, res) {
                console.log(req);
                try {
                    var type_1 = req.url.split('/').pop().split('.').pop();
                    console.log("" + process.cwd() + req.url);
                    fs_1.readFile("" + process.cwd() + req.url, function (err, data) {
                        if (err) {
                            res.end(err);
                        }
                        else {
                            res.writeHead(200, 'content-type', mimeTypes_1[type_1]);
                            res.end(data);
                        }
                    });
                }
                catch (e) {
                    console.log(e);
                    res.end(e);
                }
            }).listen(10242, function () {
                console.log('Server started');
                SceneManager.stop();
            });
            var url = 'http://localhost:10242/index.html';
            var start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
            require('child_process').exec(start + ' ' + url);
        }
        sti.call(this);
    };
})();
