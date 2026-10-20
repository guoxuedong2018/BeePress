# 原型部署

这份文档是宿主项目的部署约定模板。把 `<deploy-cli>`、目标环境和访问策略替换成真实值；
不要把域名、账号、token 或内部地址提交进仓库。

## 前置

- `npm run build` 通过；
- `npx beepress preflight` 通过；
- 目标环境已配置，且本次发布范围已确认。

## 命令

```bash
npm run build
npx beepress preflight
<deploy-cli> --dir dist --dry-run   # 先看计划
<deploy-cli> --dir dist             # 人确认后执行
```

## 检查清单

- [ ] 生产包不含评审/内容工具和源码坐标
- [ ] 无 `.env`、真实用户数据、内部域名或密钥
- [ ] 深链 fallback / hash 路由在目标托管上可用
- [ ] 访问范围最小，公开链接已确认
- [ ] 线上版本与本机构建一致
- [ ] 回滚方式已记录

## 失败处理

保留本地 `dist/` 和部署日志（脱敏），先报告原因；不要用重试掩盖配置或构建错误。
