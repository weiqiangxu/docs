---
title: openvswitch限速QoS
index_img: /images/bg/network.png
banner_img: /images/bg/computer.jpeg
tags:
  - openvswitch
  - docker
categories:
  - openvswitch
date: 2023-06-15 18:40:12
excerpt: ovs的qos的小实验，使用tc或者ovs-qos限速
sticky: 1
---

### 1.准备linux环境

- [openvswitch如何安装](https://weiqiangxu.github.io/2023/06/02/cni/openvswitch%E5%AE%89%E8%A3%85/)
- [docker离线安装](https://weiqiangxu.github.io/2023/04/18/%E8%AF%AD%E9%9B%80k8s%E5%9F%BA%E7%A1%80%E5%85%A5%E9%97%A8/docker%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85/)也可以直接使用yum等包管理工具在线安装

### 2.准备镜像

``` dockerfile
# alpine-ovs
FROM alpine:3.16.0

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
apk add vim tcpdump iperf iproute2
```

``` bash
docker build -t alpine-ovs .
```

### 3.创建容器

``` bash
# 创建网络
docker network  create --subnet=192.168.101.0/24 ovs-net

# 创建容器
docker run -it -d --net ovs-net --ip 192.168.101.2 --name ns2 alpine-ovs sh
# 查看容器ns2在宿主机网卡的pair端口
ifconfig | grep veth
# 更改网卡端口名称
ip link set down ${ns2_default_if} && ip link set ${ns2_default_if} name veth1-ns2 && ip link set  veth1-ns2 up

docker run -it -d --net ovs-net --ip 192.168.101.3 --name ns3 alpine-ovs sh
# 查看容器ns3在宿主机网卡的pair端口
ifconfig | grep veth
# 更改网卡端口名称
ip link set down ${ns3_default_if} && ip link set ${ns3_default_if} name veth1-ns3 && ip link set  veth1-ns3 up

docker run -it -d --net ovs-net --ip 192.168.101.4 --name ns4 alpine-ovs sh
# 查看容器ns4在宿主机网卡的pair端口
ifconfig | grep veth
# 更改网卡端口名称
ip link set down ${ns4_default_if} && ip link set ${ns4_default_if} name veth1-ns4 && ip link set  veth1-ns4 up

docker run -it -d --net ovs-net --ip 192.168.101.5 --name ns5 alpine-ovs sh
# 查看容器ns5在宿主机网卡的pair端口
ifconfig | grep veth
# 更改网卡端口名称
ip link set down ${ns5_default_if} && ip link set ${ns5_default_if} name veth1-ns5 && ip link set  veth1-ns5 up
```

### 4.ovs建桥承接docker容器流量

``` bash
# 查看网桥
# 会发现网桥后面有3个网络插口
brctl show

# 现在我们把这3个网卡从docker创建的网桥拔出来
# brctl delif ${bridge_name} veth1-ns2 veth1-ns3 veth1-ns4 veth1-ns5
brctl delif br-ec86ebf52532 veth1-ns2 veth1-ns3 veth1-ns4 veth1-ns5

# 使用 ovs 创建的网桥
ovs-vsctl add-br ovs-br1
ovs-vsctl add-br ovs-br2

# 将3个容器的对端网卡插入到 ovs网桥
ovs-vsctl add-port ovs-br1 veth1-ns2
ovs-vsctl add-port ovs-br1 veth1-ns3
ovs-vsctl add-port ovs-br2 veth1-ns4
ovs-vsctl add-port ovs-br2 veth1-ns5
```

### 5.查看当前ovs桥网络

``` bash
# 查看ovs的桥配置
$ ovs-vsctl show
```

### 6.添加bond逻辑网卡

``` bash
# OVS 的 bond 绑定多个物理网卡成一个逻辑网卡，可以提高网络的可靠性和带宽的实现
# 开启网卡
ip link add tab1 type veth peer name peer-tab1
ip link add tab2 type veth peer name peer-tab2
ip link set tab1 up
ip link set peer-tab1 up
ip link set tab2 up
ip link set peer-tab2 up

# 创建一个名为"bond1"的链路聚合组(bond)
# 并将两个网络命名空间中的虚拟网卡"veth1-ns2"和"veth1-ns3"与该链路聚合组绑定，从而实现高可用性和负载均衡
ovs-vsctl add-bond ovs-br1 bond1 tab1 tab2

# 创建一个名为"bond2"的链路聚合组(bond)
# 并将两个网络命名空间中的虚拟网卡"veth1-ns4"和"veth1-ns5"与该链路聚合组绑定，从而实现高可用性和负载均衡
ovs-vsctl add-bond ovs-br2 bond2 peer-tab1 peer-tab2

# 在ovs-br1交换机中，将名称为"bond1"的链路聚合组(bond)的LACP协议设置为主动模式(active)
# LACP为链路聚合控制协议(Link Aggregation Control Protocol)的缩写
# 它用于在链路聚合组成员之间进行协商和控制，以确保链路聚合组的高可用性和负载均衡。
# 在主动模式下，链路聚合组成员会发送LACP协议数据单元，与其他成员进行协商和控制，以建立和维护链路聚合组。这样可以更好地保证链路聚合组的可靠性和性能。
ovs-vsctl set port bond1 lacp=active
ovs-vsctl set port bond2 lacp=active

# Open vSwitch（OVS）命令行工具（ovs-appctl）的一个命令
# 用于显示指定绑定（bond）的状态信息。绑定是指将多个物理网络接口（NIC）组合成一个逻辑接口，以提高带宽和可用性
# bond/show 命令将显示绑定的名称、状态、绑定的物理接口等详细信息。
ovs-appctl bond/show

# 显示Open vSwitch上可用的链路聚合控制协议(Link Aggregation Control Protocol，LACP)的状态和统计信息
# 其中，"ovs-appctl"是Open vSwitch的一个管理工具，用于管理Open vSwitch的各个组件。"lacp/show"是该工具的一个子命令，用于显示LACP相关的信息
# 列出Open vSwitch上所有的链路聚合组及其成员端口、LACP协议状态、LACP协议计数器等信息，从而帮助管理员监控和诊断链路聚合组的状态和性能。
# 例如，可以使用该命令检查链路聚合组是否正常工作、成员端口是否正确配置和活动、链路聚合协议的运行状况等。
ovs-appctl lacp/show


# 默认bond_mode是active-backup就会出现上面的情况
# bond_mode设为balance-tcp\balance-slb
# ovs-vsctl工具设置一个名为bond1的端口的bond模式为balance-slb
# 意思是将bond1端口与其它物理端口进行绑定，以实现网络负载均衡的目的
# 当使用这种模式时，网络流量会被平均地分配到不同的物理端口上，从而提高网络传输效率和可靠性
ovs-vsctl set Port bond1 bond_mode=balance-slb


# 这句话是指使用ovs-vsctl工具设置一个名为bond2的端口的bond模式为balance-tcp
# 意思是将bond2端口与其它物理端口进行绑定，以实现网络负载均衡的目的
# 当使用这种模式时，网络流量会被基于TCP会话的负载均衡算法分配到不同的物理端口上，从而提高网络传输效率和可靠性
# 与balance-slb相比，balance-tcp更加适用于长时间运行的TCP连接，可以保证连接的稳定性和可靠性。
ovs-vsctl set Port bond2 bond_mode=balance-tcp
```

![bonding拓扑图示例](/images/bond.png)

### 6.压测容器之间带宽

``` bash
# ns4 start iperf client
docker exec -it ns4 iperf -s

# ns3 ping ns4
docker exec -it ns3 sh -c 'iperf -c 192.168.101.4 -p 5001 1 -t 20'

# 输出的带宽测试结果
iperf: ignoring extra argument -- 1
------------------------------------------------------------
Client connecting to 192.168.101.4, TCP port 5001
TCP window size: 16.0 KByte (default)
------------------------------------------------------------
[  1] local 192.168.101.3 port 35702 connected with 192.168.101.4 port 5001
[ ID] Interval       Transfer     Bandwidth
[  1] 0.00-20.01 sec  75.8 GBytes  32.6 Gbits/sec
```

### 7.验证qos对流量限流

``` bash
# tap1-b2的网络接口上添加Traffic Control（TC）队列规则
# 使用HTB（Hierarchical Token Bucket）算法，将1号句柄作为根规则，并将12号句柄设置为默认规则
tc qdisc add dev peer-tab1 root handle 1: htb default 12


# 这句命令表示在peer-tab1设备上创建一个父类1,子类1:1，并且定义它们的带宽控制规则
# 其中htb表示采用层次令牌桶算法进行带宽控制
# rate表示限制该类最大可用的数据传输速率为100kbps，ceil表示该类最大可用带宽上限也为100kbps。
tc class add dev peer-tab1 parent 1: classid 1:1 htb rate 100kbps ceil 100kbps

# 在peer-tab1网卡上添加一个分类器，指定该分类器的父类别为1:1，类别ID为1:10，
# 采用htb算法进行流量控制，设定该类别的最大带宽为100kbps，
# 但是该类别的最小保障带宽为30kbps，即使存在其他高优先级流量，该类别的带宽也不低于30kbps。
tc class add dev peer-tab1 parent 1:1 classid 1:10 htb rate 30kbps ceil 100kbps
tc class add dev peer-tab1 parent 1:1 classid 1:11 htb rate 10kbps ceil 100kbps
tc class add dev peer-tab1 parent 1:1 classid 1:12 htb rate 60kbps ceil 100kbps
tc class show dev peer-tab1


# 这条命令是为名为 peer-tab1 的网络接口添加队列规则
# 在父队列1:10下创建一个子队列20:
# 该子队列的队列调度算法为pfifo（先进先出），队列长度的最大限制为5
# 这意味着如果队列中的分组数达到5，新的分组将被丢弃。
tc qdisc add dev peer-tab1 parent 1:10 handle 20: pfifo limit 5
tc qdisc add dev peer-tab1 parent 1:11 handle 30: pfifo limit 5
tc qdisc add dev peer-tab1 parent 1:12 handle 40: sfq perturb 10


# 为名为peer-tab1的网络接口添加过滤器规则
# 它将过滤器规则附加到1:0的父队列上，并设置过滤器规则的优先级为1
# 它使用u32匹配模式，匹配源IP地址为192.168.101.3和目标端口号为5001且屏蔽掉后4位（即对65520取模的余数）
# 并将匹配结果定向到子队列1:10上，这意味着所有匹配到该规则的流量都将进入子队列1:10中进行处理。
tc filter add dev peer-tab1 protocol ip parent 1:0 prio 1 u32 match ip src 192.168.101.3 match ip dport 5001 0xfff0 flowid 1:10


# 在peer-tab1网卡上添加一个过滤器，指定该过滤器的协议为ip，父类别为1:0，
# 优先级为1，u32代表使用32位的过滤条件，匹配源IP地址为192.168.101.4的流量，并将它们流向1:11类别。
tc filter add dev peer-tab1 protocol ip parent 1:0 prio 1 u32 match ip src 192.168.101.4 flowid 1:11

# 观察1:11流量
watch tc -s class ls dev peer-tab1

# 压测速度
# 在名为ns3的容器中运行命令
# 命令是iperf客户端向IP地址为192.168.101.4，端口号为5001的服务器发送1个连接，并在20秒内进行带宽测试。
docker exec -it ns3 sh -c 'iperf -c 192.168.101.4 -p 5001 1 -t 20'
```

``` bash
ovs-vsctl list interface peer-tab1
ovs-vsctl list interface peer-tab2

# "peer-tab1"的网络接口的最大流入数据流量速率为1000字节/秒
ovs-vsctl set interface peer-tab1 ingress_policing_rate=1000

# "peer-tab1"的网络接口的最大流入数据流量峰值为1000字节
ovs-vsctl set interface peer-tab1 ingress_policing_burst=1000
ovs-vsctl set interface peer-tab2 ingress_policing_rate=1000
ovs-vsctl set interface peer-tab2 ingress_policing_burst=1000
```

``` bash
# 限速之后
$ docker exec -it ns3 sh -c 'iperf -c 192.168.101.4 -p 5001 1 -t 20'


iperf: ignoring extra argument -- 1
------------------------------------------------------------
Client connecting to 192.168.101.4, TCP port 5001
TCP window size: 16.0 KByte (default)
------------------------------------------------------------
[  1] local 192.168.101.3 port 36444 connected with 192.168.101.4 port 5001
[ ID] Interval       Transfer     Bandwidth
[  1] 0.00-26.17 sec  3.13 MBytes  1.00 Mbits/sec
```

``` bash
# 取消限速
ovs-vsctl set interface tap1-qos ingress_policing_burst=0
ovs-vsctl set interface tap1-qos ingress_policing_rate=0
ovs-vsctl list interface tap1-qos
```

### 8.Egress shaping分流

``` bash
ovs-vsctl list qos
ovs-vsctl list queue
ovs-ofctl show ovs-br1
ovs-ofctl show ovs-br2
```

``` bash
# 设置端口tap2-qos的QoS策略
# 使用linux-htb类型的QoS策略，设置最大速率为10Gbps，并设置三个队列，分别为@q0、@q1、@q2
# @q0的最小速率和最大速率均为30Mbps，@q1的最小速率和最大速率均为10Mbps，@q2的最小速率和最大速率均为60Mbps
ovs-vsctl set port tap2-qos qos=@newqos -- \
--id=@newqos create qos type=linux-htb other-config:max-rate=10000000000 queues=0=@q0,1=@q1,2=@q2 -- \
--id=@q0 create queue other-config:min-rate=30000000 other-config:max-rate=30000000 -- \
--id=@q1 create queue other-config:min-rate=10000000 other-config:max-rate=10000000 -- \
--id=@q2 create queue other-config:min-rate=60000000 other-config:max-rate=60000000
```

``` bash
# 配置流表规则
# OVS（Open vSwitch）的 ovs-br1 交换机上添加一条流表项
# 具体的含义是，当收到输入端口为1（in_port=1）且源 IP 地址为192.168.101.3的数据包时
# 将该数据包发往端口4（enqueue:4:0）
# 并且将该数据包的 VLAN ID 设置为0
# 也就是说，这条流表项告诉交换机
# 将源 IP 地址为 192.168.101.3 的数据包发送到端口 4。
# 这个命令的实际效果是实现了对特定源地址的流量控制，将该流量限制在特定的输出端口上。
ovs-ofctl add-flow ovs-br1 "in_port=1,nw_src=192.168.101.3 actions=enqueue:4:0"
ovs-ofctl add-flow ovs-br1 "in_port=1,nw_src=192.168.101.4 actions=enqueue:4:1"
ovs-ofctl add-flow ovs-br1 "in_port=3,nw_src=192.168.101.5 actions=enqueue:4:2"


# 分别压测带宽下面的
ns2 && ns3
ns2 && ns4
ns2 && ns5

# 得出带宽大小比符合上面设置的QoS策略: 30Mbps:10Mbps:60Mbps
3:1:6

# 自动清理(推荐)
ovs-vsctl -- --all destroy QoS -- --all destroy Queue

# 手动清理
ovs-vsctl clear port tap2-qos qos
ovs-vsctl list qos
ovs-vsctl destroy qos xxxx
ovs-vsctl list queue
ovs-vsctl destroy queue xxx
ovs-vsctl destroy queue xxx
ovs-vsctl destroy queue xxx
ovs-vsctl list queue
ovs-ofctl del-flows br2 && ovs-ofctl add-flow br2 "priority=0 actions=NORMAL"
```

### 9. 上述的拓扑图

![Qos - bond逻辑网卡和tc过滤器](/images/experiment9_1.png)
![Qos - Hierarchical Token Bucket令牌桶算法的qdisc](/images/experiment10_2.png)
![ovs-qos - qos规则压测带宽](/images/experiment10_4.png)

### Q&A

1. tc qdisc add dev peer-tab1 parent 1:10 handle 20: pfifo limit 5 这句话什么意思

这句话是 Linux 中的网络命令，用于添加一个队列规则。具体解释如下：
- tc：网络命令的关键字，表示 Traffic Control。
- qdisc：Queueing Discipline 的缩写，表示队列规则。
- add：表示添加一个新的队列规则。
- dev peer-tab1：指定规则所适用的网络接口名称，这里是 peer-tab1。
- parent 1:10：指定父队列的 ID，这里是 1:10，表示这个规则是属于 ID 为 1:10 的父队列下的子队列。
- handle 20:：指定队列的标识符，这里是 20。
- pfifo：选择了一种队列算法，即先进先出队列（Priority-based First-In, First-Out）。
- limit 5：指定队列最大容量为 5 个数据包。如果队列已满，新来的数据包将被丢弃。

2. tc定义队列规则有什么用

  TC（Traffic Control）定义队列规则的作用是为了控制网络流量，防止网络拥塞，保证网络服务的质量和稳定性。通过设置队列规则，可以限制网络中各种流量（如数据包大小、传输速率等）的数量和优先级，以确保不同类型的流量能够有序地传输，并且不会对其他流量产生影响。这对于网络管理员来说是非常重要的管理工具，可以帮助管理员更好地控制网络流量，保证网络的正常运行。



### 相关资料

[linux tc流量控制（一）：classless qdisc](https://zhuanlan.zhihu.com/p/449755341)