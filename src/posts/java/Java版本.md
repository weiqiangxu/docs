---
title: Java版本
tags:
  - java
categories:
  - java
---

在 Mac 上更改 Java 版本通常涉及更新 `JAVA_HOME` 和 `PATH` 环境变量。以下是在 Mac 上更改 Java 版本的一般步骤：

1. 首先，检查系统中已安装的 Java 版本。在终端中运行以下命令：

```
/usr/libexec/java_home -V
```

这将列出系统上安装的所有 Java 版本及其路径。

2. 确定要切换到的 Java 版本，并将其设置为默认版本。假设要切换到 JDK 8：

```
export JAVA_HOME=`/usr/libexec/java_home -v 1.8`
```

这将设置 `JAVA_HOME` 环境变量指向 JDK 8 的安装路径。

3. 更新 `PATH` 环境变量，以便系统能够找到新的 Java 版本。将以下命令添加到您的 shell 配置文件（如 `.bash_profile`、`.zshrc` 等）：

```
export PATH=$JAVA_HOME/bin:$PATH
```

4. 保存更改后，运行以下命令使更改生效：

```
source ~/.bash_profile
```

或

```
source ~/.zshrc
```

现在，您应该已经成功更改了 Java 版本。您可以在终端中运行 `java -version` 命令来验证已切换到正确的 Java 版本。