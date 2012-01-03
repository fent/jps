var jps = require('../lib/scraper')
   nock = require('nock'),
   vows = require('vows'),
 assert = require('assert');


nock('http://jpopsuki.eu')
  .get('/torrents.php')
  .replyWithFile(200, __dirname + '/torrents3.html')
  .get('/torrents.php?action=markold')
  .reply(200, '')



vows.describe('jpopsuki')
  .addBatch({
    'Get the latest list of torrents': {
      'topic': function() {
        jps.getTorrents({}, this.callback);
      },

      'less new than total': function(err, torrents) {
        assert.ok(torrents);
        assert.isArray(torrents);

        newtorrents = 0
        torrents.forEach(function(t) {
          assert.isObject(t);
          assert.isBoolean(t.new);
          assert.isBoolean(t.group);

          assert.include(t, 'artist');
          if (t.artist !== null) {
            assert.isNumber(t.artist.id);
            assert.isString(t.artist.name);
            assert.include(t.artist, 'orgname');
          }

          assert.isObject(t.release);
          assert.isNumber(t.release.id);
          assert.isString(t.release.type);
          assert.isString(t.release.title);
          assert.include(t.release, 'orgtitle');
          assert.include(t.release, 'date');
          assert.isNumber(t.release.comments);
          assert.isArray(t.release.tags);
          t.release.tags.forEach(function(tag) {
            assert.isString(tag);
          });

          assert.isObject(t.torrent);
          assert.isNumber(t.torrent.id);
          assert.include(t.torrent, 'filetype');
          assert.include(t.torrent, 'quality');
          assert.include(t.torrent, 'source');
          assert.include(t.torrent, 'reissue');
          assert.isBoolean(t.torrent.freeleech);
          assert.isNumber(t.torrent.files);
          assert.isString(t.torrent.added);
          assert.isString(t.torrent.size);
          assert.isNumber(t.torrent.snatchers);
          assert.isNumber(t.torrent.seeders);
          assert.isNumber(t.torrent.leechers);

          if (t.new) {
            newtorrents++;
          }
        });
        
        assert.isTrue(newtorrents <= torrents.length);
      }
    }
  })
  .export(module);
