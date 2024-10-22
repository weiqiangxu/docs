---
title: iperf用法
tags:
  - kubernetes
categories:
  - kubernetes
---

> iperf压测网速

### 一、工具用途

测试带宽工具，具备类似功能的工具还有scp、wget。

### 二、开始带宽测试

1. 直接容器启动一个iperf3的server和client测试带宽，来一个[quickstart](https://github.com/nerdalert/iperf3/blob/master/README.md)

2. 服务器之间带宽测试

- install iperf3 

安装包下载地址[iperf.fr/iperf-download](https://iperf.fr/iperf-download.php)

``` bash
# 包管理工具安装rpm或者deb
$ rpm -ih *.rpm
$ dpkg -i *.deb
$ apt install *.deb

# 在线安装
# 如果没有找一个可靠的yum源
yum install iperf3
```

``` bash
# 源码编译安装
yum -y install gcc make wget
cd /tmp
wget https://iperf.fr/download/source/iperf-3.1.3-source.tar.gz
tar zxvf iperf-3.1.3-source.tar.gz
cd iperf-3.1.3
./configure
make
make install
```

``` bash
# 启动client && server测试
iperf3 有客户端 和 服务端之别：

服务端：收包，使用 -s 参数指定， iperf3 -s
客户端：发包，使用 -c xx.xx.xx.xx 来指定要往哪个服务端发包， iperf3 -c 172.20.20.200
```

[iperf3详细参数说明](https://www.cnblogs.com/yingsong/p/5682080.html)

### Q&A

##### 1.wget怎么测试带宽

可以使用 `wget` 命令来测试带宽，方法如下：
1. 找到一个大文件的下载链接，比如一个 ISO 镜像文件或者大型软件的安装包。
2. 在终端中使用以下命令下载该文件，并指定输出日志：
``` bash
$ wget -O /dev/null http://example.com/largefile.iso 2>&1 | tee speedtest.log
```
其中，`-O /dev/null` 表示将下载的文件输出到空设备，而不是存储在本地磁盘上，`2>&1` 表示将错误输出也重定向到日志中，`tee` 命令则将 `wget` 命令的输出同时输出到终端和日志文件中。

3. 等待下载完成后，查看日志文件中的下载速度，例如：
``` bash
Downloaded: 1 files, 734M in 8m 30s (1.44 MB/s)
```
其中 `1.44 MB/s` 就是下载速度，单位为兆字节每秒。可以多次测试，取平均值作为最终的带宽测试结果。

##### 2.scp如何测试带宽

使用 scp 测试带宽的过程如下:
1. 在一台机器上，作为服务器运行 scp 命令来监听端口。
``` bash
$ scp -v -l 8192 file.tar.gz user@remote-host:/dev/null
```
其中 8192 是带宽大小，文件名为 file.tar.gz，路径为远程主机的 /dev/null（即丢弃该文件，只是测试带宽）。
2. 在另一台机器上，作为客户端运行 scp 命令进行下载文件。
``` bash
$ scp -v user@remote-host:/path/to/file.tar.gz /dev/null
```
该命令将从远程主机下载文件并丢弃该文件，只是测试带宽。
3. 在下载完毕后，scp 将输出带宽测试结果。

``` bash
Transferred: ...........Total...........   Speed
100% ................ byes  time (s) ...  KB/s
```
其中 KB/s 表示测试的带宽。

##### 3. iperf指标查看

``` bash
Connecting to host 172.17.0.2, port 5201
[  5] local 172.17.0.3 port 33370 connected to 172.17.0.2 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec  3.55 GBytes  30.5 Gbits/sec    0    185 MBytes       
[  5]   1.00-2.00   sec  3.54 GBytes  30.5 Gbits/sec  25972    185 MBytes       
[  5]   2.00-3.00   sec  3.57 GBytes  30.6 Gbits/sec    0    185 MBytes       
[  5]   3.00-4.00   sec  3.57 GBytes  30.7 Gbits/sec    0    185 MBytes       
[  5]   4.00-5.00   sec  3.58 GBytes  30.7 Gbits/sec    0    185 MBytes       
[  5]   5.00-6.00   sec  3.54 GBytes  30.4 Gbits/sec    0    185 MBytes       
[  5]   6.00-7.00   sec  3.49 GBytes  30.0 Gbits/sec    0    185 MBytes       
[  5]   7.00-8.00   sec  3.55 GBytes  30.5 Gbits/sec    0    185 MBytes       
[  5]   8.00-9.00   sec  3.52 GBytes  30.2 Gbits/sec    0    185 MBytes       
[  5]   9.00-10.00  sec  3.54 GBytes  30.4 Gbits/sec  4294941326   0.00 Bytes    
```

- Interval：测试的时长
- Transfer：在 Interval 时长里，传输的数据量
- Bitrate：传输速率
- Jitter：网络抖动，连续发送数据包时延差值的平均值，越小说明网络质量越好
- Lost/Total Datagrams：丢失的数据包与发送的总数据包

### 相关资料

[https://iperf.fr/iperf-download.php](https://iperf.fr/iperf-download.php)
[docker images nerdalert/iperf3](https://github.com/nerdalert/iperf3)
[https://iperf.fr/download/source/iperf-3.1.3-source.tar.gz](https://iperf.fr/download/source/iperf-3.1.3-source.tar.gz)