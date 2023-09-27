package main

import (
	"go-rtsp-websocket/middleware"
	"log"
	"net/http"
	"time"

	"github.com/deepch/vdk/format/mp4f"
	"github.com/gin-gonic/gin"
	"golang.org/x/net/websocket"
)

func ServeHTTP() {
	router := gin.Default()
	router.Use(middleware.LoggerToFile())
	router.LoadHTMLGlob("web/templates/*")
	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.tmpl", gin.H{
			"port":    Config.Server.HTTPPort,
			"version": time.Now().String(),
		})
	})
	router.GET("/ws/:suuid", func(c *gin.Context) {
		handler := websocket.Handler(ws)
		handler.ServeHTTP(c.Writer, c.Request)
	})
	router.StaticFS("/static", http.Dir("web/static"))
	err := router.Run(Config.Server.HTTPPort)
	if err != nil {
		log.Fatalln(err)
	}
}
func ws(ws *websocket.Conn) {
	defer ws.Close()
	suuid := ws.Request().FormValue("suuid")
	url := ws.Request().FormValue("url")
	log.Println("Request", suuid, url)
	if !Config.ext(suuid) && url != "undefined" && url != "null" {
		Config.add(suuid, url)
		go ServeStreams(suuid, url)
		time.Sleep(1 * time.Second)
	}

	ws.SetWriteDeadline(time.Now().Add(5 * time.Second))
	log.Println("Streams", len(Config.Streams))
	cuuid, ch := Config.clAd(suuid)
	defer Config.clDe(suuid, cuuid)
	codecs := Config.coGe(suuid)
	if codecs == nil {
		log.Println("No Codec Info")
		return
	}
	muxer := mp4f.NewMuxer(nil)
	muxer.WriteHeader(codecs)
	meta, init := muxer.GetInit(codecs)
	err := websocket.Message.Send(ws, append([]byte{9}, meta...))
	if err != nil {
		return
	}
	err = websocket.Message.Send(ws, init)
	if err != nil {
		return
	}
	var start bool
	for {
		select {
		case pck := <-ch:
			if pck.IsKeyFrame {
				start = true
			}
			if !start {
				continue
			}
			ready, buf, _ := muxer.WritePacket(pck, false)
			if ready {
				ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
				err := websocket.Message.Send(ws, buf)
				if err != nil {
					return
				}
			}
		}
	}

}
