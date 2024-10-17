---
title: docker安装maven仓库
tags:
  - java
categories:
  - java
---

### 1. maven仓库安装

```bash
docker run -d -p 8081:8081 sonatype/nexus3
```

### 2. maven库访问

访问[http://localhost:8081](http://localhost:8081)右上角以管理员登陆，密码在容器之中的文件里面，用户名称是admin登陆


### 3.如何使用

1. 配置maven的settings.xml配置本地仓库的账号密码和地址

```xml
<!-- /Users/xuweiqiang/apache-maven-3.9.6/conf/settings.xml -->
<!-- 默认密码在容器的/var/nexus-data/admin-password -->
<!-- 登陆nexus服务右上角使用默认密码登陆后配置仓库的账号密码 -->
<servers>
    <server>
        <!--这是server的id 注意不是用户登陆的id-->
        <!-- 该id与distributionManagement中repository元素的id相匹配 -->
        <id>docker1</id>
        <username>admin</username>
        <password>123456</password>
    </server>
    </servers>
```

2. 在工具包的pom.xml配置本地中央仓库的地址

```xml
<!-- 增加distributionManagement段和当前项目groupId同级 -->
<groupId>com.example</groupId>

<distributionManagement>
    <repository>
      <id>docker1</id>
      <name>docker-test1</name>
      <!-- 注意必须是Type=Hosted的Name -->
      <!-- 注意路径的准确性 -->
      <url>http://localhost:8081/repository/maven-releases</url>
    </repository>
  </distributionManagement>
```

### Q&A

##### 本地安装了nexus，进入了地址http://localhost:8081/，怎么看有哪些包

-  Browse 选项卡中，您可以看到仓库中的所有包

##### Repositories的maven-central和maven-public和maven-release是什么

Maven 默认包含以下三个仓库：
maven-central: 这是 Maven 中央仓库，默认仓库、依赖项经过测试和验证，可以安全使用。
maven-public: 这是 Maven 公共仓库，存储公开的 Maven 依赖项，任何人都可以向 maven-public 仓库上传依赖项，依赖项可能没有经过测试和验证。
maven-release: 这是 Maven 发布仓库，用于存储已发布的 Maven 依赖，maven-release 仓库中的依赖项是稳定可靠的。
