---
title: defer
category:
  - go
tag:
  - go
---

# Defer

1. 执行顺序
2. 和return执行顺序
3. 函数返回值初始化（默认零值）
4. 有名函数返回值可被defer修改
5. defer遇见panic (有recover则正常补获没有则defer链)
6. defer中包含panic (defer之中的panic会覆盖原有的panic)



[GO修养之路](https://www.yuque.com/aceld/golang/ithv8f)