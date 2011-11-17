(function() {
  var $, bitrates, ent, f, formats, getTorrents, markOld, medias, parseArtist, parseDate, parseRelease, parseTorrentInfo, parseTorrents, request, torrentRegex, url;

  url = require('url');

  request = require('request');

  $ = require('jquery');

  ent = require('ent');

  f = require('f');

  getTorrents = function(options, callback) {
    var query, _ref;
    if (options == null) options = {};
    query = options.query ? '?' + options.query : '';
    options.uri = 'http://jpopsuki.eu/torrents.php' + query;
    if ((_ref = options.headers) == null) options.headers = {};
    options.headers.Cookie = options.cookie;
    return request(options, function(err, res, body) {
      if (err) return callback(err);
      if (res.statusCode !== 200) {
        return callback(new Error('Response Error: ' + res.statusCode));
      }
      return parseTorrents(body, callback);
    });
  };

  markOld = function(options, callback) {
    var _ref;
    if (options == null) options = {};
    options.uri = 'http://jpopsuki.eu/torrents.php?action=markold';
    if ((_ref = options.headers) == null) options.headers = {};
    options.headers.Cookie = options.cookie;
    return request(options, function(err, res, body) {
      var table;
      if (err) return callback(err);
      if (res.statusCode !== 200) {
        return callback(new Error('Response Error: ' + res.statusCode));
      }
      table = $('table#torrent_table', body);
      if (table.length === 0) return callback(new Error('Unable to log in!'));
      return callback(null);
    });
  };

  parseTorrents = function(body, callback) {
    var last, table, torrents;
    table = $('table#torrent_table', body);
    if (table.length === 0) return callback(new Error('Unable to log in!'));
    last = null;
    torrents = [];
    table.find('tr').each(function() {
      var n, parsedHref, r, t, tAnchor, td3a, tds, tr;
      tr = $(this);
      tds = tr.children('td');
      if (tr.is('.group_redline, .group')) {
        t = {
          "new": false,
          group: true
        };
        td3a = tds.eq(3).children('a');
        t.artist = parseArtist(td3a.first());
        parsedHref = url.parse(ent.decode(td3a.eq(1).attr('href')), true);
        n = t.artist === null ? 0 : 1;
        t.release = parseRelease(parsedHref.query.id, td3a.eq(n), tds, false).release;
        return last = t;
      } else if (tr.is('.group_torrent_redline, .group_torrent')) {
        t = f.obj.clone(last);
        t["new"] = tr.hasClass('group_torrent_redline');
        tAnchor = tds.first().find('a').eq(2);
        parsedHref = url.parse(ent.decode(tAnchor.attr('href')), true);
        t.torrent = parseTorrentInfo(parsedHref.query.torrentid, f.str.rtrim(tAnchor.text()), tds, false);
        return torrents.push(t);
      } else if (tr.is('.torrent_redline, .torrent')) {
        t = {
          "new": tr.hasClass('torrent_redline'),
          group: false
        };
        td3a = tds.eq(3).find('a');
        t.artist = parseArtist(td3a.eq(2));
        n = t.artist === null ? 2 : 3;
        parsedHref = url.parse(ent.decode(td3a.eq(n).attr('href')), true);
        r = parseRelease(parsedHref.query.id, td3a.eq(n), tds, true);
        t.release = r.release;
        t.torrent = parseTorrentInfo(parsedHref.query.torrentid, r.str, tds, true);
        return torrents.push(t);
      }
    });
    return callback(null, torrents);
  };

  parseArtist = function(a) {
    var parsedHref, rs;
    parsedHref = url.parse(ent.decode(a.attr('href')), true);
    if (parsedHref.pathname !== 'artist.php') return null;
    rs = /^(.+)?( \(View Artist\))|(View Artist)$/.exec(a.attr('title'));
    return {
      id: parseInt(parsedHref.query.id),
      name: ent.decode(f.str.rtrim(a.text())),
      orgname: rs[1] || null
    };
  };

  parseRelease = function(id, a, tds, single) {
    var comments, data, date, orgtitle, regex, rs, str, tags, td3split, title;
    title = ent.decode(f.str.rtrim(a.text()));
    rs = /^(.+)?( \(View Torrent\))|(View Torrent)$/.exec(a.attr('title'));
    orgtitle = rs[1] || null;
    td3split = f.str.trim(tds.eq(3).text()).split('\t\t\t');
    if (single) {
      regex = /^(\[(\S+( \/ [^\/\]]+)*)\] ?)?(\[((\d|\.)+)\])?( ?\((\d+)\))?$/;
      data = f.str.trim(td3split[3]);
      if (data !== '') {
        rs = regex.exec(data);
        str = rs[2];
        date = rs[5];
        comments = rs[8];
      }
      tags = td3split[4];
    } else {
      regex = /(\s+\[((\d|\.)+)\])?(\s+\((\d+)\))?$/;
      data = f.str.trim(td3split[0]);
      if (data !== '') {
        rs = regex.exec(data);
        str = rs[1];
        date = rs[2];
        comments = rs[5];
      }
      tags = td3split[1];
    }
    return {
      str: str,
      release: {
        id: parseInt(id),
        type: f.str.rtrim(tds.eq(1).first().text()),
        title: title,
        orgtitle: orgtitle,
        date: parseDate(title, date),
        comments: parseInt(comments) || 0,
        tags: tags ? f.str.trim(tags).split(', ') : []
      }
    };
  };

  parseDate = function(title, date) {
    var regex, rs;
    regex = /(\d{4}\.\d{2}\.\d{2})/;
    rs = regex.exec(title);
    return date || (rs !== null ? rs[1] : null);
  };

  formats = ['MP3', 'FLAC', 'TAK', 'TTA', 'ALAC', 'Ogg Orbis', 'APE', 'AAC', 'WMA', 'AC3', 'WavPack', 'DTS', 'IMG', 'ISO', 'VOB', 'MPEG', 'MPEG2', 'AVI', 'MKV', 'WMV', 'MP4', 'h264', 'Ogg', 'WAV'].join('|');

  bitrates = ['192', 'V2 \\(VBR\\)', 'V1 \\(VBR\\)', '256', 'V0 \\(VBR\\)', '320', 'Lossless', 'Variable', 'Other'].join('|');

  medias = ['CD', 'DVD', 'Blu-Ray', 'VHS', 'VCD', 'TV', 'HDTV', 'Radio', 'Vinyl', 'WEB'].join('|');

  torrentRegex = new RegExp('(' + formats + ')( \/ (' + bitrates + '))?( \/ (' + medias + '))?( \/ (.+))?( \/ Freeleech!)?');

  parseTorrentInfo = function(id, str, tds, single) {
    var filetype, freeleech, n, quality, reissue, rs, source;
    if (str) {
      rs = torrentRegex.exec(str);
      filetype = rs[1];
      quality = rs[3];
      source = rs[5];
      reissue = rs[7];
      freeleech = rs[8] !== void 0;
    }
    n = single ? 3 : 0;
    return {
      id: parseInt(id),
      filetype: filetype || null,
      quality: quality || null,
      source: source || null,
      reissue: reissue ? ent.decode(reissue) : null,
      freeleech: freeleech || false,
      files: parseInt(f.str.rtrim(tds.eq(1 + n).text())),
      added: f.str.rtrim(tds.eq(2 + n).text()),
      size: f.str.rtrim(tds.eq(3 + n).text()),
      snatchers: parseInt(f.str.rtrim(tds.eq(4 + n).text())),
      seeders: parseInt(f.str.rtrim(tds.eq(5 + n).text())),
      leechers: parseInt(f.str.rtrim(tds.eq(6 + n).text()))
    };
  };

  module.exports = {
    getTorrents: getTorrents,
    parseTorrents: parseTorrents,
    markOld: markOld,
    imageLink: function(rid) {
      return 'http://jpopsuki.eu/static/images/torrents/' + rid + '.jpg';
    },
    thumbnailLink: function(rid) {
      return 'http://jpopsuki.eu/static/images/torrents/' + rid + '.th.jpg';
    },
    artistLink: function(aid) {
      return 'http://jpopsuki.eu/artist.php?id=' + aid;
    },
    releaseLink: function(rid) {
      return 'http://jpopsuki.eu/torrents.php?id=' + rid;
    },
    torrentLink: function(rid, tid) {
      return 'http://jpopsuki.eu/torrents.php?id=' + rid + '&torrentid=' + tid;
    },
    downloadLink: function(tid) {
      return 'http://jpopsuki.eu/torrents.php?action=download&id=' + tid;
    }
  };

}).call(this);
