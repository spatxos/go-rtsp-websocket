if (!Uint8Array.prototype.slice) {
  Object.defineProperty(Uint8Array.prototype, 'slice', {
    value: function(begin, end) {
      return new Uint8Array(Array.prototype.slice.call(this, begin, end));
    }
  });
}

var verbose = true;
var streamingStarted = false;
var ms = new MediaSource();
var queue = [];
var ws;

function pushPacket(arr) {
  var view = new Uint8Array(arr);
  if (verbose) {
    console.log("got", arr.byteLength, "bytes.  Values=", view[0], view[1], view[2], view[3], view[4]);
  }
  data = arr;
  if (!streamingStarted) {
    sourceBuffer.appendBuffer(data);
    streamingStarted = true;
    return;
  }
  queue.push(data);
  if (verbose) {
    console.log("queue push:", queue.length);
  }
  if (!sourceBuffer.updating) {
    loadPacket();
  }
}

function loadPacket() {
  if (!sourceBuffer.updating) {
    if (queue.length > 0) {
      inp = queue.shift();
      if (verbose) {
        console.log("queue PULL:", queue.length);
      }
      var view = new Uint8Array(inp);
      if (verbose) {
        console.log("writing buffer with", view[0], view[1], view[2], view[3], view[4]);
      }
      console.log(inp);
      sourceBuffer.appendBuffer(inp);
    } else {
      // streamingStarted = false;
    }
  }
}

var potocol = 'ws';
if (location.protocol.indexOf('s') >= 0) {
  potocol = 'wss';
}
function getHiddenProp(){
  var prefixes = ['webkit','moz','ms','o'];
  // 如果hidden 属性是原生支持的，我们就直接返回
  if ('hidden' in document) {
    return 'hidden';
  }
  // 其他的情况就循环现有的浏览器前缀，拼接我们所需要的属性 
  for (var i = 0; i < prefixes.length; i++){
    // 如果当前的拼接的前缀在 document对象中存在 返回即可
    if ((prefixes[i] + 'Hidden') in document) {
      return prefixes[i] + 'Hidden';
    }  
  }
  // 其他的情况 直接返回null
  return null;
}
var visProp = getHiddenProp();
if (visProp) {
  // 有些浏览器也需要对这个事件加前缀以便识别。
  var evtname = visProp.replace(/[H|h]idden/, '') + 'visibilitychange';
  var oldState = "visible";
  document.addEventListener(evtname, function () {
    var nowstate = document[getVisibilityState()];
    document.title = nowstate+"状态";
    console.log(nowstate)
    if(oldState!=nowstate){
       switch(nowstate){
          case "visible":
            startup()
            break;
          case "hidden":
            ws.close()
            ms.removeEventListener("sourceopen", opened, false);
            livestream.src = "";
            break;
       }
       oldState = nowstate;
    }
  },false);
}
function getVisibilityState() {
  var prefixes = ['webkit', 'moz', 'ms', 'o'];
  if ('visibilityState' in document) {
    return 'visibilityState';
  }
  for (var i = 0; i < prefixes.length; i++) {
    if ((prefixes[i] + 'VisibilityState') in document){
      return prefixes[i] + 'VisibilityState';
    }  
  }
  // 找不到返回 null
  return null;
}
function opened() {
  var suuid = $('#suuid').val();
  var url = $('#url').val();
  var port = $('#port').val();
  ws = new WebSocket(potocol + "://127.0.0.1:"+port+"/ws/live?suuid="+suuid+"&url="+url);
  // ws = new WebSocket(potocol + "://127.0.0.1:8888/ws/live?suuid=demo1");

  ws.binaryType = "arraybuffer";
  ws.onopen = function(event) {
    console.log('Connect');
  }
  ws.onmessage = function(event) {
    var data = new Uint8Array(event.data);
    if (data[0] == 9) {
      decoded_arr=data.slice(1);
      if (window.TextDecoder) {
        mimeCodec = new TextDecoder("utf-8").decode(decoded_arr);
      } else {
        mimeCodec = Utf8ArrayToStr(decoded_arr);
      }
      if (verbose) {
        console.log('first packet with codec data: ' + mimeCodec);
      }
      sourceBuffer = ms.addSourceBuffer('video/mp4; codecs="' + mimeCodec + '"');
      sourceBuffer.mode = "segments"
      sourceBuffer.addEventListener("updateend", loadPacket);
    } else {
      pushPacket(event.data);
    }
  };
}
var livestream = document.getElementById('livestream');

function Utf8ArrayToStr(array) {
  var out, i, len, c;
  var char2, char3;
  out = "";
  len = array.length;
  i = 0;
  while (i < len) {
    c = array[i++];
    switch (c >> 4) {
      case 7:
        out += String.fromCharCode(c);
        break;
      case 13:
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
          ((char2 & 0x3F) << 6) |
          ((char3 & 0x3F) << 0));
        break;
    }
  }
  return out;
}

function startup() {
  if(ws!=undefined){
    ws.close()
    ms.removeEventListener("sourceopen", opened, false);
    livestream.src = "";
  }
  ms.addEventListener('sourceopen', opened, false);
  livestream.src = window.URL.createObjectURL(ms);
}

// $(document).ready(function() {
//   startup();
// });
