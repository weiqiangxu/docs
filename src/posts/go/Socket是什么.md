---
hide: true
---
# socket

### 复习一下TCP/IP
```
pid是一个机器内标识2个进程的东西
网络层IP协议的ip地址标识主机
TCP是ip地址+协议+端口号标识网络中的一个进程
```

### 概念
```
socket套接字，应用层和传输层之间的抽象层，它把tcp\ip层的复杂操作抽象为几个接口

换句话说，应用层通过socket和传输层沟通
```

### 接口

```golang
type server interface {
    bind
    listen
    accept
    recv
    close
}
```

```golang
type client interface {
    connect
    send
    close
}
```

### golang的net包提供的接口有

```golang
Close(net.Conn)
Reader(net.Conn)
Write(net.Conn)

net.Listen()
net.Listen().Accept()
net.Dial()
net.ListenUDP()
net.DialUDP()
```

### 本地端口假设是8080只能有一个server.Listener

### 本地端口client.Connect一个端口可以创建多个socket连接

### 一台Linux服务器最多能支撑多少个TCP连接

### 相关术语

```text
TCP连接四元组是源IP地址、源端口、目的IP地址和目的端口

ip最大是255.255.255.255 (4个8bit)（IPV4其实是个4字节的数据）

2的8次方=256（一个8bit的数据有256种十进制数据）

理论上

原地址IP端口组合（2的32次方（ip数）×2的16次方（port数））与目标地址IP端口组合 

就是TCP连接的最大数量 （server.Listen）
```

### 操作系统对打开的文件数量有限制 socket too many open file

### socket会消耗系统内存，linux系统在多个位置都限制了可打开的文件描述符的数量

```text
系统级fs.file-max
用户级/etc/security/limits.conf
进程级fs.nr_open
```

### IO多路复用(时分多路复用) 一个线程可以管理多个TCP连接

### C10K并发处理万个连接的代名词

### 每个TCP连接需要的资源

1. 内存
2. CPU
3. 端口号
4. 文件描述符
5. 线程

### 相关文章

[一台Linux服务器最多能支撑多少个TCP连接](https://blog.csdn.net/qq_16059847/article/details/116102880)

[Go语言使用net包实现Socket网络编程](https://segmentfault.com/a/1190000022734659)

[C10k](https://en.wikipedia.org/wiki/C10k_problem)