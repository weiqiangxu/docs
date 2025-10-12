# lsof

> lsof 查看进程打开了多少个文件或者网络套接字

``` bash
$ ps aux | grep openvswitch

# 查询进程ID为65191的进程打开的文件或网络套接字的命令
$ lsof -p 65191

# 查看进程打开了多少个文件或者网络套接字
$ lsof -p 21764
COMMAND(进程名称) PID(进程号) USER(进程拥有者)   FD(文件描述符)    TYPE(文件类型) DEVICE(设备或者文件系统的信息) SIZE/OFF(文件的大小)  NODE(文件的节点编号) NAME(文件的路径和名称)
ovs-vswit       21764      root              cwd(当前工作目录)  DIR              253,3     4096       128 /
ovs-vswit       21764      root              rtd(根目录)       DIR              253,3     4096       128 /
ovs-vswit       21764      root              txt              REG              253,3 16136816   1820044 /usr/sbin/ovs-vswitchd
ovs-vswit       21764      root              mem              REG              253,3  1531880      2546 /usr/lib64/libc-2.28.so
ovs-vswit       21764      root              mem              REG              253,3   724008      2550 /usr/lib64/libm-2.28.so
ovs-vswit       21764      root              mem              REG              253,3    68152      2562 /usr/lib64/librt-2.28.so
ovs-vswit       21764      root              mem              REG              253,3   136544      2558 /usr/lib64/libpthread-2.28.so
ovs-vswit       21764      root              mem              REG              253,3    67640    332375 /usr/lib64/libatomic.so.1.2.0
ovs-vswit       21764      root              mem              REG              253,3   204088      2539 /usr/lib64/ld-2.28.so

```

### 1.lsof的FD有多少种类型

lsof的FD（文件描述符）有以下几种类型：
1. Regular file（常规文件）：普通的磁盘文件、包括文本、二进制和可执行文件，如 /etc/passwd、/usr/bin/python 等。
2. Directory（目录）：包含文件和文件夹的文件夹，如 /tmp、/usr/bin 等。
3. Internet socket（网络套接字）：进程之间通信的套接字文件，如 TCP、UDP、IPv4、IPv6 等。
4. Pipe（管道）：进程间通信的无名管道文件、命名管道文件（FIFO）或管道文件，如 /tmp/test.fifo、/dev/poll 等。
5. Character special file（字符特殊文件）：设备文件，如 /dev/sda、/dev/zero 等。
6. Block special file（块特殊文件）：同样是设备文件，但以块为单位读写，如 /dev/sda1、/dev/sda2 等。
7. Event Poll file（事件轮询文件）：Linux 内核提供的高性能 I/O 多路复用机制，如 /dev/eventpoll。
8. Unknown（未知类型）：lsof 无法识别的文件类型，如 /dev/tty，这个设备文件可以被认为是字符特殊文件或网络套接字文件。


### 2.lsof 的命令 FD 是mem是什么意思

mem则表示该进程打开的内存映射文件（Memory Mapped File）

### 3.lsof的type是REG 和DIR 分别是什么意思

在 lsof 输出中，REG 和DIR 都是文件类型（TYPE）的一种，分别代表以下含义：
1. REG：代表一个普通的磁盘文件，包括文本、二进制和可执行文件等。比如，/etc/passwd 和 /usr/bin/python 都是 REG 类型的。
2. DIR：代表一个目录（文件夹），其中包含了其他文件和文件夹。比如，/tmp 和 /usr/bin 都是 DIR 类型的。
通过 lsof 命令可以查看一个进程打开的所有文件和文件类型，对于 REG 和 DIR 类型的文件，可以通过实时监测它们的变化来了解系统中的文件情况，进而更好地维护系统。


