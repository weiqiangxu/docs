---
hide: true
---

# Redis限频

### 最简单的但是有超频的风险的
```
SET userID count_request
Expired userID xxx
incre(userID)
```
### 方案问题
```
在59s的时刻发送99次
在60s Redis key过期
61s时刻发送了99次
```


### 滑动时间窗口基于zset实现
```
# 毫秒为score ID为Key
ZADD KEY_NAME SCORE1 VALUE1.. SCOREN VALUEN

# 统计最近1min总次数
ZCOUNT key min max

# 删除1min以前的集合成员
ZREMRANGEBYSCORE key min max
```


### 令牌桶算法

> 常用于限流(请求放行之前需要获取令牌)

```
令牌桶自行恒定速率产生令牌

请求进来消耗令牌

如果令牌不够则丢弃请求

如果可以获取令牌则放行请求
```

### 令牌桶算法关键在于产生令牌的速率

```
假设每秒产生2个令牌

桶的容量是2

那么每秒最多消耗2个令牌
```