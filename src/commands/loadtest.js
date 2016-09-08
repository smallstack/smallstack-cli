// third party
var fs = require("fs-extra");
var path = require("path");
var glob = require("glob");
var _ = require("underscore");
var lodash = require("lodash");
var Nightmare = require("nightmare");


module.exports = function (params, done) {

    var nightmare = Nightmare({ show: true })

    nightmare
        .goto('https://cuppy.io')
        .click('a[href="/login"]')
        .type('input[type=email]', 'test@test.com')
        .type('input[type=password]', 'test')
        .click('#mainContent > div.ng-scope > div > div > login > div > div:nth-child(1) > form > div:nth-child(3) > button')
        .wait('page-header[i18n-text=navigation.competitions]')
        .end()
        .then(function (result) {
            console.log(result)
        })
        .catch(function (error) {
            console.error('Search failed:', error);
        });

}