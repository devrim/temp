express      = require 'express'
cookieParser = require 'cookie-parser'
fs           = require 'fs'
log          = console.log
PeerServer   = require('../peerjs-server').PeerServer
eden         = require 'node-eden'
coffee       = require 'coffee-script'
ngrok        = require 'ngrok'
restify      = require('../peerjs-server/node_modules/restify')


fs.writeFileSync "./static/main.js",coffee.compile(fs.readFileSync("./app/client/main.coffee","utf8"))


app = express()
app.use(cookieParser())

app.use "/static", express.static('static')

maps =
    c2p : {}
    p2c : {}


peers = {}


index = fs.readFileSync "./static/index.html"
indexLen = Buffer.byteLength(index+"")

defaultRoute = (req, res, next) ->
    # peerid = eden.word()
    # res.cookie "peerid", peerid


    # res.cookie "peers", peerList(channel)
    # log "sending peers:",peerList(channel)


    console.log req.params

    res.writeHead 200,
        "Content-Length" : indexLen
        'Content-Type'   : 'text/html'
    res.write index
    res.end()
    next()

ps = new PeerServer
    port : 3000
    path : '/-/ps'
    static:
        path      : /\/static\/?.*/
        directory : '/Users/d/Projects/peer'
        default   : 'index.html'
    routes :
      [
        {
            type : "get"
            path : "/peers"
            fn   : (req,res,next)->
                # res.writeHead 200,
                #     'Content-Type'   : 'application/json'
                res.send 200, peers

        },
        {
        type : "get"
        path : "/:all"
        fn   : defaultRoute
        },
        {
        type : "get"
        path : "/"
        fn   : defaultRoute
        }
      ]




ps.on "connection",(peerid)->
    log "connected:",peerid
    peers[peerid] = ""
ps.on "disconnect",(peerid)->
    log "disconnected:",peerid
    delete peers[peerid]


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
