---
title: runner 在docker中安装
hide: true
---
# runner

1. docker安装
``` bash
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

sudo systemctl start docker
```

2. 登录gitlab获取token

> http://localhost:8899/admin/runners

3. 安装runner [本地卷]

``` bash
mkdir -p /home/gitlab-runner/config

docker run -d --name gitlab-runner --restart always \
  -v /home/gitlab-runner/config:/etc/gitlab-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /home/runner:/home/runner \
  gitlab/gitlab-runner:latest
```

``` bash
# 注意这里需要填写gitlab地址
# 在docker之中访问宿主机的localhost
# 那么需要执行ifconfig查看网卡docker0的inet地址

$ docker run --rm -it  -v /home/runner:/home/runner -v /home/gitlab-runner/config:/etc/gitlab-runner gitlab/gitlab-runner register
```

4. 详细的配置过程
``` bash
docker run --rm -it -v /home/gitlab-runner/config:/etc/gitlab-runner gitlab/gitlab-runner register

Enter the GitLab instance URL (for example, https://gitlab.com/):
<这里输入gitlab私仓的url>

Enter the registration token:
<这里输入runner的token>

Enter a description for the runner:
[007fa02670d1]: <给这个runner起个名字，会显示在gitlab中>

Enter tags for the runner (comma-separated):
<这里输入tag，跑任务的时候可以通过 tags 来指定>

Registering runner... succeeded runner=rANP_dLs
Enter an executor: docker, docker-ssh, parallels, shell, virtualbox, docker+machine, custom, ssh, docker-ssh+machine, kubernetes:
<运行方式，这里写 docker>

Enter the default Docker image (for example, ruby:2.6):
<默认运行容器，如果在job中不指定容器，默认采用的运行容器，这里我添了 tico/docker>

Runner registered successfully. Feel free to start it, but if it's running already the config should be automatically reloaded!
```

5. 注册成功后在gitlab可以看到runner

> http://43.156.75.90:8899/admin/runners

### 进入docker容器验证可以ping到宿主机的localhost

``` bash
ifconf

docker exec -it gitlab-runner /bin/bash

apt-get update && apt install iputils-ping

ping $ip

telnet $ip $port
```

### ifconfig的mtu\inet\inet6是什么

### 在docker容器内如何访问宿主机的localhost

##### docker.runner register docker runner register x509 insecure registry 问题如何解决

[runner 证书问题](https://stackoverflow.com/questions/55622960/gitlab-runner-x509-certificate-signed-by-unknown-authority)

[runner/install/docker](https://docs.gitlab.com/runner/install/docker.html)

``` bash
# 运行一个docker容器
docker run -d --name gitlab-runner --restart always \
  -v /home/gitlab-runner/config:/etc/gitlab-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /home/runner:/home/runner \
  gitlab/gitlab-runner:latest

# runner注册到gitlab - 配置的tag要和gitlab.ci.yml的 tag 一致 否则会找不到runner
docker run --rm -it  \
-v /home/runner:/home/runner \
-v /home/gitlab-runner/config:/etc/gitlab-runner \
-v /var/run/docker.sock:/var/run/docker.sock \
gitlab/gitlab-runner register \
--tls-ca-file /home/runner/gitlab.bingosoft.net.crt

# 更改gitlab的配置
[root@master01 config]# cat config.toml 
```
``` bash
concurrent = 1
check_interval = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "docker-test"
  url = "https://gitlab.bingosoft.net/"
  token = "oz_MyqE2N1XpLycfHwC6"
  tls-ca-file = "/home/runner/gitlab.bingosoft.net.crt"
  executor = "docker"
  [runners.custom_build_dir]
  [runners.cache]
    [runners.cache.s3]
    [runners.cache.gcs]
    [runners.cache.azure]
  [runners.docker]
    tls_verify = false
    image = "tico/docker"
    privileged = true
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache", "/var/run/docker.sock:/var/run/docker.sock"]
    shm_size = 0
```
``` bash
# 更改配置后重启服务
docker restar {$container_id}
```

# gitlab ci 编写
``` bash
image: docker:git
services:
  - docker:dind
stages:
  - build
job_build_prod:
  stage: build
  tags:
    - docker-test
  script:
    - docker version
```

# 报错信息
``` bash
------
 > [internal] load metadata for registry.bingosoft.net/bingokube/kube-cross:v1.22.0-go1.16.15-buster.0:
------
------
 > [1/13] FROM registry.bingosoft.net/bingokube/kube-cross:v1.22.0-go1.16.15-buster.0:
------
ERROR: failed to solve: failed to solve with frontend dockerfile.v0: failed to build LLB: failed to load cache key: failed to do request: Head https://registry.bingosoft.net/v2/bingokube/kube-cross/manifests/v1.22.0-go1.16.15-buster.0: x509: certificate is valid for i-8F7F43E8, not registry.bingosoft.net
```
[Kubernetes学习(解决x509 certificate is valid for xxx, not yyy)](https://izsk.me/2021/01/20/Kubernetes-x509-not-ip/)


### 参考文章

[GitLab Runner介绍及安装](https://zhuanlan.zhihu.com/p/441581000)
[docker中安装runner](https://docs.gitlab.cn/runner/install/docker.html)
[注册docker.runner到gitlab](https://docs.gitlab.cn/runner/register/index.html#docker)
[简书gitlab+GitLab Runner注册](https://www.jianshu.com/p/a096ebd62275)