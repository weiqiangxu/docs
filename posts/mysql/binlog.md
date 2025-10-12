# binlog


### 一、Docker运行MySQL单机服务开启binlog


```bash
$ docker pull mysql:5.7

$ docker run --name server1 -e MYSQL_ROOT_PASSWORD=123456 -p 3306:3306 -d mysql:5.7

# mysqld会因为文件权限而跳过这个配置
$ vim /etc/my.cnf

# 添加下面两行内容
log-bin=mysql-bin
server-id=1

$ docker restart server1

# 连接MySQL查看到是ON标识已经开启
$ SHOW VARIABLES LIKE 'log_bin';

# 创建数据库
$ create database test;

# 也可以查看到BIN LOG
$ SHOW BINARY LOGS;

# 可以在容器内看到文件
$ ls /var/lib/mysql/mysql-bin.000001
```


### 二、使用binlog恢复数据到指定的时间点


##### 1.备份一下数据防止出现问题

```bash
# 进行基于binlog的数据恢复之前
# 最好对当前的数据文件（通常存储在/var/lib/mysql目录下）进行备份
# 这样可以在恢复过程出现问题时，将数据恢复到备份时的状态
$ cp -R /var/lib/mysql /var/lib/mysql_backup
```

##### 2.对binlog转存然后换为SQL用sorce载入另一个数据库

```bash
# docker把binlog文件拷贝出来
# docker cp <容器名称或ID>:<容器内文件路径> <宿主机目标路径>
$ docker cp server1:/var/lib/mysql/mysql-bin.000001 .

# mysql:5.7没有mysqlbinlog命令
# bitnami/mysql:5.7有
$ docker run -v C:/Users/xuweiqiang/Desktop:/home \
    -e ALLOW_EMPTY_PASSWORD=yes \
    -d bitnami/mysql:5.7

$ cd /home

# 查看binlog日志可以看到3条
$ mysqlbinlog --no-defaults /home/mysql-bin.000001 | grep -i -E 'date|time'

250104 18:11:17 server id 1  end_log_pos 423 CRC32 0xc2446d69  Query...
250104 18:13:30 server id 1  end_log_pos 646 CRC32 0x5077f591  Query...
250104 18:14:20 server id 1  end_log_pos 909 CRC32 0xb82d35b2  Query...


#将binlog转成SQL
# 会包含--start-datetime指定时间点的事务
# 但不包含--stop-datetime指定时间点的事务
# 左闭右开
# 也可以通过事务ID提取--start-position\--stop-position
$ mysqlbinlog --no-defaults \
    --start-datetime="2025-01-04 18:11:17" \
    --stop-datetime="2025-01-04 18:13:30" \
    /home/mysql-bin.000001 > recovery.sql

# 查看SQL文件内容
$ cat recovery.sql

# 登录新的MySQL服务
$ mysql -uroot -p

$ source /home/recovery.sql

# 此时可以看到server1的binlog恢复的数据了
$ show databases;
```

> 其实这样的操作仅仅只是把某一部分的执行动作重新执行了，但是常见的是误删数据，要回到误删数据以前的情况.

### 三、如何恢复误删的数据

已知`T0`时间，开始不断插入数据，在`T1`时间的时候将数据删除了，此时通过`binlog`获取`T0`到`T1`之前的数据插入，用来恢复数据。明显这是非常不好用的，因为`T0`到`T1`之间可能时间很长，日志非常庞大。

> 数据恢复是`mysqldump`全量数据再结合`binlog`的增量数据恢复更为合理.


```bash
# mysqldump制作快照记录下binlog的位置
$ mysqldump  --master-data=2 -u root -p test>test.sql
```

```sql
-- MySQL dump 10.13  Distrib 5.7.43, for Linux (aarch64)
...
--
-- Position to start replication or point-in-time recovery from

# 注意: 这里清晰的展示备份的这一刻
# 这里清晰的展示备份完成时的二进制日志文件名和位置 binlog - pos 信息
# 在binlog获取这个事务以后的增量数据
# mysqlbinlog --start-position=2016 mysql-bin.000002
# mysqldump 没有包含 2016 位置开始的事务
# 而 binlog 是从 2016 位置开始记录后续事务
-- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000002', MASTER_LOG_POS=2016;


DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` ...
```