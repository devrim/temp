# KDEventEmitter
# author     : devrim - 12/27/2011
# refactored : sinan - 05/2012
# refactored : sinan - 01/2013
# improved   : sinan - 02/2013

# maxListenersError = (n) ->
#   return new Error \
#     '(node) warning: possible EventEmitter memory leak detected.' +
#     ' %d listeners added. Use emitter.setMaxListeners()' +
#     ' to increase limit.', n

log = console.log.bind(console)
warn = console.warn.bind(console)
MY_ID = null
browserEvents = [
    "abort"
    "afterprint"
    "beforeprint"
    "beforeunload"
    "blur"
    "canplay"
    "canplaythrough"
    "change"
    "click"
    "contextmenu"
    "copy"
    "cuechange"
    "cut"
    "dblclick"
    "DOMContentLoaded"
    "drag"
    "dragend"
    "dragenter"
    "dragleave"
    "dragover"
    "dragstart"
    "drop"
    "durationchange"
    "emptied"
    "ended"
    "error"
    "focus"
    "focusin"
    "focusout"
    "formchange"
    "forminput"
    "hashchange"
    "input"
    "invalid"
    "keydown"
    "keypress"
    "keyup"
    "load"
    "loadeddata"
    "loadedmetadata"
    "loadstart"
    "message"
    "mousedown"
    "mouseenter"
    "mouseleave"
    "mousemove"
    "mouseout"
    "mouseover"
    "mouseup"
    "mousewheel"
    "offline"
    "online"
    "pagehide"
    "pageshow"
    "paste"
    "pause"
    "play"
    "playing"
    "popstate"
    "progress"
    "ratechange"
    "readystatechange"
    "redo"
    "reset"
    "resize"
    "scroll"
    "seeked"
    "seeking"
    "select"
    "show"
    "stalled"
    "storage"
    "submit"
    "suspend"
    "timeupdate"
    "undo"
    "unload"
    "volumechange"
    "waiting"
]

i=0

$(document).on browserEvents.join(" "),(e, peerid=null)->
    e.stopPropagation()
    console.log "event from:",peerid
    {pageX, pageY, type} = e
    console.log "event:",type

    if e.srcElement?.offsetTop
        pageY = e.srcElement.offsetTop
        pageX = e.srcElement.offsetLeft

    # only the owner of the even should broadcast

    if peerid is null and type in ["mousemove","click", "focus", "focusin"]
        p2p.throttledBroadcast
            type : "event"
            data : { type, pageX, pageY }
            dept : p2p.db.utcTime()
            peer : p2p.peerid

    return yes

class KDEventEmitter

  @registerStaticEmitter = ->
    # static listeners will be put here
    @_e = {}

  _registerEvent = (registry, eventName, listener)->
    # on can be defined before any emit, so create
    # the event registry, if it doesn't exist.
    registry[eventName] ?= []
    # register the listeners listener.
    registry[eventName].push listener

  _unregisterEvent = (registry, eventName, listener)->
    if not eventName or eventName is "*"
      registry = {}
    # reset the listener container so no event3
    # will be propagated to previously registered
    # listener listeners.
    else if listener and registry[eventName]
      cbIndex = registry[eventName].indexOf listener
      registry[eventName].splice cbIndex, 1 if cbIndex >= 0
    else
      registry[eventName] = []

  _on = (registry, eventName, listener)->
    throw new Error 'Try passing an event, genius!'    unless eventName?
    throw new Error 'Try passing a listener, genius!'  unless listener?
    if Array.isArray eventName
      _registerEvent registry, name, listener for name in eventName
    else
      _registerEvent registry, eventName, listener


  _off = (registry, eventName, listener)->
    if Array.isArray eventName
      _unregisterEvent registry, name, listener for name in eventName
    else
      _unregisterEvent registry, eventName, listener


  # STATIC METHODS
  # to enable ClassName.on or ClassName.emit

  @emit: ->
    unless @_e?
      throw new Error 'Static events are not enabled for this constructor.'
    # slice the arguments, 1st argument is the event name,
    # rest is args supplied with emit.
    [eventName, args...] = arguments
    # create listener container if it doesn't exist
    listeners = @_e[eventName] ?= []
    # call every listener inside the container with the arguments (args)
    listener.apply null, args  for listener in listeners
    return this

  @on: (eventName, listener) ->
    unless 'function' is typeof listener
      throw new Error 'listener is not a function'

    unless @_e?
      throw new Error 'Static events are not enabled for this constructor.'

    @emit 'newListener', listener
    _on @_e, eventName, listener
    return this

  @off: (eventName, listener) ->
    @emit 'listenerRemoved', eventName, listener
    _off @_e, eventName, listener
    return this

  # INSTANCE METHODS
  # to enable anInstance.on or anInstance.emit (anInstance being new ClassName)

  constructor: (options = {}) ->
    { maxListeners } = options
    @_e             = {}
    @_maxListeners  = if maxListeners > 0 then maxListeners else 10

  emit:(eventName, args...)->
    @_e[eventName] ?= []

    listenerStack = []

    listenerStack = listenerStack.concat @_e[eventName].slice(0)
    listenerStack.forEach (listener)=> listener.apply @, args

    return this

  on  :(eventName, listener) ->
    unless 'function' is typeof listener
      throw new Error 'listener is not a function'

    @emit 'newListener', eventName, listener
    _on  @_e, eventName, listener
    return this

  off :(eventName, listener) ->
    @emit 'listenerRemoved', eventName, listener
    _off @_e, eventName, listener
    return this

  once:(eventName, listener) ->
    _listener = =>
      args = [].slice.call arguments
      @off eventName, _listener
      listener.apply @, args

    @on eventName, _listener
    return this



class DB extends KDEventEmitter
    Db  =
        strings  : []
        objects  : []
        arrays   : []
        messages : []

    mergeRecursive = (obj1, obj2) ->
      for p of obj2
        try

          # Property in destination object set; update its value.
          if obj2[p].constructor is Object
            obj1[p] = mergeRecursive(obj1[p], obj2[p])
          else
            obj1[p] = obj2[p]
        catch e

          # Property in destination object not set; create it and set its value.
          obj1[p] = obj2[p]
      return obj1


    utcTime : ->
        now = new Date
        return Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds())


        # try
        #     json = JSON.parse data
        #     # db = _.extend db,json
        #     {name,type,path,data} = json

        #     if type is "json"
        #         db[name].data = mergeRecursive db[name].data,data

        #     # dbnew = traverse(db).set(path.split("."),data)
        #     # db = dbnew if dbnew
        #     # @emit "update",path
        # catch err
        #     console.log "cannot set. invalid json.",err

    set : (meta,data)->

        # data = meta unless meta

        obj =
            peer : meta.peer or p2p.peerid
            data : data
            dept : meta.dept or @utcTime()
            arrv : meta.arrv or @utcTime()
            path : meta.path or window.location.pathname

        Db.messages.push obj
        @updateView()
        return obj

    all : -> JSON.stringify Db,null,2

    updateView : (div) ->
        scrollDown = ->
            a = document.getElementById("general")
            a.scrollTop = a.scrollHeight

        scrollDown()
        $("#general").html("<div><pre><code class='javascript'>"+@all()+"</pre></code></div>")


class P2P

    connectedPeers = {}

    constructor: (options,callback)->
        @db = new DB
        @peerid = null
        @peer = null
        @peers = {}
        @throttledBroadcast = _.throttle(@broadcast, 50)

        @db.on "update",(data)->
            console.log data
            # traverse(data).paths().forEach (path)->
            #     console.log "updated: #{path}"

    join : (options,callback)->
        @peer = new Peer
            # key: "x7fwx2kavpy6tj4i"
            debug: 0
            host: window.location.hostname
            port: window.location.port
            path: "/-/ps"
            allow_discovery : yes

        console.log @peer


        @peer.on "open", (id) =>
            MY_ID = id
            log {MY_ID}
            @peerid = id
            $("#pid").text "hi "+id
            @fetchPeers {},(err,peers)=>
                console.log "peers:",peers
                @peers = peers
                @connectToPeers peers



        @peer.on "connection", @connect

        @peer.on "error",(err)->
            if err.type is "unavailable-id"
                console.log "unavailable-id",arguments
            else if err.type is "socket-closed"
                console.log "||socket-closed||"
            else if err.type is "network"
                console.log "---> going down..."
                after 3,location.reload.bind(location)
            console.log "--->", err.type

        @peer.on "close",->
            console.log "connection closed..."

        @peer.on "disconnect",->
            console.log "i am disconnected..."

    fetchPeers: (options,callback) ->
        $.ajax
          url: "/peers"
          # data: data
          dataType: "json"
          success: (data) ->
            callback null, data

    broadcastCount = 0
    lastBroadcast = Date.now()





    broadcast : (obj) ->
        # console.log "#{broadcastCount++} broadcasting:",obj
        for _peerid,_peer of connectedPeers when _peer.send and obj.peer isnt _peerid
            _peer.send JSON.stringify obj

    connectToPeer : (requestedPeer)->
        unless connectedPeers[requestedPeer]
            c = @peer.connect requestedPeer,
                label         : "chat"
                serialization : "json"
                metadata      :
                    message   : "hi i want to chat with you!"

            c.on "open", => @connect c,requestedPeer
            c.on "error", (err) -> alert err

        connectedPeers[requestedPeer] = 1

    connectToPeers : (peers)->
        console.log "connecting to:",peers
        for peer,info of @peers
            console.log "connecting to:",peer
            @connectToPeer(peer)


    connect : (c) ->

        c.on "data", (msg) ->


            # console.log "db",@db
            # publicChannel.append "<div><span class=\"peer\">" + c.peer + "</span>: " + data + "</div>"
            # console.log "received:",msg
            obj = JSON.parse msg

            return  if MY_ID is obj.peer

            console.log "got #{obj.data.type} from:",obj.peer,"at:", obj.data.pageX, obj.data.pageY unless obj.data.type is "mousemove"

            if obj.type is "event"

                switch obj.data.type
                    when "mousemove"

                        $("body").append("<div class='pointer #{obj.peer}'>#{obj.peer}</div>") unless $(".pointer.#{obj.peer}").length

                        $(".pointer.#{obj.peer}").css
                            top : obj.data.pageY
                            left : obj.data.pageX

                        # $(".pointer.#{obj.peer}").animate
                        #     top : obj.data.pageY
                        #     left : obj.data.pageX
                        # ,100

                    when "click"
                        a = 2
                        # a = $().trigger(obj.data.type,obj.peer)
                        clickedElement = document.elementFromPoint(obj.data.pageX, obj.data.pageY)
                        $(clickedElement).trigger("click",p2p.peerid)
                        console.log clickedElement

                    when "focusin"
                        a = 2
                        # a = $().trigger(obj.data.type,obj.peer)
                        clickedElement = document.elementFromPoint(obj.data.pageX, obj.data.pageY)
                        console.log clickedElement

                        setTimeout ->
                            log 'triggerin focus'
                            $(clickedElement).trigger("focus", p2p.peerid)
                        , 10


            else
                @db.set
                    peer : obj.peer
                    dept : obj.dept
                    arrv : @db.utcTime()
                    path : obj.path
                ,obj.data

            # scrollDown()

        c.on "close", ->
            console.log  "#{c.peer} has left the chat."
            delete connectedPeers[c.peer]

        connectedPeers[c.peer] = c
        # console.log connectedPeers



p2p = new P2P


log {MY_ID}
p2p.join()

after = (t,fn) -> setTimeout fn,t*1000
every = (t,fn) -> setInterval(fn,t*1000)





# peerid = $.cookie("peerid")
# console.log "-->:",peerid


window.publicChannel = publicChannel = null
$(document).ready ->
    chatbox       = $("<div></div>").addClass("connection").addClass("active").attr("id", "general")
    header        = $("<h1></h1>").html("Chat with <strong>Public</strong>")
    window.publicChannel = publicChannel = $("<div><em>You are connected.</em></div>").addClass("messages")
    chatbox.append header
    chatbox.append publicChannel
    $(".filler").hide()
    $("#connections").append chatbox
    $("#text").html "{'a':1,'b':{'c':3}}"

    p2p.connectToPeers()

    # doNothing = (e) -> e.preventDefault(); e.stopPropagation();

    $("#connect").click -> connectToPeer $("#rid").val()

    $("#close").click -> eachActiveConnection (c) -> c.close()

    $("#send").submit (e) ->
        e.preventDefault()
        msg = $("#text").val()
        # $("#text").val ""
        $("#text").focus()

        # publicChannel.append "<div><span class=\"you\">You: </span>" + msg + "</div>"
        obj = p2p.db.set {}, msg
        p2p.broadcast obj

    # Show browser version
    $("#browsers").text navigator.userAgent

# Make sure things clean up properly.
window.onunload = window.onbeforeunload = (e) ->
    peer.destroy()    if !!peer and not peer.destroyed

