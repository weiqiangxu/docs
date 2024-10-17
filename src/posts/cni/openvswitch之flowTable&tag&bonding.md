---
title: openvswitch之flowTable&tag&bonding
index_img: /images/bg/network.png
banner_img: /images/bg/5.jpg
tags:
  - openvswitch
categories:
  - kubernetes
date: 2023-06-14 16:56:12
excerpt: 在docker的环境下，如何用ovs创建的网桥接管容器之间的流量，并且验证ovs的一些功能如FlowTable\Tag\trunks等
sticky: 1
---

### 一、实验环境准备

[ovs实验基础环境](https://weiqiangxu.github.io/2023/06/14/cni/ovs实验基础环境/)

### 二、ovs的flow table丢弃icmp数据包

``` bash
# 来体验一下流表规则的作用

# OVS网桥ovs-br1上添加流规则
# 当接收到的数据包是ICMP协议类型，并且其输入端口为3(ns4的pair端口)时，将该数据包丢弃（即不处理，不向其他端口转发）
# 该流规则的优先级为3
# 通过 ovs-ofctl show ovs-br1 可以查看ovs桥上面的1\2\3端口是什么
ovs-ofctl add-flow ovs-br1 icmp,priority=3,in_port=3,actions=drop


# 查看ovs桥
ovs-ofctl dump-flows ovs-br1
 cookie=0x0, duration=68.798s, table=0, n_packets=2, n_bytes=196, priority=3,icmp,in_port="veth1-ns4" actions=drop # 新增的网络流表
 cookie=0x0, duration=1628.095s, table=0, n_packets=10, n_bytes=756, priority=0 actions=NORMAL

# 添加以后ping不通ns1了
# docker exec -it ns2  ping ${ns4_ip}
docker exec -it ns2  ping 192.168.101.4

# ns2 ping ns3 的时候输入端口是3那么不会丢弃报文
docker exec -it ns2  ping 192.168.101.3

PING 192.168.101.3 (192.168.101.3): 56 data bytes
64 bytes from 192.168.101.3: seq=0 ttl=64 time=0.075 ms
64 bytes from 192.168.101.3: seq=1 ttl=64 time=0.062 ms


# 删除刚刚添加的流表规则 <keyword匹配规则即可>
# ovs-ofctl del-flows ovs-br1 <keyword>
ovs-ofctl del-flows ovs-br1 "in_port=veth1-ns4"

# 删除所有流表 - 会导致所有无法通讯
ovs-ofctl del-flows ovs-br1
```

### 三、ovs的Port mirroring端口镜像复制端口输入和输出流量至其他端口

``` bash
# 在上面的环境之中将ovs网桥ovs-br1上面的3个插口全部拔出
# ovs-vsctl del-port <bridge> <port>
ovs-vsctl del-port ovs-br1 veth1-ns1
ovs-vsctl del-port ovs-br1 veth1-ns2
ovs-vsctl del-port ovs-br1 veth1-ns3

# 重新将网卡插上并且打上tag
ovs-vsctl add-port ovs-br1 veth1-ns1 -- set Port veth1-ns1 tag=110
ovs-vsctl add-port ovs-br1 veth1-ns2 -- set Port veth1-ns2 tag=110
ovs-vsctl add-port ovs-br1 veth1-ns3 -- set Port veth1-ns3 tag=110

ovs-vsctl list mirror
ovs-vsctl show


# 语法将 vlan 下的所有流量镜像输出到 output-port
ovs-vsctl set Bridge <bridge> mirrors=@m -- --id=@<mirror> create Mirror name=<mirror_name> select-all=true select-vlan=<vlan_id> output-port=<mirror_port>

# 创建一个名为“m1”的镜像，并将其名称分配给变量“@m”。 
# 然后，它创建两个"id"，分别为“@veth1-ns1”和“@veth1-ns4”，这两个"id"指定了要镜像的端口
# 接下来，命令使用这些"id"来设置镜像规则。
# 它选择数据包的目标端口，并将其复制到输出端口“@veth1-ns3”
# 同时选择“veth1-ns1”端口作为源地址。这意味着所有发送到“veth1-ns1”的数据包都将被复制到“veth1-ns3”。
ovs-vsctl -- set bridge br1 mirrors=@m \
          -- --id=@veth1-ns1 get Port veth1-ns1 \
          -- --id=@veth1-ns2 get Port veth1-ns2 \
          -- --id=@m create Mirror name=m1 select-dst-port=@veth1-ns1 select-src-port=@veth1-ns1 output-port=@veth1-ns3


# select-dst-port用于匹配数据包的目的地端口，选择应该将数据包发送到哪个端口。
# select-src-port用于匹配数据包的源端口，选择哪个端口接收数据包

# 监听网卡 output-port 也就是 veth1-ns3
tcpdump -nei veth1-ns3

# ns1 ping ns2 , 查看流量是否 mirro 到 veth1-ns3
docker exec -it ${ns1_id} ping ${ns2_ip}
```

``` bash
# 设置 Open vSwitch 网桥（bridge） ovs-br1 的镜像规则
# 创建了一个名为 m1 的镜像规则，将 veth1-ns2 端口的流量作为镜像目标（select-dst-port），并将同样的流量作为镜像源（select-src-port）；
# 为了将镜像流量和普通流量区分开来，还将镜像流量打上 VLAN 110 的标签（output-vlan）。
ovs-vsctl -- set bridge ovs-br1 mirrors=@m2 \
          -- --id=@veth1-ns1 get Port veth1-ns1 \
          -- --id=@m2 create Mirror name=m1 select-dst-port=@veth1-ns2 select-src-port=@veth1-ns2 output-vlan=111


# 设置 Open vSwitch 网桥（bridge） br2 的镜像规则
# 创建了一个名为 m3 的镜像规则，将选取 VLAN ID 为 110 的流量作为镜像源（select-vlan）
# 并将同样的流量打上 VLAN 110 的标签作为镜像流量（output-vlan）
# 将这个镜像规则赋值给 mirrors 属性，即将该规则应用于 ovs-br1 上。
ovs-vsctl -- set bridge ovs-br1 mirrors=@m \
          -- --id=@m create Mirror name=m3 select-vlan=110 output-vlan=110


# 1. 指定洪泛的VLAN ID，使bridge只会向这些VLAN上的所有端口广播，而不会向其他VLAN广播。
# 2. 在多个VLAN之间提供隔离，从而限制数据包传播的范围。
# 3. 支持多租户场景下的VLAN隔离，不同租户可以独立使用自己的VLAN。
# 4. 防止恶意攻击者利用洪泛攻击来干扰网络的正常运行。
#VLAN隔离和洪泛控制
ovs-vsctl set bridge br1 flood-vlans=110

# 监听网卡 veth1-ns4
tcpdump -nei veth1-ns4

# ns2 ping ns3
docker exec -it ${ns2_id} ping <ns3_ip>
```

``` bash
# 环境清理
ovs-vsctl clear bridge ovs-br1 mirrors
ovs-vsctl clear bridge ovs-br1 mirrors
```

### 四、tag设置相同bridge下的不同vlan无法通信

[ovs实验基础环境](https://weiqiangxu.github.io/2023/06/14/cni/ovs实验基础环境/)

``` bash
# 在上面的环境之中将ovs网桥ovs-br1上面的3个插口全部拔出
# ovs-vsctl del-port <bridge> <port>
ovs-vsctl del-port ovs-br1 veth1-ns2
ovs-vsctl del-port ovs-br1 veth1-ns3
ovs-vsctl del-port ovs-br1 veth1-ns4
ovs-vsctl del-port ovs-br1 veth1-ns4

# 重新将网卡插上并且打上tag
ovs-vsctl add-port ovs-br1 veth1-ns2
ovs-vsctl set port veth1-ns2 tag=100

ovs-vsctl add-port ovs-br1 veth1-ns3
ovs-vsctl set port veth1-ns3 tag=100

ovs-vsctl add-port ovs-br1 veth1-ns4
ovs-vsctl set port veth1-ns4 tag=111

ovs-vsctl add-port ovs-br1 veth1-ns5
ovs-vsctl set port veth1-ns5 tag=111

# 从 ns2 ping ns3
# docker exec -it ${ns2_id} ping <ns3_ip>
# 可以ping通
docker exec -it ns2 ping 192.168.101.3

# ns2 ping ns4
# 无法ping通过因为他们分别属于不同的tag也是不同的vlan
docker exec -it ns2 ping 192.168.101.4
```

``` bash
# 1. 下发流表(直接指定源端口和目标端口)使可以ping通
ovs-ofctl add-flow ovs-br1 in_port=veth1-ns3,action=output:veth1-ns4
ovs-ofctl add-flow ovs-br1 in_port=veth1-ns4,action=output:veth1-ns3
docker exec -it ns3 ping 192.168.101.4        # ns3 ping ns4
ovs-ofctl del-flows ovs-br1 in_port=veth1-ns3 # 删除流表
ovs-ofctl del-flows ovs-br1 in_port=veth1-ns4 # 删除流表
ovs-ofctl dump-flows ovs-br1


# 2.下发流表(去掉VLAN标签再匹配)也可以实现不同vlan的port通讯
ovs-ofctl add-flow ovs-br1 priority=20,in_port=veth1-ns3,nw_dst=192.168.101.4,actions=strip_vlan,output:veth1-ns4
ovs-ofctl add-flow ovs-br1 priority=20,in_port=veth1-ns4,nw_dst=192.168.101.3,actions=strip_vlan,output:veth1-ns3
ovs-ofctl dump-flows ovs-br1
docker exec -it ns3 ping 192.168.101.4 
PING 192.168.101.4 (192.168.101.4): 56 data bytes
64 bytes from 192.168.101.4: seq=0 ttl=64 time=0.415 ms
64 bytes from 192.168.101.4: seq=1 ttl=64 t
...
ovs-ofctl del-flows ovs-br1 in_port=veth1-ns3
ovs-ofctl del-flows ovs-br1 in_port=veth1-ns4
```

### 五、flood-vlans

[ovs实验基础环境](https://weiqiangxu.github.io/2023/06/14/cni/ovs实验基础环境/)

``` bash
ovs-vsctl add-br ovs-br2

# 将3和4拔出
ovs-vsctl del-port ovs-br1 veth1-ns4
ovs-vsctl del-port ovs-br1 veth1-ns5

# 将3和4插入br2
ovs-vsctl add-port ovs-br2 veth1-ns4
ovs-vsctl add-port ovs-br2 veth1-ns5

# ns2 ping ns3
# 可以通讯,两个端口插在同一个网桥br1
docker exec -it ns3 tcpdump -nei eth0
docker exec -it ns2 ping 192.168.101.3

# ns3 ping ns4
# 无法通讯 - 因为端口插在不同的bridge上
docker exec -it ns4 tcpdump -nei eth0
docker exec -it ns3 ping 192.168.101.4

# 将ns4的veth从网桥br2拔除插入br1
ovs-vsctl del-port ovs-br2 veth1-ns4
ovs-vsctl add-port ovs-br1 veth1-ns4

# 监听网卡ns4
docker exec -it ns4 tcpdump -nei eth0
# ns2 ping ns3
docker exec -it ns2 ping 192.168.101.3
# 此时 ns4 没有任何 ARP 包
# 也就是说此时 ns2 广播出去 ns3 的ARP报文不会传播到ns4


# 网桥允许洪泛（即广播）的 VLAN ID 列表为 100
# 也就是VLAN 100的数据包才会被洪泛到ovs-br1的所有端口，其他VLAN的数据包则不会被洪泛
# 在Open vSwitch中设置名称为"ovs-br1"的网桥支持洪泛（flood）VLAN 110和111
# 作用是在VLAN架构中使用洪泛技术向所有主机广播数据包
# 由于洪泛可能会导致网络中的广播风暴，因此只有在局域网或者小规模网络中才应该使用
# 洪泛技术可以使网络中所有的设备都能够接收到广播数据包，从而实现网络通信
# 设置了 ovs-br1 网桥允许洪泛（即广播）的 VLAN ID 列表为 110 和 111
# ovs-vsctl set bridge ovs-br1 flood-vlans=110,111
ovs-vsctl set bridge ovs-br1 flood-vlans=100
# 教你如何清空
ovs-vsctl set bridge ovs-br1 flood-vlans=[]

# 给ns2\ns3\ns4全部打上tag为100也就是vlan是100
ovs-vsctl set port veth1-ns2 tag=100
ovs-vsctl set port veth1-ns3 tag=100
ovs-vsctl set port veth1-ns4 tag=100

# 重新监听ns4
docker exec -it ns4 tcpdump -nei eth0
# ns2 ping ns3
docker exec -it ns2 ping 192.168.101.3

# 此时ns4可以监听ns2 && ns3 的ARP广播
ethertype ARP, Request who-has 192.168.101.2 tell 192.168.101.3, length 28
ethertype ARP, Reply 192.168.101.2 is-at 02:42:c0:a8:65:02, length 28
ethertype ARP, Request who-has 192.168.101.3 tell 192.168.101.2, length 28
ethertype ARP, Reply 192.168.101.3 is-at 02:42:c0:a8:65:03, length 28


# 此时清空允许洪泛（即广播）VLAN ID
ovs-vsctl get bridge ovs-br1 flood-vlans
ovs-vsctl set bridge ovs-br1 flood-vlans=[]
ovs-vsctl get bridge ovs-br1 flood-vlans


# 重新监听
docker exec -it ns4 tcpdump -nei eth0
docker exec -it ns2 ping 192.168.101.3

# 此时，ns4的eth0并没有监听到 ns2 && ns3 的ARP报文

# 如何清除端口tag
ovs-vsctl clear port veth1-ns1 tag
```


### 六、trunks

``` bash
# 设置 ns3 的对端网卡 veth1-ns3 
# 可以接收和发送 VLAN ID 为 110 的网络流量 （VLAN ID为100的也可以但是不会将将流量标记为 110）
ovs-vsctl set Port veth1-ns3 trunks=110
ovs-vsctl set Port veth1-ns3 trunks=[]
```

### 七、Bonding


[ovs实验基础环境](https://weiqiangxu.github.io/2023/06/14/cni/ovs实验基础环境/)

> OVS 的 bond 绑定多个物理网卡成一个逻辑网卡，可以提高网络的可靠性和带宽的实现

``` bash
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


# 此时 ns4 到 ns2的流量走向是 
# ns4 -> ns4.eth0 -> ns4.veth1-ns4 -> ovs-br2 -> (peer-tab1 peer-tab2)
# 当peer-tab1位active的时候流量默认会从peer-tab1经过
# 当peer-tab1 down的时候流量会从peer-tab2走过

# ns4 ping ns2
docker exec -it ns4 ping 192.168.101.2

# 监听peer-tab2
# 此时流量经过peer-tab1所以peer-tab2没有抓包到ICMP
tcpdump -nei peer-tab2

# down tab1-b2
ip link set peer-tab1 down

# 此时再次抓包
# 可以抓到ICMP
tcpdump -nei peer-tab2


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


### 八、术语

1. Bridge
中文名称网桥，一个Bridge代表一个以太网交换机（Switch），一台主机中可以创建一个或多个Bridge，Bridge可以根据一定的规则，把某一个端口接收到的数据报文转发到另一个或多个端口上，也可以修改或者丢弃数据报文。

2. Port
    中文名称端口，需要注意的是它和TCP里面的端口不是同样的概念，它更像是物理交换机上面的插口，可以接水晶头的那种。Port隶属于Bridge，必须先添加了Bridge才能在Bridge上添加Port。Port有以下几种类型：
    - Normal
        用户可以把操作系统中已有的网卡添加到Open vSwitch上，Open vSwitch会自动生成一个同名的Port开处理这张网卡进和出的数据报文。
        不过需要注意的是这种方式添加的Port不支持分配IP地址，如果之前网卡上配置的有IP，挂载到OVS上面之后将不可访问。此类型的Port常用于VLAN模式的多台物理主机相连的那个口，交换机一端属于Trunk模式。

    - Internal
        当Port的类型是Internal时，OVS会自动创建一个虚拟网卡（Interface），此端口收到的数据报文都会转发给这块网卡，从这块网卡发出的数据报文也会通过Port交给OVS处理。当OVS创建一个新的网桥时，会自动创建一个与网桥同名的Internal Port，同时也会创建一个与网桥同名的Interface，因此可以通过ip命令在操作系统中查看到这张虚拟网卡，但是状态是down的。
    - Patch
        Patch Port和veth pair功能相同，总是成双成对的出现，在其中一端收到的数据报文会被转发到另一个Patch Port上，就像是一根网线一样。Patch Port常用于连接两个Bridge，这样两个网桥就和一个网桥一样了。
    - Tunnel
      OVS 支持 GRE、VXLAN、STT、Geneve和IPsec隧道协议，这些隧道协议就是overlay网络的基础协议，通过对物理网络做的一层封装和扩展，解决了二层网络数量不足的问题，最大限度的减少对底层物理网络拓扑的依赖性，同时也最大限度的增加了对网络的控制。

3. Interface
   iface/接口，接口是OVS与操作系统交换数据报文的组件，一个接口即是操作系统上的一块网卡，这个网卡可能是OVS生成的虚拟网卡，也有可能是挂载在OVS上的物理网卡，操作系统上的虚拟网卡（TUN/TAP）也可以被挂载在OVS上。

4. Controller
    OpenFlow控制器，OVS可以接收一个或者多个OpenFlow控制器的管理，功能主要是下发流表，控制转发规则。

5. Flow
   流表是OVS进行数据转发的核心功能，定义了端口之间转发数据报文的规则，一条流表规则主要分为匹配和动作两部分，匹配部分决定哪些数据报文需要被处理，动作决定了匹配到的数据报文该如何处理。

### Q&A

- 开启洪泛和 MAC 学习什么关系

   开启洪泛（Flood）是一种网络攻击手段，可以让网络中的所有数据包都被广播，从而导致网络拥塞甚至瘫痪。
   禁止MAC学习是一种网络安全配置策略，可以限制网络中的MAC地址学习，防止网络中的恶意设备伪装成其他合法设备进行攻击。

### 相关文章

[基于openvswitch实现的openshit-sdn](https://zhuanlan.zhihu.com/p/37852626)
[kubernetes 网络组件简介（Flannel & Open vSwitch & Calico）](https://blog.csdn.net/kjh2007abc/article/details/86751730)
[Open vSwitch 入门实践（1）简介 - 关于术语写的很好](https://zhuanlan.zhihu.com/p/336487371)