# 使用官方Deno镜像
FROM denoland/deno:1.38.0

# 设置工作目录
WORKDIR /app

# 复制配置文件
COPY deno.json .

# 复制源代码
COPY main.ts .

# 缓存依赖项
RUN deno cache main.ts

# 创建非root用户
RUN groupadd -r deno && useradd -r -g deno deno
RUN chown -R deno:deno /app
USER deno

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD deno eval "fetch('http://localhost:8000/health').then(r => r.ok ? Deno.exit(0) : Deno.exit(1)).catch(() => Deno.exit(1))"

# 启动应用
CMD ["deno", "run", "--allow-net", "--allow-env", "main.ts"]
