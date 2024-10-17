---
title: Linux服务器SSH密钥
hide: true
---

### 一、本地机器（创建公钥私钥）


1. 进入密钥存储路径

```
sudo mkdir -p ~/.ssh

cd ~/.ssh

# 输入执行后指定文件名为 my_linux 然后一路回车
ssh-keygen -t rsa
```

2. 生成示例
```
.ssh ssh-keygen -t rsa   
Generating public/private rsa key pair.
Enter file in which to save the key (/Users/dofun/.ssh/id_rsa): tencent 
Enter passphrase (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in tencent
Your public key has been saved in tencent.pub
The key fingerprint is:
SHA256:2axXRhYNu9fpMg0O4QxPr7sAAnMVuxRWLUNrfy00 dofun@weiqiangxudeMac-mini.local
The key's randomart image is:
+---[RSA 3072]----+
|      .++ +.*.   |
|       +.+ _++* =   |
|      ..+ + + o .|
|     B ... o + ..|
|    . + o.. o . .|
|     . ..+       |
|        ...      |
+----[SHA256]-----+

➜  .ssh ls -la | grep tencent
-rw-------   1 dofun  staff  2622  1 10 11:36 tencent
-rw-r--r--   1 dofun  staff   586  1 10 11:36 tencent.pub

密钥生成后会在当前目录下多出两个文件
tencent (私钥) tencent.pub (公钥)
```


### 二、远程服务

1. 公钥拷贝到远程服务器

```
# 登录远程服务器 && 创建公钥存放路径
mkdir -p /root/.ssh

# 创建密钥文件存放公钥
cd /root/.ssh && touch authorized_keys

# 将上面生成的公钥内容粘贴到该文件
vim authorized_keys

chmod 700 /root/.ssh

chmod 600 /root/.ssh/authorized_keys
```

2. 开启远程服务器可以使用密钥登录

```
sudo vim /etc/ssh/sshd_config

# 打开配置
PubkeyAuthentication yes
```
```
# 重启服务
systemctl restart sshd
```


### 三、登录服务器

```
ssh -i ~/.ssh/tencent root@[IP地址]

ssh -i ~/.ssh/tencent root@43.156.75.90 
```


### 禁用密码登录 (非必需)
```
PasswordAuthentication no
```

### 直接密码登录

```
ssh root@192.168.1.2
```