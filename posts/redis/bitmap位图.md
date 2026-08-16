> Redis Bitmap：位图，通过String类型实现的位操作，适合状态标记与统计

## 目录

- [一、基本概念](#一基本概念)
- [二、常用命令](#二常用命令)
- [三、底层实现](#三底层实现)
- [四、应用场景](#四应用场景)
- [五、使用示例](#五使用示例)
- [六、相关资料](#六相关资料)

## 一、基本概念

| 特性 | 说明 |
|------|------|
| 本质 | String类型的位操作扩展 |
| 操作单位 | bit（位） |
| 最大长度 | 2^32 位（512MB） |
| 编码 | embstr / raw |
| 适用场景 | 布尔状态、签到、统计 |

## 二、常用命令

### 2.1 基本操作

```bash
# 设置某位的值（0或1）
$ SETBIT sign:user:1001:202401 0 1   # 第0位（1号）签到
$ SETBIT sign:user:1001:202401 6 1   # 第6位（7号）签到

# 获取某位的值
$ GETBIT sign:user:1001:202401 0    # 1
$ GETBIT sign:user:1001:202401 1    # 0

# 获取位图长度（字节数）
$ STRLEN sign:user:1001:202401

# 统计为1的位数
$ BITCOUNT sign:user:1001:202401
$ BITCOUNT sign:user:1001:202401 0 6   # 字节范围
```

### 2.2 位运算

```bash
# 多个位图进行AND/OR/XOR/NOT运算
$ BITOP AND result sign:user:1001 sign:user:1002   # 同时签到
$ BITOP OR  result sign:user:1001 sign:user:1002   # 任意签到
$ BITOP XOR result sign:user:1001 sign:user:1002   # 不同时签到
$ BITOP NOT result sign:user:1001                  # 取反

# 查找第一个为0或1的位
$ BITPOS sign:user:1001:202401 0       # 第一个0
$ BITPOS sign:user:1001:202401 1       # 第一个1
$ BITPOS sign:user:1001:202401 1 0 6   # 指定字节范围内
```

## 三、底层实现

### 3.1 存储方式

Bitmap 本质上是 String，数据在内存中就是连续的字节数组：

```
SDS:
| len | alloc | flags | buf[0] | buf[1] | buf[2] | ... |

buf[0] 的8位：bit7 bit6 bit5 bit4 bit3 bit2 bit1 bit0
              ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓
              0    1    2    3    4    5    6    7   （位索引）
```

### 3.2 位索引计算

```
byte_index = offset / 8
bit_index  = offset % 8
```

**SETBIT key 10 1** 会设置 buf[1] 的第 2 位（bit2）。

### 3.3 内存优势

| 场景 | 数据量 | 传统存储 | Bitmap |
|------|--------|----------|--------|
| 1亿用户签到 | 1亿 | 1亿条记录 | ~12MB |
| 1亿用户在线状态 | 1亿 | 1亿条记录 | ~12MB |
| 1千万UV统计 | 1千万 | 1千万条记录 | ~1.2MB |

## 四、应用场景

### 4.1 用户签到

```python
import time

user_id = 1001
today = time.strftime('%Y%m')

# 签到（今天是这个月的第几天-1）
day = time.strftime('%d')
offset = int(day) - 1
r.setbit(f'sign:user:{user_id}:{today}', offset, 1)

# 查询今天是否签到
signed = r.getbit(f'sign:user:{user_id}:{today}', offset)

# 本月签到次数
count = r.bitcount(f'sign:user:{user_id}:{today}')

# 连续签到天数
def continuous_days(user_id, month):
    bits = r.get(f'sign:user:{user_id}:{month}')
    if not bits:
        return 0
    days = 0
    for byte in bits[::-1]:  # 从后往前
        if byte == 0:
            break
        # 统计byte中末尾连续1的位数
        ...
    return days
```

### 4.2 用户在线状态

```python
# 用户上线
r.setbit('online:users', user_id, 1)

# 用户下线
r.setbit('online:users', user_id, 0)

# 查询是否在线
is_online = r.getbit('online:users', user_id)

# 当前在线人数
online_count = r.bitcount('online:users')
```

### 4.3 活跃用户统计（UV）

```python
# 用户访问页面
r.setbit('page:article:123:uv:20240120', user_id, 1)

# 当日UV
uv = r.bitcount('page:article:123:uv:20240120')

# 一周内活跃用户（OR运算）
r.bitop('OR', 'week:active',
        'page:article:123:uv:20240120',
        'page:article:123:uv:20240121',
        'page:article:123:uv:20240122')
week_uv = r.bitcount('week:active')
```

### 4.4 布隆过滤器

```python
import mmh3

def bloom_add(key, value, hash_count=7, bit_size=2**24):
    for seed in range(hash_count):
        h = mmh3.hash(value, seed) % bit_size
        r.setbit(key, h, 1)

def bloom_exists(key, value, hash_count=7, bit_size=2**24):
    for seed in range(hash_count):
        h = mmh3.hash(value, seed) % bit_size
        if not r.getbit(key, h):
            return False  # 一定不存在
    return True  # 可能存在（有误判）
```

## 五、使用示例

### 5.1 Python示例

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# 用户签到
key = 'sign:user:1001:202401'
r.setbit(key, 0, 1)   # 1号签到
r.setbit(key, 6, 1)   # 7号签到
r.setbit(key, 15, 1)  # 16号签到

print(r.getbit(key, 0))   # 1
print(r.getbit(key, 1))   # 0

print(r.bitcount(key))    # 3  本月签到3次

# 多用户统计
r.setbit('sign:user:1002:202401', 0, 1)
r.setbit('sign:user:1003:202401', 0, 1)
r.setbit('sign:user:1003:202401', 6, 1)

# 1001和1002同时签到的天数
r.bitop('AND', 'both_sign',
        'sign:user:1001:202401',
        'sign:user:1002:202401')
print(r.bitcount('both_sign'))  # 1
```

### 5.2 Go示例

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    ctx := context.Background()

    key := "sign:user:1001:202401"

    // 签到
    rdb.SetBit(ctx, key, 0, 1)
    rdb.SetBit(ctx, 6, 1)

    // 查询
    val, _ := rdb.GetBit(ctx, key, 0).Result()
    fmt.Println(val) // 1

    // 统计
    count, _ := rdb.BitCount(ctx, key, &redis.BitCount{}).Result()
    fmt.Println(count) // 2
}
```

## 六、相关资料

- [Redis Bitmap命令](https://redis.io/commands/?group=bitmap)
- [Bitmap使用场景](https://redis.io/docs/data-types/bitmaps/)
