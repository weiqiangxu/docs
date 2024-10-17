---
hide: true
---
# centos 安装 docker

[https://docs.docker.com/engine/install/centos/](https://docs.docker.com/engine/install/centos/)

[centos/7/x86_64/stable/Packages](https://download.docker.com/linux/centos/7/x86_64/stable/Packages/)

### 查看架构 
```
arch

download docker-ce-23.0.1-1.el7.x86_64.rpm
download docker-ce-cli-23.0.1-1.el7.x86_64.rpm
```

### centos install rpm
```
# yum install 
sudo yum localinstall file.rpm

# yum uninstall
sudo yum remove file.rpm

# rpm install
sudo rpm –ivh file.rpm

# update 
sudo rpm –Uvh file.rpm

# uninstall
sudo rpm –e file.rpm
```

### yum tool
```
yum remove <package_name>

yum install <package_name>

yum update <package_name>
```

### install docker-compose

[github.com/docker/compose](https://github.com/docker/compose/releases/tag/v2.16.0)

```
download docker-compose-linux-x86_64

upload to /home

cp /home/docker-compose-linux-x86_64 /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose
```
