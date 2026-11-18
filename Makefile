PNPM ?= pnpm

.PHONY: help install dev dev.chrome build build.chrome zip zip.chrome preview \
	lint lint-fix format format-check typecheck check verify clean distclean

.DEFAULT_GOAL := help

-include .local/Makefile

help: ## 显示本帮助
	@grep -hE '^[a-zA-Z_.-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖（自动执行 wxt prepare）
	$(PNPM) install

dev: ## 开发模式（默认浏览器）
	$(PNPM) dev

dev.chrome: ## 开发模式（Chrome）
	$(PNPM) dev:chrome

build: ## 构建（默认浏览器）
	$(PNPM) build

build.chrome: ## 构建（Chrome）
	$(PNPM) build:chrome

zip: ## 打包（默认浏览器）
	$(PNPM) zip

zip.chrome: ## 打包（Chrome）
	$(PNPM) zip -b chrome

preview: ## 预览构建产物
	$(PNPM) preview

lint: ## oxlint
	$(PNPM) lint

lint-fix: ## oxlint --fix
	$(PNPM) lint:fix

format: ## oxfmt 格式化
	$(PNPM) format

format-check: ## 检查格式
	$(PNPM) format:check

typecheck: ## tsc --noEmit
	$(PNPM) typecheck

check: format-check lint typecheck ## 全量静态检查（格式 + lint + 类型）
	@echo "== check passed =="

verify: check build.chrome ## 静态检查 + Chrome 构建
	@echo "== verify passed =="

clean: ## 删除构建产物与生成文件
	rm -rf .output .wxt

distclean: clean ## 额外删除依赖
	rm -rf node_modules
