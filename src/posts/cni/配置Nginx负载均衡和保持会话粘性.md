---
title: 配置Nginx负载均衡和保持会话粘性
index_img: /images/bg/network.png
banner_img: /images/bg/computer.jpeg
tags:
  - docker
categories:
  - docker
date: 2023-08-19 18:40:12
excerpt: 配置Nginx实现负载均衡转发请求和保持会话粘性
sticky: 1
---

### 一、如何配置负载均衡同一个域名均衡给多个服务

##### 1.开启多个服务端

```bash
$ docker network create nginx-test

$ docker run --network nginx-test -itd \
  --network-alias one \
  435861851/gin:v0.0.1

$ docker run --network nginx-test -itd \
  --network-alias two \
  hashicorp/http-echo -text="hello world"
```

##### 2.启动Nginx

```bash
$ docker run --name nginx \
  --network nginx-test -itd \
  -p 80:80 \
  -v ./nginx.conf:/etc/nginx/conf.d/proxy.conf \
  nginx:1.25.1
```

```nginx.conf
###定义上游服务器(需要被nginx真实代理访问的服务器) 默认是轮训机制
upstream backServer{
    server one:8080;
    server two:5678;
}

server {
    listen       80;
    server_name  testnginx.com;
    location / {
        ### 指定上游服务器负载均衡服务器
        proxy_pass http://backServer;
        index  index.html index.htm;
    }
}
```

##### 3.访问服务会输出不同的结果

```bash
# 注意需要先配置/etc/hosts
127.0.0.1 testnginx.com

$ curl testnginx.com
{"message":"Hello Gin!"}
                                                                          $ curl testnginx.com
hello world
```

### 二、负载均衡算法

> 默认轮询

##### 1.weight设置权重

```bash
upstream backServer{
    server one:8080 weight=1;
    server two:5678 weight=2;
}
```

##### 2.ip_hash

> 每个请求按访问IP的哈希结果分配，使来自同一个IP的访客固定访问一台后端服务器，并且可以有效解决动态网页存在的session共享问题。俗称IP绑定。可以用于实现会话粘性。

```bash
upstream backServer{
    server one:8080;
    server two:5678;
    ip_hash;
}
```

```bash
# 配置了以后下面访问会一直访问到同一个服务
curl testnginx.com

# 配置使用不同的http client host访问服务验证粘性
# 暂时没验证成功，每次都转发到one服务...
curl --header "X-Forwarded-For:192.168.1.1" testnginx.com
curl --header "X-Forwarded-For:192.168.1.2" testnginx.com
curl --header "X-Forwarded-For:192.168.1.5" testnginx.com
```

> 如果会话粘性保持在one，当one服务宕机会转发到其他，但是当one服务重启会重新转发回one服务。

##### 3.其他算法

```bash
fair（第三方）。比weight、ip_hash更加智能的负载均衡算法，fair算法可以根据页面大小和加载时间长短智能地进行负载均衡，也就是根据后端服务器的响应时间来分配请求，响应时间短的优先分配。Nginx本身不支持fair，如果需要这种调度算法，则必须安装upstream_fair模块。

url_hash（第三方）。按访问的URL的哈希结果来分配请求，使每个URL定向到一台后端服务器，可以进一步提高后端缓存服务器的效率。Nginx本身不支持url_hash，如果需要这种调度算法，则必须安装Nginx的hash软件包
```

### 三、故障转移

> 当上游服务器（真实访问服务器）出现故障或者是没有及时相应的话，直接轮训到下一台服务器。

```bash
upstream backServer{
    server one:8080;
    server two:5678;
}

server {
    listen       80;
    server_name  testnginx.com;
    location / {
        ### 指定上游服务器负载均衡服务器
        proxy_pass http://backServer;

        ###nginx与上游服务器(真实访问的服务器)超时时间
        ###后端服务器连接的超时时间_发起握手等候响应超时时间
        proxy_connect_timeout 1s;
        
        ###nginx发送给上游服务器(真实访问的服务器)超时时间
        proxy_send_timeout 1s;
        
        ### nginx接受上游服务器(真实访问的服务器)超时时间
        proxy_read_timeout 1s;
        index  index.html index.htm;
    }
}
```

```txt
启动服务后将服务one关闭，继续访问服务 curl testnginx.com，即使没有配置故障转移也会在一段时间后转发到正常的服务下。

配置了可以更快速的切换访问到其他节点服务。
```

### 相关文章

[Nginx Upstream Server 负载均衡](https://blog.csdn.net/qq_20042935/article/details/103052606)
[如何保持会话粘性，看看Nginx怎么做的](https://cloud.tencent.com/developer/article/2333364)