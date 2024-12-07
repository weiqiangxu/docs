---
title: mongodb自定义排序
tags:
  - golang
  - mongodb
categories:
  - golang
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


