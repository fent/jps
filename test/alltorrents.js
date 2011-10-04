var jps = require('../lib/scraper')
   nock = require('nock'),
inspect = require('eyes').inspector({maxLength: 0});


nock('http://jpopsuki.eu')
  .get('/ajax.php?section=torrents')
  .replyWithFile(200, __dirname + '/torrents.html')
  .get('/torrents.php?action=markold')
  .reply(200, '')

jps.getTorrents({}, function(err, torrents) {
  if (err) throw err;
  inspect(torrents);
});
