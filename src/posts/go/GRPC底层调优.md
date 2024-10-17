---
hide: true
---
# GRPC多路复用

### 场景题，client Dial一个8100端口，客户端持有了1个TCP连接，对吗，如果有多个请求，这几个请求是顺序执行的吗
```
是建立起一个连接，获取一个ClientConn(TCP连接建立、TLS握手等封装)
多个请求的话都会使用这个连接，发送如果顺序在传输层也是顺序，但是server的响应不会是顺序的

比如GetUserInfo后执行ClientConnInterface.Invoke的实现之中
SendMsg之后，阻塞到RecvMsg
```

### server的lister获取了一个net.Listener监听一个端口，这个端口收到多个数据包，他的执行次序是这么样的
```
server.Server执行后会阻塞在一个for循环不断的等待net.Listener.Accept
传输层的次序应用层管不了，我们通过socket与传输层沟通，而accept这个方法就是传输层的数据给过来的时候
执行次序当然取决于accept接收数据包的顺序

上面说的监听一个端口只是创建了一个套接字socket
也就是获取一个应用层和传输的沟通的媒介

server.socket.bind只能1个bind: address already in use
client.net.Dial可以多个
```

### grpc需要连接池吗

### service的Listen和Client的Dial的源码解析

### 客户端请求失败后会默认重试吗

### 为什么要用HTTP/2作为传输协议

### 在Kubernetes中gRPC负载均衡有问题

###  grpc.Dial默认是异步还是同步连接，DialContext的context什么时候会失效

# 关键词

1. HTTP/2，双向流、流量控制WINDOW_UPDATE、Protobuf序列化压缩、头部压缩、单TCP连接上的多复用请求

2. 服务端关键的方法 grpc.NewServer、grpc.RegisterService、grpc.Server.Serve(net.Listener)
```
Server(net.Listener)的时候传入TCPConn 基于 TCP Listener
最后启动for循环不断等待listener.Accept接收到net.Conn传递给新协程处理
这for循环内有一个time.Sleep休眠从5ms到1s之间
```

3. 客户端的DialContext
```
ClientConn等一堆初始化
基于进程 LB）负载均衡配置

addrConn.connect
addrConn.resetTransport (不断地去尝试创建连接,Backoff算法的重试机制直至成功或者直到上下文取消)
addrConn.createTransport
addrConn.getReadyTransport

重试机制最大间隔时间120s

异步连接 
WithBlock可以同步连接，会阻塞DialContext直至连接会到达Ready状态（握手成功）
```

4. 客户端的调用最终是grpc.invoke
```
newClientStream 获取传输层Trasport并组合ClientStream（负载均衡、超时控制）都在这一步
cs.SendMsg 发送请求
cs.RecvMsg 阻塞等待请求结果回来
```

5. 客户端关闭连接client.ClientConn.Close
```
清空并关闭客户端连接\解析器连接\负载均衡连接等
```

6. 如果不断Dial却不调用Close会导致内存泄漏
```
TCP连接也会一直占用
```

7. 频繁创建ClientConn会出现资源句柄过多的情况，建议池化或者公用
```
dialing dial tcp :10001: socket: too many open file
```

6. k8s中，因为HTTP/2每次请求会复用原有连接（http/1.1会每次请求创建新连接）
```
kube-proxy的负载均衡在创建连接时候有效，复用原有连接就会导致所有的grpc请求都到了同一个服务
（使用 k8s service 做负载均衡的情况下）
```

7. gRPC 有四种调用方式，分别是一元、服务端/客户端流式、双向流式

### 相关博客

[why write: broken pipe](https://blog.csdn.net/cljdsc/article/details/124134531)
[gRPC 客户端调用服务端需要连接池吗](https://juejin.cn/post/7118357388561907743)
[从实践到原理，带你参透 gRPC](https://eddycjy.gitbook.io/golang/di-1-ke-za-tan/talking-grpc)