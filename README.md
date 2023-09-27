## 基于Golang的RTSP转Websocket程序
测试过海康威视摄像头，取RTSP流通过Websocket在浏览器播放实时画面

## 必备条件
h264、aac

## 启动

windows上需要在git bash内

启动命令：go run *.go

## 修改
#### 2023-9-27
加载rtsp的方式从config读取改为ws传入的方式，传入后保存在Config.Streams中，不同的rtsp视频流需要传入不同的suuid，否则将会根据已有的suuid来播放