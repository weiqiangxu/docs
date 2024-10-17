---
title: mongodb自定义排序
index_img: /images/bg/golang.webp
banner_img: /images/bg/5.jpg
tags:
  - golang
  - mongodb
categories:
  - golang
date: 2020-08-20 17:43:12
excerpt: 指定排序
hide: true
---

### code

``` go
db.user.aggregate([
    { $limit: 10 },
    { $skip: 0 },
    {$addFields: { user_sort:{$indexOfArray:[[6,8,7,9,1,3],"$user_status"]}}},
    {$sort:{user_sort:1}}
])
```


