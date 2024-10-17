---
title: 制作镜像编译kata
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - golang
  - cicd
  - dockerfile
  - image
  - katacontainers
categories:
  - docker
date: 2023-04-21 18:40:12
excerpt: 基于centos制作一个具备编译kata环境的镜像，golang\gcc\git，以及镜像推送步骤
sticky: 1
---

### 一、编写Dockerfile

``` Dockerfile
FROM centos:centos7

ENV GOROOT="/usr/local/go" \
    GOPROXY="https://goproxy.cn,direct" \
    GOINSECURE="gitlab.my-company.net" \
    GOPRIVATE="*.corp.com,gitlab.my-company.net" \
    GONOPROXY="gitlab.my-company.net" \
    GONOSUMDB="gitlab.my-company.net" \
    PATH="$PATH:/usr/local/go/bin" \
    TZ="Asia/Shanghai"

# repo
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y && export PATH="$HOME/.cargo/bin:$PATH" && \
  yum-config-manager --add-repo  https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/centos/docker-ce.repo && \
  yum -y install wget && \
  cd /home && wget https://go.dev/dl/go1.19.8.linux-arm64.tar.gz && \
  tar -C /usr/local -xzf go1.19.8.linux-arm64.tar.gz && \
  export PATH=$PATH:/usr/local/go/bin && source /etc/profile && \
  echo 'export PATH=$PATH:/usr/local/go/bin' | tee -a /etc/profile > /etc/profile && \
  source /etc/profile && \
  yum install -y automake autoconf libtool make gcc gcc-c++ rsync git && \
  cp /usr/share/zoneinfo/${TZ} /etc/localtime && echo ${TZ} > /etc/timezone && \
```

### 二、制作镜像

``` bash
# go 1.19.8 && centos 7.9 
$ docker build -t centos-go1.19.8:v1 .
```

### 三、推送镜像到云端

``` bash
docker tag centos-go1.19.8:v2 registry.my.net/devops/centos-go1.19.8:v2
docker login
docker push registry.my.net/devops/centos-go1.19.8:v2
docker logout
```

### 四、运行镜像验证

``` bash
# 验证kata的编译
$ docker run -itd \
    -v /Users/xuweiqiang/Documents/code/kata-containers/:/home/kata-containers \
    --privileged=true \
    --name test \
    centos-go1.19.8:v2
```

### 五、构建并安装kata

``` bash
$ cd /home
$ pushd kata-containers/src/runtime
$ make && make install
$ mkdir -p /etc/kata-containers/
$ cp /usr/share/defaults/kata-containers/configuration.toml /etc/kata-containers
$ popd
```

### 六、验证安装成功

``` bash
$ kata-runtime version
# kata-runtime  : 3.1.0
```

### 相关疑问

- kata-deploy怎么支持k8s

- kata-containerd怎么编译获取手动安装包kata-static-3.1.0-x86_64.tar.xz

### 相关文档

[官方文档kata-containers-v1.3.0开发者向导](https://github.com/kata-containers/kata-containers/blob/3.1.0/docs/Developer-Guide.md)
[官方文档kata-containers-v1.3.0二进制包下载链接](https://github.com/kata-containers/kata-containers/releases/tag/3.1.0)
[官方文档kata-containers-v1.3.0手动安装文档](https://github.com/kata-containers/kata-containers/blob/3.1.0/docs/install/container-manager/containerd/containerd-install.md)

