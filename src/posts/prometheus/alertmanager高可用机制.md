---
title: alertmanager高可用机制
index_img: /images/prometheus_icon.jpeg
banner_img: /images/bg/5.jpg
tags:
  - alertmanager
  - 告警
  - 高可用
categories:
  - prometheus
date: 2023-04-12 18:40:12
excerpt: Alertmanager使用Gossip机制来解决消息在多台Alertmanager之间的传递问题，使用docker搭建集群验证告警滤重功能
sticky: 1
---

### 一、官方推荐的高可用架构

![alertmanager集群架构图](/images/prom-ha-with-am-gossip.png)

### 二、如何保证消息不重复

``` bash
Alertmanager使用Gossip机制来解决消息在多台Alertmanager之间的传递问题。

通过在Alertmanager之间相互交流，将信息同步到所有Alertmanager的方式来避免重复发送给receiver

# 告警流程

1. 当一台Alertmanager接收到告警信息后，它会将这个信息广播给其他Alertmanager；
2. 其他Alertmanager也会将这个信息广播给其他Alertmanager，直到所有Alertmanager都收到了这个信息；
3. 其中只有一台Alertmanager会将这个告警通知发送给接收者；
```
![高可用架构示意图](/images/ha-alertmanager.png)


### 三、Gossip协议
``` txt
一种去中心化的信息传播协议

# 基本思想是
将消息从一个节点向其他节点随机传播，直到所有节点都收到了该消息，从而实现整个网络范围内的消息传递
任意节点是对等的，无固定中心节点（去中心化、高可用性、可扩展性）

# 应用场景
Gossip 协议可以应用于分布式数据库复制、分布式存储系统、大规模传感器网络等场景中
```

![Gossip协议节点通讯示意图](/images/gossip-protoctl.png)

### 四、协议在Alertmanager的应用场景

``` bash
# Slience

Alertmanager启动阶段基于Pull-based从集群其它节点同步Silence状态
新的Silence产生时使用Push-based方式在集群中传播Gossip信息

# 告警通知发送完
Push-based同步告警发送状态

# 集群alertmanager成员变化
成员发现、故障检测和成员列表更新等，简而言之，每个alertmanager都知道所有的alertmanager的存在
```

### 五、Alertmanager如何基于Gossip实现告警不重复的

1. 首先，Alertmanager节点之间通过Gossip协议建立相互联系。每个Alertmanager节点都会维护一个Gossip池，用于存储其他节点的状态信息。
2. 当集群之中某一个Alertmanager节点接到告警时，首先会计算该告警的Fingerprint（即告警内容的摘要），并将其作为ID使用。
2. 然后Alertmanager将该告警的Fingerprint广播给其他Alertmanager节点。
3. 接收到广播的Alertmanager会将该Fingerprint添加到自己的已知Fingerprint列表中。
4. 当Alertmanager要发送一个告警通知时，会检查该告警的Fingerprint是否已经存在于已知Fingerprint列表中。如果已经存在，则不会发送该告警通知。

> 也就是说每一个alertmanager节点都拥有所有的告警的Fingerprint，这个Fingerprint列表就是抑制重复发送的ID

### 六、Alertmanager的Gossip协议有哪些特点

``` bash
1. 高效：Gossip协议使用随机化的节点选择和增量式的消息传递方式，能够在短时间内将信息传递给集群中的所有节点。
2. 可靠：Gossip协议采用反馈机制和故障检测算法，能够检测并快速恢复集群中的故障节点，保证集群的稳定性和可靠性。
3. 去中心化：Gossip协议不依赖于任何中心节点或集中式控制器，所有节点都是平等的，能够自组织、自平衡和自适应。
```

### 七、Alertmanager的集群缺点

``` txt
1. 增加了复杂性：Alertmanager集群需要进行配置和管理，增加了系统复杂性。
2. 需要更多的资源：Alertmanager集群需要更多的资源，包括计算、存储和网络等。
3. 需要进行监控和日志管理：Alertmanager集群需要进行监控和日志管理，以便及时发现和解决问题。
5. 信息安全性：Alertmanager集群需要注意安全性，尤其是在跨网络或公共网络上运行时。
```

### 八、什么情况下告警仍然重复发送

``` bash
1. 集群中的某些节点出现网络故障（比如节点1和节点2同时接收到同一个告警，但是节点1和节点2之间无法通讯）
```

### 九、两台alertmanager同时接收到告警不会各自立刻发送给receiver导致重复发送吗

![alertmanager pipeline](/images/alertmanager-HA-arch.png)

> 当一个Alertmanager实例将告警通知发送给Receiver时，它会将该通知标记为“暂停发送”，同时向其他实例发送消息，告诉它们“我已经发送了这个告警通知，你们不用再发送了”。这种方式可以确保告警通知在多个实例之间被正确地合并，避免重复发送。剩余多个Alertmanager实例同时接收到相同的告警信息，并且它们之间的通信还没有完成，那么它们都会标记该告警信息为“暂停发送”，并在通信完成之后再决定由哪个实例发送该告警通知。因此，在Alertmanager中，重复发送同一告警通知的情况应该是非常少见的。


### 十、docker搭建alertmanager集群

``` yml
# 集群模式下 alertmanager 绑定的 IP 地址和端口号
# 用于与其他 alertmanager 节点进行通信。
# 通过 cluster.listen-address 监听并接收来自其他 alertmanager 节点的请求，并将自己的状态信息同步给其他节点
cluster.listen-address

# alertmanager的cluster.peer是指alertmanager节点在集群中的对等节点
# 用于配置alertmanager的高可用性，确保即使某个节点出现问题，其他节点也能够继续工作
# 当alertmanager节点加入到集群中时，它会将自己的peer信息发送给其他节点，其他节点也会将自己的peer信息发送给它
# 这样，每个alertmanager节点就可以知道其他节点的状态，并在需要时进行切换和故障转移。
#
# 实例的cluster.peer参数，以指定其对等节点的地址
cluster.peer
```

``` bash
# 创建alertmanager的配置
# 接收到告警之后甩给webhook

$ touch /Users/xuweiqiang/Desktop/a1.yml
$ touch /Users/xuweiqiang/Desktop/a2.yml
$ touch /Users/xuweiqiang/Desktop/a3.yml
```

``` yml
# 配置alertmanager向webhook发送告警信息
route:
  receiver: 'default-receiver'
receivers:
  - name: default-receiver
    webhook_configs:
    - url: 'http://docker.for.mac.host.internal:5001/'
```

``` bash
# a1
$ docker run -d \
    --network p_net \
    --network-alias a1 \
    --name=a1 \
    -p 9093:9093 \
    -v /Users/xuweiqiang/Desktop/a1.yml:/etc/alertmanager/config.yml \
    prom/alertmanager:latest \
    --web.listen-address=":9093" \
    --cluster.listen-address=":8001" \
    --config.file=/etc/alertmanager/config.yml \
    --log.level=debug
```

[http://localhost:9093/#/status](http://localhost:9093/#/status)

``` bash
# a2
$ docker run -d \
    --network p_net \
    --network-alias a2 \
    --name=a2 \
    -p 9094:9094 \
    -v /Users/xuweiqiang/Desktop/a2.yml:/etc/alertmanager/config.yml \
    prom/alertmanager:latest \
    --web.listen-address=":9094" \
    --cluster.listen-address=":8001" \
    --cluster.peer=a1:8001 \
    --config.file=/etc/alertmanager/config.yml \
    --log.level=debug
```

[http://localhost:9094/#/status](http://localhost:9094/#/status)

``` bash
# a3
$ docker run -d \
    --network p_net \
    --network-alias a3 \
    --name=a3 \
    -p 9095:9095 \
    -v /Users/xuweiqiang/Desktop/a3.yml:/etc/alertmanager/config.yml \
    prom/alertmanager:latest \
    --web.listen-address=":9095" \
    --cluster.listen-address=":8001" \
    --cluster.peer=a1:8001 \
    --config.file=/etc/alertmanager/config.yml \
    --log.level=debug
```

[http://localhost:9095/#/status](http://localhost:9095/#/status)

``` bash
# webhook
$ go install github.com/prometheus/alertmanager/examples/webhook
# 启动服务
$ webhook
```

### 十一、测试发送告警

``` bash
alerts1='[
  {
    "labels": {
       "alertname": "DiskRunningFull",
       "instance": "example1"
     },
     "annotations": {
        "info": "The disk sdb1 is running full",
        "summary": "please check the instance example1"
      }
  }
]'

curl -XPOST -d"$alerts1" http://localhost:9093/api/v1/alerts
curl -XPOST -d"$alerts1" http://localhost:9094/api/v1/alerts
curl -XPOST -d"$alerts1" http://localhost:9095/api/v1/alerts
```

### 十二、prometheus配置

``` yml
# 总的一句话就是：每个prometheus往alertmanager集群的所有机器发送告警
# 最大限度保证告警消息不会丢失就好了
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - 127.0.0.1:9093
      - 127.0.0.1:9094
      - 127.0.0.1:9095
```

### 十二、指纹算法

``` go
// provides a hash-capable representation of a Metric.
model.Fingerprint uint64

// Fingerprint returns a Metric's Fingerprint.
// 生成指纹算法
type func (m Metric) Fingerprint() Fingerprint

// Equal compares the metrics.
// 指标比对逻辑
func (m Metric) Equal(o Metric) bool
```

### 总结

Alertmanager的高可用架构是：

1. 多台实例之间启用集群通讯模式；
2. prometheus各自向自己宿主机的alertmanager实例发送告警信息；
3. 使用alertmanager路由将不同的告警（标签区分）发给不同的接受者；
4. 使用alertmanager分组将告警合并；
5. alertmanager自带的Firing有降噪作用；


### 相关疑问

- alertmanager接收到告警之后处理流程怎么样的

``` bash
1. 某个Alertmanager接收到告警，会等待一段时间（默认为30秒）看其他Alertmanager节点是否接到该告警
2. 等待聚合时间结束后，Alertmanager集群仍然没有收到该告警的聚合，则它将发送给接收器（receiver）

等待时间称为“等待聚合”（wait_for_aggregate）时间，可以在Alertmanager配置文件的route部分进行配置;
```

- prometheus的alert有多少种状态

1. Unfiring：告警规则触发，但没有达到告警阈值，未达到告警状态。
2. Firing：告警规则触发，已达到告警阈值，处于告警状态。
3. Pending：正在等待确认，已发送告警通知但还未确认。
4. Silenced：已被静默，告警规则被设置为不产生告警。
5. Inhibited：已被禁止，告警规则被设置为禁用告警。

- Alertmanager的Webhook是什么

``` bash
Alertmanager的Webhook是一种机制，可以通过向指定URL发送HTTP、POST请求来将警报发送到外部系统。
Webhook可用于将警报通知转发到其他应用程序、服务或系统，或将其集成到自动化工作流程中。
使用Webhook，可以将警报发送到任何支持HTTP接口的服务或应用程序。
```
``` go 
package main

import (
    "time"
    "io/ioutil"
    "net/http"
    "fmt"
)

type MyHandler struct{}

func (am *MyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        fmt.Printf("read body err, %v\n", err)
        return
    }
    fmt.Println(time.Now())
    fmt.Printf("%s\n\n", string(body))
}

func main() {
    http.Handle("/webhook", &MyHandler{})
    http.ListenAndServe(":10000", nil)
}
```

- alertmanager如何查看历史告警

``` txt
Alertmanager提供了HTTP API，可以通过该API来查询历史告警。

具体来讲，可以通过以下API来获取历史告警：

1. /api/v1/alerts：该API可以用来查询当前和历史告警。
默认情况下，该API只查询当前处于pending、firing或者silenced状态的告警。
为了查询历史告警，需要在请求参数中添加start和end参数，指定查询的时间范围。

2. /api/v1/alerts/groups：该API可以用来查询当前和历史告警的分组信息。
类似于上面的API，需要在请求参数中添加start和end参数来指定查询的时间范围。

3. /api/v1/alerts/<alertname>/<instance>：该API可以用来查询指定告警名称和实例的历史告警。
类似于上面的API，需要在请求参数中添加start和end参数来指定查询的时间范围。

需要注意的是，默认情况下，Alertmanager只会保留最近2小时的历史告警。
如果要查询更早期的历史告警，需要对Alertmanager进行配置
将history配置项设置为一个大于0的值，以指定历史告警的保留时间。
```

- 对于proemtheus的联邦机制而言，是否会因为标签不一致导致重复发送呢

``` txt
取决于备用节点从主节点拉取指标的时候是否保留原有标签(honor_labels:true)
更改标签会导致生成的指纹不一致导致重复发送告警
```

### 参考资料

[Alertmanager高可用](https://yunlzheng.gitbook.io/prometheus-book/part-ii-prometheus-jin-jie/readmd/alertmanager-high-availability#chuang-jian-alertmanager-ji-qun)

[https://github.com/prometheus/alertmanager](https://github.com/prometheus/alertmanager)

[webhook的数据标准是什么](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)