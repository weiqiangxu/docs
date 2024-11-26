# GRPC

> 使用`go-grpc`作为扩展库

### 一、grpc常用API

```go
// 创建一个TCP监听
lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
if err != nil {
    log.Fatalf("failed to listen: %v", err)
}

s := grpc.NewServer(
    grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
        // 最小连接空闲时间，在此时间后若没有活动则发送 keepalive ping
        MinTime:             5 * time.Second, 
        // 即使没有活动的流也允许发送 keepalive ping
        PermitWithoutStream: true,
    }),
    grpc.KeepaliveParams(keepalive.ServerParameters{
        // 服务端发送 keepalive ping 的时间间隔
        Time:    2 * time.Hour, 
        // 服务端等待 keepalive ping 响应的超时时间
        Timeout: 20 * time.Second,
    }),
)
```

```go
// 客户端
// 设置 keepalive 参数
params := keepalive.ClientParameters{
    // 空闲多长时间后发送 keepalive ping
    Time:                5 * time.Second,
    // ping之后多久没收到算超时
    Timeout:             1 * time.Second,
    // true 即使没有活动的流
    // 客户端也会发送 keepalive ping
    PermitWithoutStream: true,
}
opts := []grpc.DialOption{
    grpc.WithKeepaliveParams(params),
    grpc.WithInsecure(),
}

// 建立连接
conn, err := grpc.Dial("localhost:50051", opts...)
if err!= nil {
    log.Fatalf("无法连接到服务器：%v", err)
}
defer conn.Close()
```


```proto
// 一元 RPC（Unary RPC）简单RPC 
rpc GetFeature(Point) returns (Feature) {}


// 服务器端流式RPC
// 1.实时更新的场景服务器即时推送数据 
// 2.服务器事件主动推送数据 
// 3.长时间任务比如备份
rpc ListFeatures(Rectangle) returns (stream Feature) {}


// 客户端流式RPC
// 1.大文件传输可以分块传输可以避免一次性加载到内存
// 2.实时数据采集比如client持续将采集到的日志推送给服务器
rpc RecordRoute(stream Point) returns (RouteSummary) {}

// 双向流式RPC
// 1.即时聊天应用
// 2.在线游戏
rpc RouteChat(stream RouteNote) returns (stream RouteNote) {}
```


### 二、grpc的底层原理

1. 通信协议`HTTP/2`
2. 序列化使用`Protocol Buffers`
    - 二进制格式序列化速度更快(Json是文本格式)
    - 类型特定编码可以更紧凑地表示数据
3. 支持跨语言的`Protocol Buffers`和`gRPC`


### 三、如何池化连接

1. 最大连接\最小连接\最大空闲连接
3. 扩缩容机制(`pool.Get()`遍历连接池选择扩容或者等待和`unaryInterceptor`请求完成后判定是否缩容)
4. 保活(`keppAlive`异常定时器回收连接`conn.State`)
5. 互斥锁请求等待

### Q&A

1. client Dial一个8100端口，客户端持有了1个TCP连接，对吗，如果有多个请求，这几个请求是顺序执行的吗
```
是建立起一个连接，获取一个ClientConn(TCP连接建立、TLS握手等封装)
多个请求的话都会使用这个连接，发送如果顺序在传输层也是顺序，但是server的响应不会是顺序的

比如GetUserInfo后执行ClientConnInterface.Invoke的实现之中
SendMsg之后，阻塞到RecvMsg
```

2. server的lister获取了一个net.Listener监听一个端口，这个端口收到多个数据包，他的执行次序是这么样的
```
server.Server执行后会阻塞在一个for循环不断的等待net.Listener.Accept
传输层的次序应用层管不了，我们通过socket与传输层沟通，而accept这个方法就是传输层的数据给过来的时候
执行次序当然取决于accept接收数据包的顺序

上面说的监听一个端口只是创建了一个套接字socket
也就是获取一个应用层和传输的沟通的媒介

server.socket.bind只能1个bind: address already in use
client.net.Dial可以多个
```

3. go-grpc需要连接池吗(使用连接池可以减少频繁创建连接的开销)

4. 连接池如何扩缩容和保活(发起请求的时候如果最大空闲连接)
    ```txt
	1.最大空闲
	2.最大活跃
	3.最小活跃

    扩容: 请求开始时候没有连接可用、且没到最大活跃连接数触发
    缩容: 请求完成,最大空闲连接已经超出限制,定时器延迟释放
    ```

5. 在k8s之中Dial服务Service走DNS找到对应的Pod如果Pod删除了会导致丢包吗

6. 客户端请求失败后会默认重试吗

7. 为什么要用HTTP/2作为传输协议

8. 在Kubernetes中Service的负载均衡有问题

9. grpc.Dial默认是异步还是同步连接，DialContext的context什么时候会失效

10. HTTP/2，双向流、流量控制WINDOW_UPDATE、Protobuf序列化压缩、头部压缩、单TCP连接上的多复用请求

11. 服务端关键的方法 grpc.NewServer、grpc.RegisterService、grpc.Server.Serve(net.Listener)

    ```txt
    Server(net.Listener)的时候传入TCPConn 基于 TCP Listener
    最后启动for循环不断等待listener.Accept接收到net.Conn传递给新协程处理
    这for循环内有一个time.Sleep休眠从5ms到1s之间
    ```

12. 客户端的DialContext

```go
ClientConn等一堆初始化
基于进程 LB 负载均衡配置

addrConn.connect
// 不断地去尝试创建连接
// Backoff算法的重试机制直至成功或者直到上下文取消
addrConn.resetTransport
addrConn.createTransport
addrConn.getReadyTransport

重试机制最大间隔时间120s

异步连接 
WithBlock可以同步连接，会阻塞DialContext直至连接会到达Ready状态（握手成功）
```

13. 客户端的调用最终是grpc.invoke

```
newClientStream 获取传输层Trasport并组合ClientStream（负载均衡、超时控制）都在这一步
cs.SendMsg 发送请求
cs.RecvMsg 阻塞等待请求结果回来
```

14. 客户端关闭连接client.ClientConn.Close
```
清空并关闭客户端连接\解析器连接\负载均衡连接等
```

15. 如果不断Dial却不调用Close会导致内存泄漏
```
TCP连接也会一直占用
```

16. 频繁创建ClientConn会出现资源句柄过多的情况，建议池化或者公用
```
dialing dial tcp :10001: socket: too many open file
```

17. k8s中，因为HTTP/2每次请求会复用原有连接（http/1.1会每次请求创建新连接）
```
kube-proxy的负载均衡在创建连接时候有效，复用原有连接就会导致所有的grpc请求都到了同一个服务
（使用 k8s service 做负载均衡的情况下）
```

18. gRPC 有四种调用方式，分别是一元、服务端/客户端流式、双向流式

19. grpc的keepalive底层原理是什么(定时ping)

20. 如果grpc的keepalive触发ping以后没有回音
    - 多次重试发送 ping 消息
    - 多次重试后仍然没有收到服务器的回应触发错误处理机制
    - 对错误处理怎么实现重新连接或丢弃连接

    ```go
    ```

21. 在容器内部使用ServiceName发起grpc连接如果容器重启了会怎么样，很多连接失败吗，如果触发keepalive之后呢

22. grpc为什么使用HTTP/2

23. 实现连接池需要实现哪几块

24. grpc使用了`HTTP/2`需要指定http开启长连接吗

25. http/1.1如果没有指定长连接会在请求完成以后直接释放tcp连接吗

26. go-grpc客户端可以keepalive那么服务端可以吗(可以)


27. GRPC特性

- 多路复用。HTTP/2作为应用层的传输协议。HTTP/2会复用传输层的TCP连接，但是Client有些条件些会新建连接（server发送GOAWAY Frame也会强制让client新建连接）
- 一次GRPC调用就产生一个Stream（Stream包含多个Frame,Frame也是HTTP/2最小传输单位）
- 一条GRPC连接允许并发的发送和接收多个Stream（服务端默认100个）控制参数MaxConcurrentStreams
- 超时重连。创建连接后有一个goroutine负责重连机制,自带的`Dial`或者`DialContext`没有`WithBlock`的话是异步建立连接，会有重试机制。


### 相关博客

- [why write: broken pipe](https://blog.csdn.net/cljdsc/article/details/124134531)
- [gRPC 客户端调用服务端需要连接池吗](https://juejin.cn/post/7118357388561907743)
- [从实践到原理，带你参透 gRPC](https://eddycjy.gitbook.io/golang/di-1-ke-za-tan/talking-grpc)
- [语言指南 (proto3) ](https://developers.google.com/protocol-buffers/docs/proto3#simple)
- [gRPC 官方文档中文版](http://doc.oschina.net/grpc?t=60133)
- [GO gRPC 官方文档](https://grpc.io/docs/languages/go/quickstart/)
- [Protobuf 语法指南](https://colobu.com/2015/01/07/Protobuf-language-guide)
- [silenceper/pool/](https://github.com/silenceper/pool/blob/master/README_ZH_CN.md)
- [gRPC 应用篇之客户端 Connection Pool](https://pandaychen.github.io/2020/10/03/DO-WE-NEED-GRPC-CLIENT-POOL/)
- [GRPC连接池的设计与实现](https://zhuanlan.zhihu.com/p/100200985)