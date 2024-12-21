# MySQL规范

### 一、建表

1. 是与否字段
2. 表名、字段名
3. 表名不使用复数
4. 禁用保留字
5. 索引名
6. 小数类型
7. 字符串类型。
8. varchar length < 5000
9. 表必备三字段 (要记录时区信息，那么类型设置为 timestamp)
10. 物理\逻辑删除

### 二、索引

1. 唯一特性字段
2. 三表join && 字段类型
3. varchar索引长度
4. 左/全模糊匹配

### 三、SQL语句

1. count(*)
2. count(distinct col)与null
3. sum()的NPE
4. null值判定与is null
5. 分页查询出现count is 0时
6. 外键
7. 存储过程
8. 数据订正先select
9. 多表查询

### 四、ORM映射

1. 不能使用*
2. pojo类布尔属性
3. 类属性名与数据库字段
4. sql.xml 配置参数
5. iBATIS.queryForList
6. HashMap
7. 更新必须update_time