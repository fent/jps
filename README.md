# jps [![Build Status](https://secure.travis-ci.org/fent/jps.png)](http://travis-ci.org/fent/jps)

A small scraper for the jpopsuki tracker

# Usage

```javascript
var jps = require('jps');

jps.getTorrents({ cookie: 'cookiegoeshere'}, function(err, torrents) {
  var newt = 0;
  for (var i = 0; i < torrents.length; i++) {
    if (torrents[i].new) {
      newt++;
    }
  }
  console.log('There are', newt, 'new torrents!');
});
```


# API

### jps.getTorrents(options, callback(err, torrents))
Gets a list of torrents. `options` must be passed in a `cookie` field to be able to access jpopsuki. Optionally, a `query` field can be passed in options too to request a more specific torrent search. The `callback` gets an array of torrents if successful. The torrent object looks like this:

```javascript
{
  new: false,
  group: false,
  artist: {
    id: 173,
    name: 'SHINee',
    orgname: '샤이니'
  },
  release: {
    id: 83835,
    type: 'PV',
    title: 'Lucifer (Japanese Version)',
    orgtitle: null,
    date: '2011',
    comments: 1,
    tags: [ 'japanese', 'korean', 'pop', 'male.vocalist' ]
  },
  torrent: {
    id: 110116,
    filetype: 'MP4',
    quality: null,
    source: 'WEB',
    reissue: null,
    freeleech: false,
    files: 1,
    added: '1 day, 3 hours',
    size: '185.18 MB',
    snatchers: 139,
    seeders: 50,
    leechers: 0
  }
}
```

### jps.parseTorrents(html, callback(err, torrents))
Like `getTorrents` but you must provide the `html` string yourself.

### jps.markOld([callback(err)])
Marks torrents you've already seen old.

### jps.imageLink(releaseid)
Returns the link to a release image. ie album cover.

### jps.thumbnailLink(releaseid)
Returns the link to a release thumbnail image.

### jps.artistLink(artistid)
Returns the link to an artist's page.

### jps.releaseLink(releaseid)
Returns the link to a torrent's page.

### jps.releaseLink(releaseid, torrentid)
Returns the link to a release's page.

### jps.downloadLink(torrentid)
Returns the link to a torrent's download. Excluding the `authkey` and `torrent_pass` fields in the url.


# Install

    npm install jps


# Tests

Tests are written with [vows](http://vowsjs.org/)

```bash
npm test
```


# License

MIT
