---
title: buildx
icon: object-group
order: 2
category:
  - docker
tag:
  - docker
---

### 1.官网

[https://github.com/docker/buildx](https://github.com/docker/buildx)
[https://github.com/moby/buildkit](https://github.com/moby/buildkit)

> buildx 命令属于实验特性，因此首先需要开启该特性，比如 ~/.docker/config.json 的 experimental 设置为 true 

本质上是 buildx 调用 buildkit 实现多架构编译，例如linux/amd64，linux/arm64、 或 darwin/amd64，--platform 指定目标架构。


### 2.如何进行多架构编译

``` bash
# 基础镜像
# $TARGETPLATFORM 是内置变量，由 --platform 参数来指定其值
cat > Dockerfile <<EOF
FROM --platform=$TARGETPLATFORM alpine
RUN uname -a > /os.txt
CMD cat /os.txt
EOF
```

``` bash
$ docker buildx build --platform linux/amd64,linux/arm64/v8 -t 435861851/buildx:v0.0.1 .
# 查看镜像信息
$ docker buildx imagetools inspect 435861851/buildx:v0.0.1
```

### 相关疑问

- buildx 和多架构编译有什么关系，具体怎么样做可以多架构编译程序

buildx 是 Docker 官方提供的一种工具，用于支持 Docker 跨平台多架构的构建、打包、推送和部署等操作。它可以使用不同的构建器来构建不同架构的 Docker 镜像，例如 amd64、arm64、armhf、ppc64le、s390x 等。

使用 buildx 进行多架构编译，需要先设置一个包含多个架构的 Docker 镜像注册表，例如 Docker Hub。然后使用 buildx 工具创建一个具有多个平台支持的构建器，例如：

``` bash
$ docker buildx create --name mybuilder --platform linux/amd64,linux/arm64
```

这个命令创建了一个名为 "mybuilder" 的构建器，支持 Linux 平台下的 amd64 和 arm64 两种架构。

接下来，通过 buildx 工具执行构建命令，例如：

``` bash
$ docker buildx build --platform linux/amd64,linux/arm64 -t myimage:latest .
```

这个命令使用 "mybuilder" 构建器，同时指定构建时使用的平台为 Linux 平台下的 amd64 和 arm64 两种架构，编译当前目录下的 Dockerfile 文件，并将编译后的镜像打标签为 myimage:latest。

通过这种方式，我们就可以实现跨平台多架构的 Docker 编译。

