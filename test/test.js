var jps = require('../lib/scraper')
   nock = require('nock'),
   vows = require('vows'),
 assert = require('assert');


nock('http://jpopsuki.eu')
  .get('/ajax.php?section=torrents')
  .replyWithFile(200, __dirname + '/torrents.html')
  .get('/torrents.php?action=markold')
  .reply(200, '')



vows.describe('jpopsuki')
  .addBatch({
    'Get the latest list of torrents': {
      'topic': function() {
        jps.getTorrents({}, this.callback);
      },

      'no error': function(err, torrents) {
        if (err) throw err;
        assert.isNull(err, err ? err.message : '');
      },
      'less new than old': function(err, torrents) {
        newtorrents = 0
        for (var i; i < torrents.length; i++) {
          if (torrents[i].new) {
            newtorrents++;
          }
        }
        
        assert.isTrue(newtorrents <= torrents.length);
      }
    }
  })
  .export(module);
