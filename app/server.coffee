express      = require 'express'
cookieParser = require 'cookie-parser'
fs           = require 'fs'
log          = console.log
PeerServer   = require('peer').PeerServer
eden         = require 'node-eden'
coffee       = require 'coffee-script'
ngrok        = require 'ngrok'

fs.writeFileSync "./static/main.js",coffee.compile(fs.readFileSync("./app/client/main.coffee","utf8"))


app = express()
app.use(cookieParser())

app.use "/static", express.static('static')

maps =
    c2p : {}
    p2c : {}

addPeerToChannel = (peerid,channel)->
    maps.p2c[peerid] or= {}
    maps.p2c[peerid][channel] or= {}

addChannelToPeer = (peerid,channel)->
    maps.c2p[channel] or= {}
    maps.c2p[channel][peerid] or= {}

peerList = (channel)->
    peers = (peer for peer,val of maps.c2p[channel])
    return peers.join(",")

index = fs.readFileSync "./static/index.html"

app.get "*", (req, res)->
    res.set('Content-Type', 'text/html')


    channel = req.params[0]

    unless req.cookies.peerid
        peerid = eden.word()
        res.cookie "peerid", peerid
    else
        peerid = req.cookies.peerid

    # get new id on each refresh - makes testing easier..
    peerid = eden.word()
    res.cookie "peerid", peerid


    res.cookie "peers", peerList(channel)
    log "sending peers:",peerList(channel)

    addPeerToChannel peerid,channel
    addChannelToPeer peerid,channel

    console.log maps.c2p

    res.send index


app.listen 3000
ps = new PeerServer port: 9000, path: '/peerserver'

ps.on "connection",(id)->
    # log "connected:",id

ps.on "disconnect",(id)->
    # log "disconnected:",id


# [{name:"peer",  port: 3000},{name:"peerserve",  port: 9000}].forEach (kite)->
#     console.log "--------------------> creating tunnel #{kite.name}-devrim.ngrok.com"
#     ngrok.connect
#       authtoken : 'CMY-UsZMWdx586A3tA0U'
#       subdomain : "#{kite.name}-devrim"
#       port      : kite.port
#     , (err, url)->

#       if err
#         console.log "Failed to create #{kite.name} tunnel: ", err
#       else
#         console.log "0.0.0.0:#{kite.port} for #{kite.name} is now tunneling with: ", url
