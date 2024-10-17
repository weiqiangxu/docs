---
title: TCP连接与抓包
tags:
  - network
categories:
  - network
---

# tcp连接与抓包

1. 使用golang做tcp网络编程创建client && server
2. 使用tcpdump监听客户端和服务端的连接情况


### tcpdump 
```
# client
sudo tcpdump -i lo0 host localhost and dst port 9292 -n
# server
sudo tcpdump -i lo0 host localhost and src port 9292 -n
```

### 三次握手
```
# src 9292

22:38:22.028257 IP 127.0.0.1.9292 > 127.0.0.1.50139: Flags [S.], seq 2936404470, ack 2399477565, win 65535, options [mss 16344,nop,wscale 6,nop,nop,TS val 2141525572 ecr 2939320578,sackOK,eol], length 0
22:38:22.028287 IP 127.0.0.1.9292 > 127.0.0.1.50139: Flags [.], ack 1, win 6379, options [nop,nop,TS val 2141525572 ecr 2939320578], length 0
```

```
# dst 9292

22:38:22.028149 IP 127.0.0.1.50139 > 127.0.0.1.9292: Flags [S], seq 2399477564, win 65535, options [mss 16344,nop,wscale 6,nop,nop,TS val 2939320578 ecr 0,sackOK,eol], length 0
22:38:22.028278 IP 127.0.0.1.50139 > 127.0.0.1.9292: Flags [.], ack 2936404471, win 6379, options [nop,nop,TS val 2939320578 ecr 2141525572], length 0
```
```
# 简化一下

client   Flags [S],seq 2399477564, win 65535                     [SYN报文] [发完之后clent状态是SYN-SENT]
server   Flags [S.],seq 2936404470, ack 2399477565, win 65535    [报文发送后server状态是SYN-RCVD]
client   Flags [.],ack 2936404471, win 6379                      [报文发送后client状态是ESTABLISHED]  [注意这一次的报文可以携带客户端到服务端的数据了]
                                                                 [服务端收到客户端报文后状态是ESTABLISHED]
               

# 注意seq值和ack值总是相差1
# 注意握手成功后双方的状态都是ESTABLISHED
```


### 四次挥手
```
# dst 9292

22:44:13.099483 IP 127.0.0.1.50943 > 127.0.0.1.9292: Flags [F.], seq 0, ack 1, win 6379, options [nop,nop,TS val 1048610910 ecr 2373676954], length 0
22:44:13.099714 IP 127.0.0.1.50943 > 127.0.0.1.9292: Flags [.], ack 2, win 6379, options [nop,nop,TS val 1048610910 ecr 2373686619], length 0
```

```
# src 9292

22:44:13.099535 IP 127.0.0.1.9292 > 127.0.0.1.50943: Flags [.], ack 2, win 6379, options [nop,nop,TS val 2373686619 ecr 1048610910], length 0
22:44:13.099681 IP 127.0.0.1.9292 > 127.0.0.1.50943: Flags [F.], seq 1, ack 2, win 6379, options [nop,nop,TS val 2373686619 ecr 1048610910], length 0
```

```
# 四次挥手

client   Flags [F.], seq 0, ack 1, win 6379
server   Flags [.], ack 2, win 6379
server   Flags [F.], seq 1, ack 2, win 6379
client   Flags [.], ack 2, win 6379
```

### 来学学TCP调优

[换人！他连TCP这几个参数都不懂](https://mp.weixin.qq.com/s/fjnChU3MKNc_x-Wk7evLhg)

### 调优大纲

1. 握手调优
2. 挥手调优
3. 传输调优


### 握手调优

1. client超时重传机制
2. server response && Linux内核半连接队列溢出 && 服务端重发SYN+ACK 报文 && 服务端ESTABLISHED后变accept队列（全连接队列） && 全连接队列溢出
3. client response 

### 报文

> SYN 的全称就叫 Synchronize Sequence Numbers(同步序列号)(TCP头部格式之中有保留的6位)

1. SYN
2. RST
3. FIN
4. ACK
5. URG
6. PSH

### 状态流转
1. SYN_SENT
2. SYN_RCV
3. ESTABLISHED


### nginx调整半连接队列大小backlog

### syncookies
> 开启 syncookies 功能就可以在不使用 SYN 半连接队列的情况下成功建立连接。

### SYN攻击

### 服务器收到 ACK 后连接建立成功，accept队列（全连接队列）溢出，TCP连接被丢弃

### 服务端已经收到了ACK，但是因为accept队列（全连接队列）溢出导致TCP连接被丢弃，告知客户端的话，客户端异常会收到 connection reset by peer
> 服务端全连接队列溢出 connection reset by peer
> 正常来说服务端全连接溢出，server直接丢弃client.ack就好了，client过一会儿会自动重新发送ack
> 或者加大accpet队列长度


### 如何查看server的accpet队列长度
```
ss -ltn
```

### 查看由于 accept 连接队列已满，而被丢弃的连接

### HTTP 请求必须在一个 RTT（从客户端到服务器一个往返的时间）后才能发送 是什么意思
```
意味着 client SYN 之后 server response SYN+ACK 之后

client此时就可以发送数据了

注意此时服务端是半连接队列状态client就可以发送数据了

RTT是一个往返
```

<hr>

### 四次挥手的性能提升

### 仅仅涉及两种报文
1. FIN
2. ACK

### 状态
1. ESTABLISHED
2. FIN_WAIT1
3. CLOSE_WAIT
4. FIN_WAIT2
5. LAST_ACK
6. TIME_WAIT

### 主动关闭连接的，才有 TIME_WAIT 状态




### 优化思路一：主动方的优化

> 关闭的方式： 1.RST 报文关闭  2.FIN 报文关闭

### 进程异常退出，内核发送RST报文

### 滑动窗口是如何影响传输速度的
1. 包的往返时间越长，网络的吞吐量就会越低；所以单程携带更多，就是批量发送报文批量处理报 文字


[收到RST，就一定会断开TCP连接吗？](https://mp.weixin.qq.com/s/jomA0WT6zul1zrGzuBqOkA)

> 本端收到远端发来的RST后，内核已经认为此链接已经关闭

1. 应用层尝试去执行 读数据操作，比如recv，应用层就会收到 Connection reset by peer 的报错，意思是远端已经关闭连接
2. 应用层尝试去执行写数据操作，比如send，那么应用层就会收到 Broken pipe 的报错，意思是发送通道已经坏了


### http会主动断开连接吗

### 如果线上网站出现了broken pipe怎么查BUG呢


