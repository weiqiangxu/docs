---
title: broken pipe异常解析
tags:
  - network
categories:
  - network
---


# why write: broken pipe

[golang服务报错: write: broken pipe](https://blog.csdn.net/cljdsc/article/details/124134531)

[重现broken pipe: 讲解很清晰](https://piaohua.github.io/post/golang/20220731-connection-broken-pipe/)

[Gin Error Connection Write Broken Pipe](https://reid00.github.io/posts/gin-error-connection-write-broken-pipe/)

[nginx\api-gateway(golang server)\backend broken pipe](https://zyun.360.cn/blog/?p=1634)

[记一次connection-reset-by-peer问题定位-状态流转很详细](https://testerhome.com/articles/23296)

[如何在Golang中强制关闭TCP连接](https://itnext.io/forcefully-close-tcp-connections-in-golang-e5f5b1b14ce6)

[服务端大量close_wait 和 time_wait状态](https://www.cnblogs.com/taoshihan/p/14785384.html)

[Go 中如何强制关闭 TCP 连接](https://blog.csdn.net/EDDYCJY/article/details/120898217)

[抓包 127.0.0.1 （loopback） 使用 tcpdump+wireshark][https://www.bbsmax.com/A/D854qmj6dE/]

[浅谈Close Wait - 写的简单明了](https://huoding.com/2016/01/19/488)

[Socket图解](https://www.topgoer.com/%E7%BD%91%E7%BB%9C%E7%BC%96%E7%A8%8B/socket%E7%BC%96%E7%A8%8B/socket%E5%9B%BE%E8%A7%A3.html)


1. ulimit -n 连接数过大
2. 调用者在接收到服务端响应之前断开连接

### client返回server RST包是什么意思

### 连接状态为CLOSE_WAIT的连接，是什么意思，怎么看

### 客户端设置的响应超时时间5秒，如何设置

### broken pipe 和 reset by peer 分别是什么

### 压测计量QPS的时候有很多broken pipe，加大连接数可以提升QPS吗

### tcpdump工具的使用

### accept 的 backlog是什么

### 如何看本机器是否有很多的Close Wait状态连接

### Close Wait堆积的原因是什么

### TCP SOCKET 状态表：

``` bash
CLOSED: 关闭状态，没有连接活动
LISTEN: 监听状态，服务器正在等待连接进入
SYN_SENT: 已经发出连接请求，等待确认
SYN_RCVD: 收到一个连接请求，尚未确认
ESTABLISHED: 连接建立，正常数据传输状态
FIN_WAIT_1:（主动关闭）已经发送关闭请求，等待确认
FIN_WAIT_2:（主动关闭）收到对方关闭确认，等待对方关闭请求
CLOSE_WAIT:（被动关闭）收到对方关闭请求，已经确认
LAST_ACK:（被动关闭）等待最后一个关闭确认，并等待所有分组死掉
TIMED_WAIT: 完成双向关闭，等待所有分组死掉
CLOSING: 双方同时尝试关闭，等待对方确认
```

### 什么情况下会有非常多的CLOSE_WAIT

### Gin什么时候会在response之前关闭TCP连接

### 环回地址

### netstat && ping

### mac tcpdump

```bash
sudo tcpdump port 80 -n 
curl www.baidu.com:80
```

``` bash
# 显示ip而不是主机名
-n

# 不列出域名
-N

# 快速输出仅列出少数的传输协议信息
-q

tcpdump -D 

# 环回地址
lo0 [Up, Running, Loopback]

sudo tcpdump -i lo0 src host localhost and dst host localhost and src port 9090 -n

sudo tcpdump -i lo0 src host localhost and dst host localhost and dst port 9090 -n

sudo tcpdump -i lo0 host localhost and dst port 9292 -n

sudo tcpdump -i lo0 host localhost and src port 9292 -n

curl 127.0.0.1:9090
```

### 监听示范
``` bash
# src 9292

22:38:22.028257 IP 127.0.0.1.9292 > 127.0.0.1.50139: Flags [S.], seq 2936404470, ack 2399477565, win 65535, options [mss 16344,nop,wscale 6,nop,nop,TS val 2141525572 ecr 2939320578,sackOK,eol], length 0
22:38:22.028287 IP 127.0.0.1.9292 > 127.0.0.1.50139: Flags [.], ack 1, win 6379, options [nop,nop,TS val 2141525572 ecr 2939320578], length 0
```

``` bash
# dst 9292

22:38:22.028149 IP 127.0.0.1.50139 > 127.0.0.1.9292: Flags [S], seq 2399477564, win 65535, options [mss 16344,nop,wscale 6,nop,nop,TS val 2939320578 ecr 0,sackOK,eol], length 0
22:38:22.028278 IP 127.0.0.1.50139 > 127.0.0.1.9292: Flags [.], ack 2936404471, win 6379, options [nop,nop,TS val 2939320578 ecr 2141525572], length 0
```
``` bash
# 三次握手示范

client   Flags [S],seq 2399477564, win 65535                     [SYN报文] [发完之后clent状态是SYN-SENT]
server   Flags [S.],seq 2936404470, ack 2399477565, win 65535    [报文发送后server状态是SYN-RCVD]
client   Flags [.],ack 2936404471, win 6379                      [报文发送后client状态是ESTABLISHED]  [注意这一次的报文可以携带客户端到服务端的数据了]
                                                                 [服务端收到客户端报文后状态是ESTABLISHED]
               

# 注意seq值和ack值总是相差1
# 注意握手成功后双方的状态都是ESTABLISHED
```


### close client

``` bash
# dst 9292

22:44:13.099483 IP 127.0.0.1.50943 > 127.0.0.1.9292: Flags [F.], seq 0, ack 1, win 6379, options [nop,nop,TS val 1048610910 ecr 2373676954], length 0
22:44:13.099714 IP 127.0.0.1.50943 > 127.0.0.1.9292: Flags [.], ack 2, win 6379, options [nop,nop,TS val 1048610910 ecr 2373686619], length 0
```

``` bash
# src 9292

22:44:13.099535 IP 127.0.0.1.9292 > 127.0.0.1.50943: Flags [.], ack 2, win 6379, options [nop,nop,TS val 2373686619 ecr 1048610910], length 0
22:44:13.099681 IP 127.0.0.1.9292 > 127.0.0.1.50943: Flags [F.], seq 1, ack 2, win 6379, options [nop,nop,TS val 2373686619 ecr 1048610910], length 0
```

``` bash
# 四次挥手

client   Flags [F.], seq 0, ack 1, win 6379
server   Flags [.], ack 2, win 6379
server   Flags [F.], seq 1, ack 2, win 6379
client   Flags [.], ack 2, win 6379
```


### 常用命令
``` bash
whereis tcpdump
ifconfig
/usr/sbin/tcpdump -i eth0 -n -nn host 10.xx.xx.35
netstat -an | grep xxxx
ps -ef | grep xxx
lsof -p xxx
ulimit -a
pmap -x xxx
cat /proc/$pid/smaps
strace -p $pid
pstack $pid
ls /proc/$pid/fd/  | wc -l
```


### 如何查看close wait连接数
``` bash
netstat -n | awk '/^tcp/ {++S[$NF]} END {for(a in S) print a, S[a]}'
```


### tcp窗口大小

``` bash
初始窗口大小为 65，535 字节
```

[TCP窗口大小](https://learn.microsoft.com/zh-cn/troubleshoot/windows-server/networking/description-tcp-features#tcp-window-size)
[面试官：换人！他连 TCP 这几个参数都不懂](https://mp.weixin.qq.com/s/fjnChU3MKNc_x-Wk7evLhg)