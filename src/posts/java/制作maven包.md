---
title: Maven包制作与使用
tags:
  - java
categories:
  - java
---

### 1.IDEA创建一个Maven工具包

```bash
IDEA New Project
Archetype maven-archetype-quickstart
```

### 2.mvn命令创建一个Maven工具包

1. 命令行创建

```bash
# 初始化项目
mvn archetype:generate \
  -DgroupId=com.example \
  -DartifactId=demo \
  -Dversion=1.0.0
```

```xml
<!-- 在pom.xml添加依赖 -->
<dependency>
  <groupId>junit</groupId>
  <artifactId>junit</artifactId>
  <version>4.13.2</version>
  <scope>test</scope>
</dependency>
```

2. 手动创建

```bash
mkdir my-project

cd my-project
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>my.group</groupId>
  <artifactId>my-artifact</artifactId>
  <version>1.0.0</version>

  <dependencies>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.10.1</version>
        <configuration>
          <source>1.8</source>
          <target>1.8</target>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.0.0-M7</version>
      </plugin>
    </plugins>
  </build>
</project>
```

```java
package my.group.my-artifact;

public class Calculator {

  public static int add(int a, int b) {
    return a + b;
  }

}
```

```java
package my.group.my-artifact;

import org.junit.Test;

import static org.junit.Assert.*;

public class CalculatorTest {

  @Test
  public void testAdd() {
    assertEquals(3, Calculator.add(1, 2));
  }

}
```

```bash
mvn clean install
```

### 3.将Maven工具包推送到本地中央仓库

1. 配置maven的settings.xml配置本地仓库的账号密码和地址

```xml
<!-- /Users/xuweiqiang/apache-maven-3.9.6/conf/settings.xml -->
<!-- 配置仓库的账号密码 -->
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

```bash
# 在工具项目路径(pom.xml同级目录)推送包到中央仓库
$ mvn deploy
```

3. 也可以直接将包推送到本地仓库路径(不是本地nexus服务仓库)

```bash
# mvn install 用于将当前项目打包并安装到 Maven 本地仓库
mvn install

# 用于将本地 jar 包安装到 Maven 本地仓库（本地路径）
mvn install:install-file \
  -Dfile=target/demo-1.0.0.jar \
  -DgroupId=com.example \
  -DartifactId=demo \
  -Dversion=1.0.0 \
  -Dpackaging=jar
```

```bash
mvn archetype:generate \
  -DgroupId=com.example \
  -DartifactId=demo \
  -Dversion=1.0.0
```

### 4.IDEA创建一个springboot工程

### 5.springboot使用Maven工具包

1. 使用的工具包的工程添加依赖
2.    

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>1.0.1</version>
</dependency>
```

```java
import com.example.App;

@RequestMapping("/get")
@ResponseBody
public Integer Get() {
    return App.add(1,2);
}
```

### 相关知识

##### 1.mvn clean 清理的是哪些文件

- 目标目录target的 (类文件*.class、测试类文件*.test.class、jar、war)文件
- pom.xml.classpath 文件
- project.build.outputDirectory 目录
- project.build.testOutputDirectory 目录
- project.reporting.outputDirectory 目录

如果`mvn clean install`清理当前项目的target目录

##### 2.mvn install会生成哪些文件还做了什么

会将项目安装到本地仓库。

- 删除目标目录 (target) 中的所有文件
- 源代码编译为字节码
- 项目打包成 JAR 或 WAR 文件
- 项目安装到本地仓库

##### 3.mvn install会安装到哪个仓库并且如何指定仓库

- 默认会安装到本地仓库`$HOME/.m2/repository`。
- 使用`mvn install -Dmaven.repo.local=/path/to/local/repository`指定本地仓库。
- 使用`$HOME/.m2/settings.xml`配置仓库

```yml
<settings>
  <localRepository>/path/to/local/repository</localRepository>
</settings>
```
```log
[INFO] Installing /Desktop/demo/pom.xml to /apache-maven-3.9.6/maven-repo/com/example/demo/1.0.0/demo-1.0.0.pom
[INFO] Installing /Desktop/demo/target/demo-1.0.0.jar to /apache-maven-3.9.6/maven-repo/com/example/demo/1.0.0/demo-1.0.0.jar
```

##### 4.为什么我的Mac没有.m2/settings.xml没有的话IDEA会读取哪个获取本地仓库路径

- 默认会读取~/.m2/maven.conf获取本地仓库路径
- 如果也没有选中$HOME/.m2/repository路径

##### 3.mvn deploy如何指定仓库到localhost:8081

```XML
<!-- 在 pom.xml 配置 -->
<distributionManagement>
  <repository>
    <id>docker1</id>
    <name>maven-releases</name>
    <url>http://localhost:8081/content/repositories/releases</url>
  </repository>
</distributionManagement>
```

```bash
# 搜索包
mvn dependency:list -DgroupId=org.apache.maven.plugins -DartifactId=maven-deploy-plugin
```

如果出现了`405 Method Not Allowed `那就更改推送方式


```bash
mvn deploy
```

##### 4.Maven 官方提供的 Archetype

```bash
Archetype 是一个 Maven 插件，它可以根据预定义的模板生成项目（包括 pom.xml 文件、源代码目录、测试目录等）

$ mvn archetype:generate \
    -DgroupId=com.example \
    -DartifactId=demo \
    -DarchetypeArtifactId=maven-archetype-quickstart
```
- maven-archetype-quickstart：用于创建简单的 Java 项目
- maven-archetype-webapp：用于创建 Web 应用程序
- maven-archetype-ejb：用于创建 EJB 项目



```bash
# 显示当前项目的有效 POM 即所有依赖项和配置的合并视图
# 执行路径需要有 pom.xml
mvn help:effective-pom


# 搜索远程仓库
mvn search:maven-plugins -q org.apache.maven.plugins:maven-deploy-plugin

# 插件添加到本地仓库
mvn install:install-file -Dfile=/path/to/maven-deploy-plugin-3.2.0.jar -DgroupId=org.apache.maven.plugins -DartifactId=maven-deploy-plugin -Dversion=3.2.0


# 查看项目的有效 POM，其中包含项目的依赖项信息
mvn help:effective-pom

# 查看项目的依赖项树，其中包含所有依赖项的信息
mvn dependency:tree

# 列出项目的依赖项
mvn dependency:list

# 将指定的 JAR 文件安装到本地仓库中
mvn install:install-file

# 将项目部署到远程仓库中
mvn deploy:deploy
```

[https://search.maven.org/](https://search.maven.org/)搜索包`maven-deploy-plugin`可以看到有哪些版本

```bash
maven-install-plugin: 将项目安装到本地仓库
maven-deploy-plugin: 将项目发布仓库
```