---
title: CI制作多架构镜像
tags:
  - cicd
  - dockerfile
categories:
  - docker
---

### 一、总览

1. 制作镜像支持编译SDN以及上传helm包和images

- docker in docker
- go version 1.8
- registry.company.net
- buildx

2. 注册runner到gitlab

3. 编写gitlab-ci.yml文件设置CI流水线

### 一、镜像构建源文件

1. 目录树

``` bash
project
├── Dockerfile
├── README.md
└── file
    ├── buildkitd.toml
    ├── daemon.json
    └── docker-config.json
    └── .ssh
```

2. 编写Dockerfile制作构建的基础镜像

``` bash
FROM docker:dind

COPY file/ /tmp/

ENV GOPATH="/home/go" \
    GOROOT="/usr/local/go" \
    GOPROXY="https://goproxy.cn,direct" \
    GOINSECURE="gitlab.company.net" \
    GOPRIVATE="*.corp.com,gitlab.company.net" \
    GONOPROXY="gitlab.company.net" \
    GONOSUMDB="gitlab.company.net" \
    PATH="$PATH:/usr/local/go/bin"

# install golang
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
    && apk --update add tar make rsync bash \
    && cd /home && wget https://go.dev/dl/go1.18.linux-arm64.tar.gz && ls \
    && cd /home && tar -C /usr/local -xzf go1.18.linux-arm64.tar.gz \
    && echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile \
    && source /etc/profile \
    && apk add --no-cache tzdata gcc g++ binutils libc6-compat build-base git helm \
    && helm plugin install https://github.com/chartmuseum/helm-push \
    && ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && mkdir -p /root/.docker && mv /tmp/docker-config.json /root/.docker/config.json \
    && mkdir -p /etc/docker && mv /tmp/daemon.json /etc/docker/daemon.json \
    && ln -s /lib/libc.so.6 /usr/lib/libresolv.so.2 \
    && mkdir -p /etc/buildkit && mv /tmp/buildkitd.toml /etc/buildkit/buildkitd.toml \
    && mv /tmp/.ssh ~
```

3. 开启buildkitd支持多架构镜像制作

``` yml
[registry."registry.company.net"]
    http = true
    insecure = true
```

4. 配置daemon.json开启buildkit和

``` json
{
  "insecure-registries" : [ "registry.company.net" ],
  "debug": true,
  "experimental": true,
  "features": {
    "buildkit": true
  }
}
```

5. 配置docker-config.json跳过registry私服SSL验证

``` json
{
  "auths": {
    "registry.company.net": {
      "auth": "xxx="
    }
  }
}
```

> .ssh是git库认证的密钥

### 三、构建镜像

``` bash
# 构建镜像到本地
$ cd project && docker build -t my-builder:v0.0.1 .

# 推送镜像到harbor私有库
# docker push <Registry>/<Image>
$ docker tag my-builder:v0.0.1 registry.company.net/devops/my-builder:v0.0.1

# docker push registry.example.com/myimage
$ docker push registry.company.net/devops/my-builder:v0.0.1
```

### 四、镜像验证

1. 容器内编译的过程中遇到的问题以及解决办法

    - 多架构编译内部无法识别到harbor私有库的域名，需要指定 buildx `共享主机网络`
    - 需要创建新的 buildx 构建器
    - 容器内部的docker daemon程序未启动，要注意 dind 的 `ENTRYPOINT` 入口不要被覆盖

2. 在容器之中编译

``` bash
# 注意 docker run 后面不能带上 /bin/bash 否则会
# 导致 ENTRYPOINT 被覆盖从而 docker daemon无法启动
# 因为会覆盖镜像内部的CMD指令
# 跟在镜像名后面的是 command，运行时会替换 CMD 的默认值
$ docker run -itd --privileged=true \
  registry.company.net/devops/my-builder:v0.0.1

$ docker run -v "/Users/xuweiqiang/Documents/project:/home/project" \
  -itd --privileged=true registry.company.net/devops/my-builder:v0.0.1

# 创建一个新的 buildx 构建器，并将其设置为当前正在使用的构建器
# 以便在运行 Docker 构建命令时可以使用该构建器进行构建
# 通过 network=host 指定共享主机网络
# 在容器containerd内部执行的
$ docker buildx create --config /etc/buildkit/buildkitd.toml \
  --append --driver-opt network=host --use

$ cd /home/project
$ ./build.sh start
```

### 五、CI文件编写

``` bash
# 此处省略runner安装和挂载到gitlab的流程
$ cd project && touch .gitlab-ci.yml
```

``` yml
image: registry.company.net/devops/my-builder:v0.0.1
variables:
  REGISTRY_IP: "x.x.x.x" # 这是harbor私服的ip
stages:
  - one
  - two
cni:
  when: manual # 手动触发
  stage: one
  tags:
    - docker-test # runner tag
  script:
    - git config --global url."git@gitlab.company.net:".insteadOf "https://gitlab.company.net/"
    - echo "$REGISTRY_IP registry.company.net" >> /etc/hosts
    - echo "$CI_COMMIT_REF_NAME"
    - sed -i "s/GIT_VERSION/$CI_COMMIT_REF_NAME/g" /builds/project/build.sh
    - docker buildx create --config /etc/buildkit/buildkitd.toml --append --driver-opt network=host --use
    - cd /builds/project/ && ./build.sh one
sdn:
  when: manual # 手动触发
  stage: two
  tags:
    - docker-test  # runner tag
  script:
    - git config --global url."git@gitlab.company.net:".insteadOf "https://gitlab.company.net/"
    - echo "$REGISTRY_IP registry.company.net" >> /etc/hosts
    - echo "$CI_COMMIT_REF_NAME"
    - sed -i "s/GIT_VERSION/$CI_COMMIT_REF_NAME/g" /builds/project/build.sh
    - docker buildx create --config /etc/buildkit/buildkitd.toml --append --driver-opt network=host --use
    - cd /builds/project/ && ./build.sh two
```

### Q&A

- 如何查看容器内部是否拥有registry的验证

``` bash
$ docker login registry.company.net
```

- 如何指定宿主机docker的engine

``` bash
$ ping docker.for.mac.host.internal
$ docker -H tcp://192.168.65.2:2375 images
```


- 如何使用github的Action(CI)拉取镜像k8s.gcr.io

``` bash
# 1.github新建项目
# 2.在该项目的Action新建工作流
# 3.在该项目的setting的secrets and variable添加DOCKER_PASSWORD用于登陆个人hub

# 或者直接项目根目录
$ mkdir -p .github/workflows
$ touch .github/workflows/main.yml
```

``` yml
# main.yml
# This is a basic workflow to help you get started with Actions

name: CI

# Controls when the workflow will run
on:
  # Triggers the workflow on push or pull request events but only for the "main" branch
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run a multi-line script
        run: |
          docker pull k8s.gcr.io/build-image/kube-cross:v1.21.0-go1.16.15-buster.0
          docker tag k8s.gcr.io/build-image/kube-cross:v1.21.0-go1.16.15-buster.0 435861851/k8s.gcr.io:kube-cross-v1.21.0-go1.16.15-buster.0
      
      - name: Log in to Docker Hub
        uses: docker/login-action@f054a8b539a109f9f41c372932f1ae047eff08c9
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Push to Docker Registry
        run: |
          docker push 435861851/k8s.gcr.io:kube-cross-v1.21.0-go1.16.15-buster.0
```

### 相关资料

[ENTRYPOINT 入口点](https://docker-practice.github.io/zh-cn/image/dockerfile/entrypoint.html)
[如何用Github轻松拉取谷歌容器镜像](https://developer.aliyun.com/article/875641)