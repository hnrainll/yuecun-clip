PNPM ?= pnpm

.PHONY: help install dev build zip check format clean

.DEFAULT_GOAL := help

-include .local/Makefile

help: ## 显示本帮助
	@grep -hE '^[a-zA-Z_.-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖（自动执行 wxt prepare）
	$(PNPM) install

dev: ## 开发 Chrome 扩展
	$(PNPM) dev

build: ## 构建 Chrome 扩展
	$(PNPM) build

zip: ## 构建并打包 Chrome 扩展（上传商店用）
	$(PNPM) zip

check: ## 检查格式、lint 和类型
	$(PNPM) format:check
	$(PNPM) lint
	$(PNPM) typecheck

format: ## 格式化代码
	$(PNPM) format

clean: ## 删除构建产物与生成文件
	rm -rf .output .wxt
