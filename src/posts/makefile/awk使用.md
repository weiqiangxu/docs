---
hide: true
---
# linux awk

[linux三剑客之三（awk）(最强大）](https://zhuanlan.zhihu.com/p/419494231)

```
案例1：把/Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

awk -F: '/test/' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

案例2：把/Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

awk -F: '/^test/' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

案例3：/Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt ??

awk -F: '{print $1,$2}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

案例1：输出/Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

awk -F: '{print NR,$0}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

案例2：要求把第7行之后的内容输出出来，包括行号

awk -F: 'NR > 7{print NR,$0}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

案例3：要求输出第3行之后的内容且第5行之前的内容输出出来，包含行号

awk -F: 'NR > 3 && NR < 5{print NR,$0}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

案例5：要求输出倒数第3列 ???

awk -F: '{print $(NF-2)}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

案例6：要求不使用-F参数，以：分割，并输出第1列和第3列

awk 'BEGIN{FS=":"}{print $1,$3}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

案例7: 输出第123列

awk '{print $1,$2,$3}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt
```
```
$0标识每一行

awk -F: '{print $0}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

读入的行被以:为分隔符分解成若干字段打印第2列

awk -F: '{print $2}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt

awk '{print $2}' /Users/xuweiqiang/Documents/code/book/makefile/awk_file.txt
```

2. 打印 go.mod 文件里面的 module 名称

```
grep 'module ' go.mod | awk '{print $2}'
```

3. sed 命令实现 cut 命令的效果

[http://c.biancheng.net/linux/sed.html](http://c.biancheng.net/linux/sed.html)

```
展示前面5行内容，然后分隔符是:，移除:以及后面的内容

head -n 5 /Users/xuweiqiang/Documents/code/book/makefile/sed.txt|sed 's/:.*$//'
```

```
展示前面1行内容，然后移除 /user/local 内容

head -n 1 /Users/xuweiqiang/Documents/code/book/makefile/sed.txt|sed 's/\/user\/local//'

展示前面1行内容，然后移除 user 内容

head -n 1 /Users/xuweiqiang/Documents/code/book/makefile/sed.txt|sed 's/user//'
```
4. 获取module name之中的 backend/message-center

```
grep 'module ' go.mod | awk '{print $2}' | sed 's/code.google.com\///g
```

```
module code.google.com/backend/message-center
go 1.17
```

5. 将sed的内容过滤只剩下有module字眼的，然后再获取第二列，然后再删除code.google.com/ (awk默认以空白字符为分割符)

````
grep 'module' /Users/xuweiqiang/Documents/code/book/makefile/sed.txt | awk '{print $2}' | sed 's/code.google.com\///g'

grep 'module' /Users/xuweiqiang/Documents/code/book/makefile/sed.txt | awk '{print $1}' | sed 's/code.google.com\///g'
```