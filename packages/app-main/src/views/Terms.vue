<template>
  <div class="terms-container">
    <div class="terms-content">
      <h1>服务条款</h1>
      <p class="last-updated">最后更新于：{{ currentDate }}</p>

      <section class="terms-section">
        <h2>1. 服务条款的接受</h2>
        <p>通过访问和使用 SubTuber（以下简称"本服务"），您同意受本服务条款的约束。如果您不同意本条款的任何部分，请不要使用本服务。</p>
      </section>

      <section class="terms-section">
        <h2>2. 服务描述</h2>
        <p>SubTuber 是一个流媒体主播订阅管理和推荐平台。本服务允许用户订阅、追踪直播内容，并发现新的内容创作者。</p>
      </section>

      <section class="terms-section">
        <h2>3. 用户账户</h2>
        <p>为了使用本服务的某些功能，您可能需要创建一个账户。您同意：</p>
        <ul>
          <li>提供准确、完整和最新的账户信息</li>
          <li>维护账户密码的保密性</li>
          <li>对您账户上发生的所有活动负责</li>
          <li>立即通知我们任何未经授权的账户使用</li>
        </ul>
      </section>

      <section class="terms-section">
        <h2>4. 用户行为准则</h2>
        <p>在使用本服务时，您不得：</p>
        <ul>
          <li>违反任何适用的法律或法规</li>
          <li>发布仇恨、骚扰、威胁、滥用或暴力的内容</li>
          <li>从事任何形式的骚扰或欺凌</li>
          <li>发布违反他人隐私或知识产权的内容</li>
          <li>发送垃圾信息或未经请求的通信</li>
          <li>尝试获取本服务的未授权访问</li>
          <li>从事任何其他可能损害本服务或其他用户的行为</li>
        </ul>
      </section>

      <section class="terms-section">
        <h2>5. 知识产权</h2>
        <p>本服务及其所有内容（包括文本、图形、标志、图像、音频、视频和软件）均受版权、商标和其他知识产权法律的保护。您不得复制、修改、分发、传输或以其他方式使用本服务的内容，除非获得我们的明确许可。</p>
      </section>

      <section class="terms-section">
        <h2>6. 第三方内容和链接</h2>
        <p>本服务可能包含指向第三方网站或内容的链接。我们不对这些第三方网站、内容或服务的准确性、合法性或适当性负责。您对访问第三方网站和使用其内容的风险自行承担。</p>
      </section>

      <section class="terms-section">
        <h2>7. 免责声明</h2>
        <p>本服务"按原样"提供，不提供任何明示或暗示的担保。我们不保证本服务将满足您的需求、不中断、及时、安全或无错误。在最大法律允许范围内，我们不对任何间接、偶然、特殊、后果性或惩罚性损害赔偿负责。</p>
      </section>

      <section class="terms-section">
        <h2>8. 责任限制</h2>
        <p>在最大法律允许范围内，我们对您使用或无法使用本服务所导致的任何损失或损害不承担责任。这包括但不限于数据丢失、利润损失或业务中断。</p>
      </section>

      <section class="terms-section">
        <h2>9. 赔偿</h2>
        <p>您同意赔偿并保护 SubTuber、其所有者、员工和代理人免受任何第三方提出的索赔、责任、损害和费用（包括律师费），这些索赔、责任、损害和费用源于或与您对本服务的使用、您违反本条款或您侵犯任何第三方权利有关。</p>
      </section>

      <section class="terms-section">
        <h2>10. 账户终止</h2>
        <p>我们保留随时以任何理由终止或暂停您的账户和对本服务的访问的权利，包括违反本条款的情况。在发生违规时，我们可能会发送通知，但无义务在终止前告知。</p>
      </section>

      <section class="terms-section">
        <h2>11. 修改服务条款</h2>
        <p>我们可能会随时修改本服务条款。我们会通过在本页面发布修改后的条款来通知您。您继续使用本服务意味着您接受修改后的条款。定期检查本页面以了解最新的条款。</p>
      </section>

      <section class="terms-section">
        <h2>12. 修改或终止服务</h2>
        <p>我们保留随时修改、暂停或终止本服务的权利，恕不另行通知。我们不对因任何修改、暂停或终止服务而可能造成的任何损失负责。</p>
      </section>

      <section class="terms-section">
        <h2>13. 服务的使用限制</h2>
        <p>本服务仅供个人、非商业用途。您不得为商业目的或代表任何第三方使用本服务，除非获得我们的明确许可。</p>
      </section>

      <section class="terms-section">
        <h2>14. 可接受的使用政策</h2>
        <p>您同意不使用本服务：</p>
        <ul>
          <li>传播恶意软件、病毒或其他有害代码</li>
          <li>从事任何形式的网络钓鱼或欺诈</li>
          <li>进行自动爬取或数据采集，除非获得许可</li>
          <li>逆向工程或尝试获得本服务的源代码</li>
          <li>进行任何可能对本服务基础设施造成压力的活动</li>
        </ul>
      </section>

      <section class="terms-section">
        <h2>15. 隐私</h2>
        <p>您的隐私对我们很重要。请参阅我们的 <router-link to="/privacy">隐私政策</router-link> 了解我们如何收集、使用和保护您的个人信息。</p>
      </section>

      <section class="terms-section">
        <h2>16. 适用法律</h2>
        <p>本服务条款受适用法律管辖，不计其法律原则的冲突。因本条款或本服务引起的任何争议将由相关司法管辖区的法院处理。</p>
      </section>

      <section class="terms-section">
        <h2>17. 争议解决</h2>
        <p>在向任何法院起诉前，双方同意尽力通过友好协商解决任何争议。如果协商失败，争议应由相关司法管辖区的有管辖权的法院处理。</p>
      </section>

      <section class="terms-section">
        <h2>18. 联系我们</h2>
        <p>如果您对本服务条款有任何疑问或疑虑，请通过以下方式与我们联系：</p>
        <ul>
          <li>GitHub：<a href="https://github.com/Eanvans/subtuber" target="_blank" rel="noopener">https://github.com/Eanvans/subtuber</a></li>
          <li>通过我们在社区中的反馈渠道</li>
        </ul>
      </section>

      <section class="terms-section">
        <h2>19. 完整协议</h2>
        <p>本条款和我们的隐私政策构成了您与 SubTuber 之间关于本服务的完整协议，并取代所有先前的协议或谅解。</p>
      </section>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'Terms',
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
.terms-container {
  min-height: calc(100vh - 80px - 300px);
  background: #f9fafb;
  padding: 2rem 1rem;
}

.terms-content {
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

.terms-section {
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
  .terms-container {
    padding: 1rem;
  }

  .terms-content {
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
