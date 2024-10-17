---
hide: true
---
# harbor install && usage

[goharbor.io](https://goharbor.io/docs/2.7.0/install-config/)

1. 下载 harbor 安装程序 [下载地址](https://github.com/goharbor/harbor/tags) harbor-offline-installer-v2.5.6.tgz

2. 修改配置文件 cp harbor.yml.tmpl harbor.yml
```
# vim harbor.yml
hostname: 10.3.10.55

# htp related config
htp:

# port for htp, default is 80. If htps enabled, this port will redirect to htps port
port: 8081
```

3. 执行安装
```
./prepare

./install.sh
```

4. 安装后生成文件用于启动服务
```
docker-compose up -d
```

5. 访问harbor站点
```
# harbor.yml中噢诶之的host和port
# 初始的默认用户是admin，密码是Harbor12345

http://{$host}:{$port}
```

6. 更改docker的站点
```
# vim /etc/docker/daemon.json
{
"insecure-registries": ["10.3.10.55:8081"]
}

# 重启docker服务
systemctl daemon-reload && systemctl restart docker
```

7. docker登陆并推送镜像
```
docker login 10.3.10.55:8081
user:admin
password:
Login Succeeded

scp /Users/xuweiqiang/Documents/runc.amd64 root@10.202.37.179:/home/runc.amd64
```



### 参考文档

[Docker技术：大神整理——Harbor私服搭建和使用](https://baijiahao.baidu.com/s?id=1707816679863571585)

[https://goharbor.io/](https://goharbor.io/)