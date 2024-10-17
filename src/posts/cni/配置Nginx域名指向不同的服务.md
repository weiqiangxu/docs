---
title: 配置Nginx域名指向不同的服务
index_img: /images/bg/network.png
banner_img: /images/bg/computer.jpeg
tags:
  - docker
categories:
  - docker
date: 2024-01-19 18:40:12
excerpt: 通过Nginx使用不同的域名指向不同的服务
sticky: 1
---

### 1.配置和启动Nginx

```bash
docker network create nginx-test
```

```bash
# 注意不同版本docker可能指定网络的方式不太一样
docker run --name nginx \
  --network nginx-test -itd \
  -p 80:80 \
  -v ./nginx.conf:/etc/nginx/conf.d/proxy.conf \
  nginx:1.25.1
```

```nginx.conf
client_body_buffer_size 2048m;   # 设置客户端请求的缓冲区大小
client_header_buffer_size 2048m; # 设置客户端请求头部的缓冲区大小
client_max_body_size 2048m;      # 设置客户端请求的最大缓冲区大小

server {
    listen 80;
    server_name a.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name b.com;

    location / {
        proxy_pass http://gin:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2.启动服务监听8080端口

```bash
# 服务默认端口是5678
docker run --network nginx-test -itd \
  --network-alias gin \
  435861851/gin:v0.0.1
```

> 注意: 此时访问在nginx内部访问gin:8080是输出Hello Gin

### 3.配置域名/etc/host

```bash
127.0.0.1 b.com
```

### 4.使用IP访问

[http://b.com](http://b.com)

> 输出 `{"message":"Hello Gin!"}`