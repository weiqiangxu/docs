# 如何安装gitlab

### 一、Linux上安装gitlab

[gitlab.cn/install中文安装手册](https://gitlab.cn/install/)

1. install in CentOS [其他安装看相关文章的“官方install手册”]

```bash
gitlab/gitlab-ee：完整的 GitLab 软件包，包含所有社区版功能以及 企业版功能
gitlab/gitlab-ce：一个精简的包，仅包含社区版功能
gitlab/unstable: 发布候选版本和其他不稳定版本
```

```bash
# RHEL/CentOS 6 and 7

$ curl https://packages.gitlab.com/install/repositories/gitlab/gitlab-ee/script.rpm.sh | sudo bash

$ The repository is setup! You can now install packages.

$ sudo EXTERNAL_URL="http://127.0.0.1:8899" yum install -y gitlab-jh
```

```bash
# 更新配置
gitlab-ctl reconfigure

# 重启GitLab
gitlab-ctl restart
```

2. 查看并修改密码

```bash
cat /etc/gitlab/initial_root_password
```

3. 访问gitlab

```bash
# https://docs.gitlab.com/ee/administration/operations/puma.html
puma['per_worker_max_memory_mb'] = 1024
```

### 二、常用的一些命令

```bash
# 启动服务
gitlab-ctl start

# 更新配置
gitlab-ctl reconfigure

# 重启GitLab
gitlab-ctl restart

# 查看gitlab运行状态
sudo gitlab-ctl status

#停止gitlab服务
sudo gitlab-ctl stop

# 查看gitlab运行所有日志
sudo gitlab-ctl tail

#查看 nginx 访问日志
sudo gitlab-ctl tail nginx/gitlab_acces.log	

#查看 postgresql 日志
sudo gitlab-ctl tail postgresql	

# 停止相关数据连接服务
gitlab-ctl stop unicorn
gitlab-ctl stop sidekiq

# 系统信息监测
gitlab-rake gitlab:env:info
```

### 三、GitLab-2.配置外网映射之后clone地址还是内网地址

```bash
cd /opt/gitlab/embedded/service/gitlab-rails/config

vim gitlab.yml

# 更改 gitlab.host

gitlab-ctl restart

gitlab_rails['initial_root_password'] = '<my_strong_password>'

```

### 四、极狐查看用户信息

```bash
curl http://127.0.0.1:8899/api/v4/users?username=root

vim /etc/gitlab/gitlab.rb

# 更改密码
gitlab_rails['initial_root_password'] = '<my_strong_password>'
```

### 相关文章

[GitLab-2.配置外网映射之后clone地址还是内网地址](https://www.jianshu.com/p/c98488d9cd26)

[gitlab中文手册](https://docs.gitlab.cn/jh/index.html)

[官方install手册](https://docs.gitlab.com/ce/install/)

[知乎-如何搭建gitlab服务器——使用离线安装包部署](https://zhuanlan.zhihu.com/p/338882906)

[https://hub.docker.com/r/gitlab/gitlab-ce](https://hub.docker.com/r/gitlab/gitlab-ce)

[https://docs.gitlab.com/ee/install/docker.html](https://docs.gitlab.com/ee/install/docker.html)

[https://docs.gitlab.com/](https://docs.gitlab.com/)

[gitlab CI/CD](https://docs.gitlab.com/ee/ci/)

[重置用户密码](https://docs.gitlab.cn/jh/security/reset_user_password.html#%E4%BD%BF%E7%94%A8-rake-%E4%BB%BB%E5%8A%A1)