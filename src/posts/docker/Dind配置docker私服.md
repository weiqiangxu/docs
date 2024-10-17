# Dind配置docker私服

### 进入镜像

```
mkdir -p /root/.docker && touch /root/.docker/config.json
mkdir -p /etc/docker && touch /etc/docker/daemon.json
```

### config.json
```
{
  "auths": {
    "registry.bingosoft.net": {
      "auth": "xxx"
    }
  }
}
```

### daemon.json
```
{
  "insecure-registries" : [ "registry.bingosoft.net" ]
}
```

### 重启容器

### 解决的问题有 无法docker login并且SSL握手失败的问题