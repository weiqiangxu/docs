---
title: DockerHub私服Registry搭建与使用
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - docker
  - registry
categories:
  - docker
date: 2023-04-18 18:40:12
excerpt: 安装docker-registry建私有镜像仓库
sticky: 1
---

### 1.本地创建私服镜像目录

``` bash
$ mkdir ~/test
$ cd ~/test && mkdir data auth docker-compose
$ touch ~/test/docker-compose/docker-compose.yml
# 创建一个用户，执行完成后会生成文件 /home/auth/registry.password
$ cd ~/test/auth && htpasswd -Bc registry.password root
```

``` yml
# docker-compose.yml
version: '3'
services:
  registry:
    image: registry:2
    ports:
    - "5001:5000"
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: MyRegistry
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/registry.password
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /data
    volumes:
      - ~/test/auth:/auth
      - ~/test/data:/data
```

``` bash
$ cd ~/test/docker-compose && docker-compose up -d
```

### 2.访问registy服务

``` bash
# 访问输入用户名密码 
$ curl -X GET -u'root:123456' http://localhost:5001/v2/_catalog

# 登陆docker registry
$ docker login localhost:5001
Username: root
Password: 
Login Succeeded
```

### 3.添加私有库到docker配置

``` bash
# /etc/docker/daemon.json or ~/.docker/daemon.json
{
 "insecure-registries": [
   "localhost:5001"
 ]
}

# 登陆registry
$ docker login localhost:5001

# 构建镜像到本地
$ cd my-project && docker build -t my-image:v0.0.1 .

# 推送镜像到harbor私有库
# docker push <Registry>/<Image>
$ docker tag ovs-aline:v0.0.1 localhost:5001/devops/ovs-aline:v0.0.1

# docker push registry.example.com/myimage
# # 在 ~/test/data/ 目录存放镜像文件
$ docker push localhost:5001/devops/ovs-aline:v0.0.1

# docker pull registry.example.com/myimage
$ docker pull localhost:5001/devops/ovs-aline:v0.0.1

# 查看仓库镜像列表
$ curl -X GET -u'root:123456' http://localhost:5001/v2/_catalog
{"repositories":["devops/ovs-aline"]}

# 查看仓库镜像tag
$ curl -X GET -u'root:123456' http://localhost:5001/v2/devops/ovs-aline/tags/list
{"name":"devops/ovs-aline","tags":["v0.0.1"]}
```

### 4.web服务提供registy可视化界面

``` bash
$ docker inspect ${registry_id}

# start
$ docker run -d -p 8080:8080 \
  --name registry-web \
  --net docker-compose_default \
  --link docker-compose-registry-1 \
  -e REGISTRY_URL=http://docker-compose-registry-1:5000/v2 \
  -e REGISTRY_BASIC_AUTH="cm9vdDoxMjM0NTY=" \
  -e REGISTRY_NAME=localhost \
  hyper/docker-registry-web


# REGISTRY_BASIC_AUTH其实是一个base64
# 对 `username:password` 进行base64 encode
```

### Q&A

##### 1.htpasswd是什么命令

htpasswd命令是Apache Web服务器的一个工具，用于创建和管理用户账户文件的命令行工具，可用于创建新用户、更改密码并删除已有用户。

##### 2.registry的REGISTRY_AUTH_HTPASSWD_REALM参数是干嘛的

REGISTRY_AUTH_HTPASSWD_REALM参数是用于设置Docker registry的基本认证（Basic Authentication）的HTTP Realm。如果设置了REGISTRY_AUTH_HTPASSWD_REALM参数值为"My Docker Registry"，则用户在登录时将看到类似于"Please enter your My Docker Registry credentials"的提示，有助于确保用户知道他们正在访问受保护的资源。

##### 3.registry的参数 REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY 是干嘛的

REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY参数是用于设置Docker registry存储镜像的根目录。默认情况下，Docker registry使用/var/lib/registry作为默认的存储目录。

##### 4.监听网卡

``` bash
$ sudo tcpdump -nei lo0 port 5001
$ telnet 127.0.0.1 5001
```

##### 5.docker registry的token 

``` bash
$ cat ~/.docker/config.json
```

对`username:password`进行base64 encode可以获得。

### 相关资料

- [https://hub.docker.com/_/registry](https://hub.docker.com/_/registry)
