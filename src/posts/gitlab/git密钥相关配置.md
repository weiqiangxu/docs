---
title: Git密钥相关配置
tags:
  - git
categories:
  - git
date: 2017-03-09 06:40:12
index_img: /images/bg/computer.jpeg
hide: false
---

### 1.本地生成密钥

```bash
# 默认密钥文件路径
$ mkdir -p ~/.ssh  && cd ~/.ssh 

# 使用账号生成SSH密钥
$ ssh-keygen -t rsa -C "your@email.com"

# 输入生成的文件前缀
$ Enter file in which to save the key: github

# 生成文件列表
$ ls 
github(私钥) github.pub(公钥)
```

> 登陆gitlab或者github的账户管理页面，将公钥粘贴在 SSH keys 存档.

```bash
# 解决git clone时候不加载密钥的问题
$ ssh-add ~/.ssh/rsa_id
```

### 2.检查密钥是否配置成功

```bash
ssh -T git@github.com
```


### Q&A

##### 1.git的全局配置

```bash
cat ~/.gitconfig
```






