# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json
COPY package*.json ./
COPY packages/app-main/package*.json ./packages/app-main/
COPY packages/app-trackdownload/package*.json ./packages/app-trackdownload/
COPY packages/shared-auth/package*.json ./packages/shared-auth/

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build:app-main
RUN npm run build:app-trackdownload

# 运行阶段 - 使用 Nginx 作为 Web 服务器
FROM nginx:alpine

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建后的文件
COPY --from=builder /app/packages/app-main/dist /usr/share/nginx/html/app-main
COPY --from=builder /app/packages/app-trackdownload/dist /usr/share/nginx/html/app-trackdownload

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
