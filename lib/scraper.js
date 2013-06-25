/*jshint jquery:false */
var url     = require('url')
  , request = require('request')
  , $       = require('jquery')
  , decode  = require('he').decode
  , clone   = require('./clone')
  ;


//
// Requests jpopsuki and gets list of torrents
//
var getTorrents = function(options, callback) {
  if (options == null) options = {};
  var query = options.query ? '?' + options.query : '';

  if (options.headers == null) options.headers = {};
  options.uri = 'http://jpopsuki.eu/torrents.php' + query;
  options.headers.Cookie = options.cookie;

  request(options, function(err, res, body) {
    if (err) return callback(err);
    if (res.statusCode !== 200) {
      return callback(new Error('Response Error: ' + res.statusCode));
    }

    // if no errors, parse the page
    parseTorrents(body, callback);
  });
};


//
// Marks torrents old
// this makes torrents you've already seen not have the `redline`
// class anymore on your jps account
//
var markOld = function(options, callback) {
  if (options == null) options = {};
  options.uri = 'http://jpopsuki.eu/torrents.php?action=markold';

  if (options.headers == null) options.headers = {};
  options.headers.Cookie = options.cookie;

  request(options, function(err, res, body) {
    if (err) return callback(err);
    if (res.statusCode !== 200) {
      return callback(new Error('Response Error: ' + res.statusCode));
    }

    var table = $('table#torrent_table', body);
    if (table.length === 0) return callback(new Error('Unable to log in!'));
    callback(null);
  });
};


//
// Parses table of torrents
//
var parseTorrents = function(body, callback) {
  var table = $('table#torrent_table', body);
  if (table.length === 0) return callback(new Error('Unable to log in!'));

  var last = null;
  var torrents = [];

  table.find('tr').each(function() {
    var t;
    var tr = $(this);
    var tds = tr.children('td');
    var parsedHref;
    var td3a;
    var tAnchor;
    var n;
    var r;


    // torrent is a group
    if (tr.is('.group_redline, .group')) {
      t = {
        'new': false,
        group: true
      };
      td3a = tds.eq(3).children('a');

      // artist
      t.artist = parseArtist(td3a.first());

      // relesae info
      parsedHref = url.parse(decode(td3a.eq(1).attr('href')), true);
      n = t.artist === null ? 0 : 1;
      t.release = parseRelease(parsedHref.query.id, td3a.eq(n), tds, false)
        .release;

      last = t;


    // check if this is a subgroup
    } else if (tr.is('.group_torrent_redline, .group_torrent')) {
      t = clone(last);
      t['new'] = tr.hasClass('group_torrent_redline');

      // torrent info
      tAnchor = tds.first().find('a').eq(2);
      parsedHref = url.parse(decode(tAnchor.attr('href')), true);
      t.torrent = parseTorrentInfo(parsedHref.query.torrentid,
                                   tAnchor.text().trim(),
                                   tds, false);
      torrents.push(t);


    // single torrent
    } else if (tr.is('.torrent_redline, .torrent')) {
      t = {
        'new': tr.hasClass('torrent_redline'),
        group: false
      };
      td3a = tds.eq(3).find('a');

      // artist
      t.artist = parseArtist(td3a.eq(2));

      n = t.artist === null ? 2 : 3;
      parsedHref = url.parse(decode(td3a.eq(n).attr('href')), true);
      r = parseRelease(parsedHref.query.id, td3a.eq(n), tds, true);

      // release info
      t.release = r.release;

      // torrent info
      t.torrent = parseTorrentInfo(parsedHref.query.torrentid, r.str, tds, true);
      torrents.push(t);
    }
  });

  // return all torrents to callback
  callback(null, torrents);
};


//
// Gets original title
//
var getOrigname = function(a, b) {
  var title = a.attr('title');
  var blength = b.length + 2;
  var pos = title.indexOf('(' + b + ')');
  return (pos !== -1 && pos === title.length - blength) ?
    title.slice(0, -blength - 1) : null;
};


//
// Parses an artist link
//
var parseArtist = function(a) {
  var parsedHref = url.parse(decode(a.attr('href')), true);
  if (parsedHref.pathname !== 'artist.php') return null;

  return {
      id      : parseInt(parsedHref.query.id, 10)
    , name    : decode(a.text().trim())
    , orgname : getOrigname(a, 'View Artist')
  };
};


//
// Parses release link
//
var parseRelease = function(id, a, tds, single) {
  // get release id and title
  var title = decode(a.text().trim())
    , td3split = tds.eq(3).text().trim().split('\t\t\t')
    , rs, regex, data, str, date, comments, tags
    ;


  if (single) {
    regex = /^(\[(\S+( \/ [\w!]+)*)\] ?)?(\[((\d|\.)+)\])?( ?\((\d+)\))?$/;
    data = td3split[3].trim();
    if (data !== '') {
      rs = regex.exec(data);
      str = rs[2];
      date = rs[5];
      comments = rs[8];
    }
    tags = td3split[4];
  } else {
    regex = /(\s+\[((\d|\.)+)\])?(\s+\((\d+)\))?$/;
    data = td3split[0].trim();
    if (data !== '') {
      rs = regex.exec(data);
      str = rs[1];
      date = rs[2];
      comments = rs[5];
    }
    tags = td3split[1];
  }

  return {
      str     : str
    , release : {
        id       : parseInt(id, 10)
      , type     : tds.eq(1).first().text().trim()
      , title    : title
      , orgtitle : getOrigname(a, 'View Torrent')
      , date     : parseDate(title, date)
      , comments : parseInt(comments, 10) || 0
      , tags     : tags ? tags.trim().split(', ')   : []
      }
  };
};


//
// Parses a date string in a table row
//
var parseDate = function(title, date) {
  var regex = /(\d{4}\.\d{2}\.\d{2})/
    , rs = regex.exec(title)
    ;

  return date || (rs !== null ? rs[1] : null);
};


var formats = ['MP3', 'FLAC', 'TAK', 'TTA', 'ALAC', 'Ogg Orbis', 'APE', 'AAC', 'WMA', 'AC3', 'WavPack', 'DTS', 'IMG', 'ISO', 'VOB', 'MPEG', 'MPEG2', 'AVI', 'MKV', 'WMV', 'MP4', 'h264', 'Ogg', 'WAV'].join('|')

  , bitrates = ['192', 'V2 \\(VBR\\)', 'V1 \\(VBR\\)', '256', 'V0 \\(VBR\\)', '320', 'Lossless', 'Variable', 'Other'].join('|')

  , medias = ['CD', 'DVD', 'Blu-Ray', 'VHS', 'VCD', 'TV', 'HDTV', 'Radio', 'Vinyl', 'WEB'].join('|')

  , torrentRegex = new RegExp('(' + formats + ')( \/ (' + bitrates + '))?( \/ (' + medias + '))?( \/ (.+))?( \/ Freeleech!)?')
  ;


var parseTorrentInfo = function(id, str, tds, single) {
  var rs, filetype, quality, source, reissue, freeleech;

  if (str) {
    rs        = torrentRegex.exec(str);
    filetype  = rs[1];
    quality   = rs[3];
    source    = rs[5];
    reissue   = rs[7];
    freeleech = rs[8] !== undefined;
  }
  var n = single ? 3 : 0;

  return {
      id        : parseInt(id, 10)
    , filetype  : filetype || null
    , quality   : quality || null
    , source    : source || null
    , reissue   : reissue ? decode(reissue) : null
    , freeleech : freeleech || false
    , files     : parseInt(tds.eq(1 + n).text().trim(), 10)
    , added     : tds.eq(2 + n).text().trim()
    , size      : tds.eq(3 + n).text().trim()
    , snatchers : parseInt(tds.eq(4 + n).text().trim(), 10)
    , seeders   : parseInt(tds.eq(5 + n).text().trim(), 10)
    , leechers  : parseInt(tds.eq(6 + n).text().trim(), 10)
  };
};


module.exports = {
  getTorrents   : getTorrents,
  parseTorrents : parseTorrents,
  markOld       : markOld,

  imageLink     : function(rid) {
    return 'http://jpopsuki.eu/static/images/torrents/' + rid + '.jpg';
  },

  thumbnailLink : function(rid) {
    return 'http://jpopsuki.eu/static/images/torrents/' + rid + '.th.jpg';
  },

  artistLink    : function(aid) {
    return 'http://jpopsuki.eu/artist.php?id=' + aid;
  },

  releaseLink   : function(rid) {
    return 'http://jpopsuki.eu/torrents.php?id=' + rid;
  },

  torrentLink   : function(rid, tid) {
    return 'http://jpopsuki.eu/torrents.php?id=' + rid + '&torrentid=' + tid;
  },

  downloadLink  : function(tid) {
    return 'http://jpopsuki.eu/torrents.php?action=download&id=' + tid;
  }
};
