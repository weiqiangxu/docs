---
hide: true
---

### docker in docker

1. 官网

[https://github.com/jpetazzo/dind](https://github.com/jpetazzo/dind)
[DockerHub上面dind的文档](https://hub.docker.com/_/docker/tags?page=1&name=dind)
[ENTRYPOINT 入口点](https://docker-practice.github.io/zh-cn/image/dockerfile/entrypoint.html)

2. quick start

``` bash
$ docker run --privileged -d docker:dind
```


### 相关疑问

- dind有时候会抛出异常 docker.daemon 程序未开启

是因为`docker run`会导致镜像名后面的是 command，运行时会替换 CMD 的默认值，也就是 `/usr/local/bin/dockerd-entrypoint.sh` 没有执行启动docker服务导致。当手动执行该脚本时候又可以在容器内看到docker的服务已经启动。

- 在 sh 执行到`docker buildx build`构建镜像的时候 `FROM xxx.com/alpine:latest` 抛出异常如何解决

需要在 `docker buildx create --config /etc/buildkit/buildkitd.toml --append --driver-opt network=host --use`创建builder实例，需要指定共享主机网络，否则会出现域名无法识别的情况。

- docker buildx create 创建builder如何指定配置

使用 `docker buildx create --config path/to/config.toml`指定配置设置
``` yml
[registry."registry.tencent.net"]
    http = true
    insecure = true
```
可以防止出现SSL验证错误的问题


- runner的内部容器执行 go mod 拉取go私有库依赖错误如何解决

``` bash
$ git config --global url."git@gitlab.mine.net:".insteadOf "https://gitlab.mine.net/"
```

- docker buildx create 共享主机网络怎么设置
- gitlab-ci.yml之中怎么获取当前git库分支名称

``` bash
$ echo $CI_COMMIT_REF_NAME
```
- helm cm-push 如何安装和添加repo