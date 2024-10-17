objectName = hello
foo = $(objectName)
test:
	@echo "hello world"
fmt:
	@echo "fmt"
test_val:
	@echo $(objectName) ~ ${objectName} "hello three";"jack"
	@echo $(foo)
awk_test:
	@echo "awk_test"
test_phony:
	@echo "test_phony"

# 如果没有当前的伪目标，那么将会无法执行echo而是提示 make: `build_binary' is up to date.
.PHONY: build_binary
build_binary:
	@echo "build_binary_done"
	