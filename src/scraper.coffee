url     = require 'url'
request = require 'request'
$       = require('jq').jQuery
ent     = require 'ent'
f       = require 'f'


# requests jpopsuki and gets list of torrents
getTorrents = (options = {}, callback) ->
  query = if options.query then '&' + options.query else ''
  options.uri = 'http://jpopsuki.eu/ajax.php?section=torrents' + query
  options.headers ?= {}
  options.headers.Cookie = options.cookie
  request options, (err, res, body) ->
    return callback err if err
    if res.statusCode isnt 200
      return callback new Error 'Response Error: ' + res.statusCode

    # if page scraped successfully, parse it
    parseTorrents body, callback


# marks torrents old so you know you have seen them
markOld = (options = {}, callback) ->
  options.uri = 'http://jpopsuki.eu/torrents.php?action=markold'
  options.headers ?= {}
  options.headers.Cookie = options.cookie
  request options, (err, res) ->
    return callback err if err
    if res.statusCode isnt 200
      return callback new Error 'Response Error: ' + res.statusCode


# parses webpage after request
parseTorrents = (body, callback) ->
  table = $('table#torrent_table', body)
  if table.length is 0
    return callback new Error 'Unable to log in!'

  last = null
  torrents = []
  table.find('tr').each ->
    tr = $(this)
    tds = tr.children 'td'


    # torrent is a group
    if tr.is '.group_redline, .group'
      t =
        new: false
        group: true
      td3a = tds.eq(3).children('a')

      # artist
      t.artist = parseArtist td3a.first()

      # release info
      parsedHref = url.parse(ent.decode(td3a.eq(1).attr('href')), true)
      n = if t.artist is null then 0 else 1
      t.release = parseRelease(parsedHref.query.id, td3a.eq(n), tds, false)
        .release

      last = t


    # check if this is a subgroup
    else if tr.is '.group_torrent_redline, .group_torrent'
      t = f.obj.clone last
      t.new = tr.hasClass 'group_torrent_redline'

      # torrent info
      tAnchor = tds.first().find('a').eq(2)
      parsedHref = url.parse(ent.decode(tAnchor.attr('href')), true)
      t.torrent = parseTorrentInfo parsedHref.query.torrentid,
                                      f.str.rtrim(tAnchor.text()),
                                      tds, false

      torrents.push t


    # single torrent
    else if tr.is '.torrent_redline, .torrent'
      t =
        new: tr.hasClass 'torrent_redline'
        group: false
      td3a = tds.eq(3).find('a')

      # artist
      t.artist = parseArtist td3a.eq(2)


      parsedHref = url.parse(ent.decode(td3a.eq(3).attr('href')), true)
      n = if t.artist is null then 2 else 3
      r = parseRelease parsedHref.query.id, td3a.eq(n), tds, true

      # relesae info
      t.release = r.release

      # torrent
      t.torrent = parseTorrentInfo parsedHref.query.torrentid,
                                   r.str, tds, true

      torrents.push t
  
  
  # return all torrents to callback
  callback null, torrents


parseArtist = (a) ->
  parsedHref = url.parse(ent.decode(a.attr('href')), true)
  if parsedHref.pathname isnt '/artist.php'
    return null
  rs = /^(.+)?( \(View Artist\))|(View Artist)$/.exec a.attr('title')

  id      : parseInt parsedHref.query.id
  name    : ent.decode f.str.rtrim a.text()
  orgname : rs[1] or null


parseRelease = (id, a, tds, single) ->
  # get release id and title
  title = ent.decode f.str.rtrim a.text()
  rs = /^(.+)?( \(View Torrent\))|(View Torrent)$/.exec a.attr('title')
  orgtitle = rs[1] or null

  td3split = f.str.trim(tds.eq(3).text()).split('\t\t\t')
  if single
    regex = /^(\[(\S+( \/ [^\/\]]+)*)\] ?)?(\[((\d|\.)+)\])?( ?\((\d+)\))?$/
    data = f.str.trim td3split[3]
    if data isnt ''
      rs = regex.exec data
      str = rs[2]
      date = rs[5]
      comments = rs[8]
    tags = td3split[4]
  else
    regex = /(\s+\[((\d|\.)+)\])?(\s+\((\d+)\))?$/
    data = f.str.trim td3split[0]
    if data isnt ''
      rs = regex.exec data
      str = rs[1]
      date = rs[2]
      comments = rs[5]
    tags = td3split[1]

  str: str
  release:
    id       : parseInt id
    type     : f.str.rtrim tds.eq(1).first().text()
    title    : title
    orgtitle : orgtitle
    date     : parseDate title, date
    comments : parseInt(comments) or 0
    tags     : if tags then f.str.trim(tags).split ', ' else []


parseDate = (title, date) ->
  regex = /(\d{4}\.\d{2}\.\d{2})/
  rs = regex.exec title
  date or if rs isnt null then rs[1] else null


formats = ['MP3', 'FLAC', 'TAK', 'TTA', 'ALAC', 'Ogg Orbis', 'APE',
           'AAC', 'WMA', 'AC3', 'WavPack', 'DTS', 'IMG', 'ISO', 'VOB',
           'MPEG', 'MPEG2', 'AVI', 'MKV', 'WMV', 'MP4', 'h264',
           'Ogg', 'WAV'].join('|')
bitrates = ['192', 'V2 \\(VBR\\)', 'V1 \\(VBR\\)', '256',
            'V0 \\(VBR\\)', '320', 'Lossless', 'Variable', 'Other']
           .join('|')
medias = ['CD', 'DVD', 'Blu-Ray', 'VHS', 'VCD', 'TV', 'HDTV',
          'Radio', 'Vinyl', 'WEB'].join('|')

torrentRegex = new RegExp '(' + formats + ')( \/ (' + bitrates + '))?( \/ (' + medias + '))?( \/ (.+))?( \/ Freeleech!)?'

parseTorrentInfo = (id, str, tds, single) ->
  if str
    rs = torrentRegex.exec str
    filetype  = rs[1]
    quality   = rs[3]
    source    = rs[5]
    reissue   = rs[7]
    freeleech = rs[8] isnt undefined
  n = if single then 3 else 0

  id        : parseInt id
  filetype  : filetype or null
  quality   : quality or null
  source    : source or null
  reissue   : if reissue then ent.decode reissue else null
  freeleech : freeleech or false
  files     : parseInt f.str.rtrim tds.eq(1 + n).text()
  added     : f.str.rtrim tds.eq(2 + n).text()
  size      : f.str.rtrim tds.eq(3 + n).text()
  snatchers : parseInt f.str.rtrim tds.eq(4 + n).text()
  seeders   : parseInt f.str.rtrim tds.eq(5 + n).text()
  leechers  : parseInt f.str.rtrim tds.eq(6 + n).text()


# export
module.exports =
  getTorrents   : getTorrents
  parseTorrents : parseTorrents
  markOld       : markOld

  imageLink     : (rid) ->
    'http://jpopsuki.eu/static/images/torrents/' + rid + '.jpg'

  thumbnailLink : (rid) ->
    'http://jpopsuki.eu/static/images/torrents/' + rid + '.th.jpg'

  artistLink    : (aid) ->
    'http://jpopsuki.eu/artist.php?id=' + aid

  releaseLink   : (rid) ->
    'http://jpopsuki.eu/torrents.php?id=' + rid

  torrentLink   : (rid, tid) ->
    'http://jpopsuki.eu/torrents.php?id=' + rid + '&torrentid=' + tid

  downloadLink  : (tid) ->
    'http://jpopsuki.eu/torrents.php?action=download&id=' + tid