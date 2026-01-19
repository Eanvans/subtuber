<template>
  <div class="privacy-container">
    <div class="privacy-content">
      <h1>隐私政策</h1>
      <p class="last-updated">最后更新于：{{ currentDate }}</p>

      <section class="privacy-section">
        <h2>1. 概述</h2>
        <p>SubTuber（以下简称"本服务"或"我们"）尊重您的隐私。本隐私政策解释了我们如何收集、使用、存储和保护您的个人信息。</p>
      </section>

      <section class="privacy-section">
        <h2>2. 我们收集的信息</h2>
        <p>我们可能收集以下类型的信息：</p>
        <ul>
          <li><strong>账户信息：</strong>您在登录和创建账户时提供的信息，如邮箱地址和显示名称</li>
          <li><strong>使用数据：</strong>您如何使用本服务的信息，包括访问的内容、点击的链接和采取的操作</li>
          <li><strong>设备信息：</strong>您用于访问本服务的设备信息，包括设备类型、操作系统和浏览器类型</li>
          <li><strong>日志数据：</strong>服务器日志，包括 IP 地址、访问时间和请求数据</li>
        </ul>
      </section>

      <section class="privacy-section">
        <h2>3. 信息的使用</h2>
        <p>我们使用收集的信息用于以下目的：</p>
        <ul>
          <li>提供和维护本服务</li>
          <li>改进和优化用户体验</li>
          <li>发送关于服务更新或变更的通知</li>
          <li>响应您的查询和请求</li>
          <li>分析使用模式以改进功能</li>
          <li>检测和防止欺诈或安全问题</li>
        </ul>
      </section>

      <section class="privacy-section">
        <h2>4. 信息的共享</h2>
        <p>我们不会向第三方出售或租赁您的个人信息。但在以下情况下，我们可能会共享信息：</p>
        <ul>
          <li>当您明确同意时</li>
          <li>根据法律或政府要求</li>
          <li>为了保护我们的权利、隐私、安全或财产</li>
          <li>与第三方服务提供商共享，他们为我们处理数据但受到保密协议的约束</li>
        </ul>
      </section>

      <section class="privacy-section">
        <h2>5. 数据安全</h2>
        <p>我们采取适当的安全措施保护您的个人信息免受未经授权的访问、修改、公开或销毁。这些措施包括使用加密、安全服务器和访问控制。然而，没有任何传输方法或电子存储是完全安全的。</p>
      </section>

      <section class="privacy-section">
        <h2>6. Cookie 和追踪技术</h2>
        <p>本服务可能使用 Cookie 和类似的追踪技术来增强您的使用体验、存储用户偏好和分析使用模式。您可以通过浏览器设置控制 Cookie。</p>
      </section>

      <section class="privacy-section">
        <h2>7. 第三方链接</h2>
        <p>本服务可能包含指向第三方网站的链接。我们对这些网站的隐私政策或内容不负责。我们建议您在提供任何个人信息之前查看这些网站的隐私政策。</p>
      </section>

      <section class="privacy-section">
        <h2>8. 儿童隐私</h2>
        <p>本服务不面向 13 岁以下的儿童。我们不会故意收集 13 岁以下儿童的个人信息。如果我们意识到收集了儿童的信息，我们将立即删除。</p>
      </section>

      <section class="privacy-section">
        <h2>9. 您的权利</h2>
        <p>根据适用法律，您可能有权：</p>
        <ul>
          <li>访问我们持有的关于您的个人信息</li>
          <li>请求更正不准确或不完整的数据</li>
          <li>请求删除您的个人信息</li>
          <li>撤销之前给予的同意</li>
        </ul>
        <p>如需行使这些权利，请通过下方提供的联系方式与我们联系。</p>
      </section>

      <section class="privacy-section">
        <h2>10. 隐私政策的变更</h2>
        <p>我们可能会不时更新本隐私政策。我们会通过在本页面发布新的隐私政策来通知您任何重大变更。您继续使用本服务意味着您接受变更后的隐私政策。</p>
      </section>

      <section class="privacy-section">
        <h2>11. 联系我们</h2>
        <p>如果您对本隐私政策有任何疑问或疑虑，请通过以下方式与我们联系：</p>
        <ul>
          <li>GitHub：<a href="https://github.com/Eanvans/subtuber" target="_blank" rel="noopener">https://github.com/Eanvans/subtuber</a></li>
          <li>通过我们在社区中的反馈渠道</li>
        </ul>
      </section>

      <section class="privacy-section">
        <h2>12. 法律适用</h2>
        <p>本隐私政策受适用法律管辖，不计其法律原则的冲突。</p>
      </section>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'Privacy',
  setup() {
    const currentDate = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return {
      currentDate
    }
  }
}
</script>

<style scoped>
.privacy-container {
  min-height: calc(100vh - 80px - 300px);
  background: #f9fafb;
  padding: 2rem 1rem;
}

.privacy-content {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #1f2937;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 1rem;
}

.last-updated {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

.privacy-section {
  margin-bottom: 2rem;
}

h2 {
  color: #374151;
  font-size: 1.3rem;
  margin-bottom: 1rem;
  margin-top: 1.5rem;
}

p {
  color: #4b5563;
  line-height: 1.8;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

ul {
  margin-left: 2rem;
  margin-bottom: 1rem;
}

li {
  color: #4b5563;
  line-height: 1.8;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

a {
  color: #3b82f6;
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: #2563eb;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .privacy-container {
    padding: 1rem;
  }

  .privacy-content {
    padding: 1.5rem;
  }

  h1 {
    font-size: 1.5rem;
  }

  h2 {
    font-size: 1.1rem;
  }

  p, li {
    font-size: 0.9rem;
  }
}
</style>
