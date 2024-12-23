# bitmap位图

(bitmap)[http://c.biancheng.net/redis/bitmap.html]

### 内存占用

> 位图（bitmap）同样属于 string 数据类型；512 MB 最大；

### 经典场景之记录签到情况

```
SETBIT key offset value

SETBIT userID(用户ID) 1(具体日期) bool(是否签到)

一个用户一个位图
```



