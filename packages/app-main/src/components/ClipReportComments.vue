<template>
  <div class="clip-comments">
    <button
      type="button"
      class="comment-action"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="toggleComments"
    >
      <i class="bi bi-chat" aria-hidden="true"></i>
      {{ open ? '收起评论' : '评论' }}
    </button>

    <section v-show="open" :id="panelId" class="comment-panel" aria-label="片段评论">
      <ul v-if="threads.length" class="comment-list">
        <li v-for="thread in threads" :key="thread.comment.id" class="comment-thread">
          <div class="comment-meta">
            <strong>{{ thread.comment.author_name }}</strong>
            <time :datetime="thread.comment.created_at">{{ formatDate(thread.comment.created_at) }}</time>
          </div>
          <p class="comment-body">{{ thread.comment.body }}</p>
          <button type="button" class="comment-action" @click="startReply(thread.comment)">回复</button>

          <ul v-if="thread.replies.length" class="comment-list comment-replies">
            <li v-for="reply in thread.replies" :key="reply.id">
              <div class="comment-meta">
                <strong>{{ reply.author_name }}</strong>
                <time :datetime="reply.created_at">{{ formatDate(reply.created_at) }}</time>
              </div>
              <p class="comment-body">{{ reply.body }}</p>
            </li>
          </ul>
        </li>
      </ul>
      <p v-else-if="loaded" class="comment-note">暂无评论</p>
      <p v-if="loading" class="comment-note" role="status">正在加载评论…</p>
      <div v-else-if="loadError" class="comment-status">
        <span role="status">{{ loadError }}</span>
        <button type="button" class="comment-action" @click="loadComments">重试</button>
      </div>
      <button v-else-if="nextAfterId" type="button" class="comment-action more-comments" @click="loadComments">加载更多评论</button>

      <form v-if="currentUser" class="comment-form" @submit.prevent="submit">
        <div v-if="replyTo" class="reply-target">
          <span>回复 {{ replyTo.author_name }}</span>
          <button type="button" class="comment-action" :disabled="sending" @click="replyTo = null">取消回复</button>
        </div>
        <label class="comment-label" :for="inputId">{{ replyTo ? '回复内容' : '发表评论' }}</label>
        <textarea
          :id="inputId"
          ref="composer"
          v-model="draft"
          class="input comment-input"
          rows="2"
          :disabled="sending"
          :aria-invalid="characterCount > maxChars"
          :aria-describedby="countId"
        ></textarea>
        <p v-if="submitError" class="comment-status" role="alert">{{ submitError }}</p>
        <div class="comment-form-actions">
          <span :id="countId" class="comment-note" :class="{ 'comment-status': characterCount > maxChars }">{{ characterCount }} / {{ maxChars }}</span>
          <button type="submit" class="btn btn-primary btn-sm" :disabled="sending || !characterCount || characterCount > maxChars">
            {{ sending ? '发送中…' : replyTo ? '发送回复' : '发表评论' }}
          </button>
        </div>
      </form>
      <button v-else type="button" class="btn btn-outline btn-sm comment-sign-in" @click="emit('request-login')">登录后发表评论</button>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { createClipReportComment, getClipReportComments } from '../api/streamers'
import { useAuth } from '../composables/useAuth'

const props = defineProps({ reportId: { type: Number, required: true } })
const emit = defineEmits(['request-login'])
const { currentUser } = useAuth()

const maxChars = 500
const dateFormat = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const panelId = `clip-comments-${props.reportId}`
const inputId = `${panelId}-input`
const countId = `${panelId}-count`
const open = ref(false)
const comments = ref([])
const loaded = ref(false)
const loading = ref(false)
const loadError = ref('')
const nextAfterId = ref(0)
const composer = ref(null)
const replyTo = ref(null)
const draft = ref('')
const sending = ref(false)
const submitError = ref('')
const characterCount = computed(() => [...draft.value.trim()].length)

const threads = computed(() => {
  const byId = new Map()
  for (const comment of comments.value) {
    if (comment.parent_id) byId.get(comment.parent_id)?.replies.push(comment)
    else byId.set(comment.id, { comment, replies: [] })
  }
  return [...byId.values()]
})

function formatDate(value) {
  return dateFormat.format(new Date(value))
}

function mergeComments(items) {
  const byId = new Map(comments.value.map(item => [item.id, item]))
  for (const item of items) byId.set(item.id, item)
  comments.value = [...byId.values()].sort((a, b) => a.id - b.id)
}

function toggleComments() {
  open.value = !open.value
  if (open.value && !loaded.value && !loading.value) void loadComments()
}

async function loadComments() {
  if (loading.value) return
  loading.value = true
  loadError.value = ''
  try {
    const result = await getClipReportComments(props.reportId, nextAfterId.value)
    if (!result?.success || !Array.isArray(result.items)) throw new Error('评论加载失败')
    mergeComments(result.items)
    nextAfterId.value = result.next_after_id
    loaded.value = true
  } catch (error) {
    loadError.value = error.message || '评论加载失败'
  } finally {
    loading.value = false
  }
}

async function startReply(comment) {
  if (sending.value) return
  replyTo.value = comment
  submitError.value = ''
  if (!currentUser.value) {
    emit('request-login')
    return
  }
  await nextTick()
  composer.value?.focus()
}

async function submit() {
  if (!currentUser.value || sending.value || !characterCount.value || characterCount.value > maxChars) return
  const author = currentUser.value
  sending.value = true
  submitError.value = ''
  try {
    const result = await createClipReportComment(props.reportId, {
      body: draft.value.trim(),
      parent_id: replyTo.value?.id
    })
    if (!result?.success || !result.comment) throw new Error('评论发送失败')
    mergeComments([result.comment])
    if (currentUser.value === author) {
      draft.value = ''
      replyTo.value = null
    }
  } catch (error) {
    if (currentUser.value === author) {
      submitError.value = error.message || '评论发送失败'
      if (error.status === 401) emit('request-login')
    }
  } finally {
    sending.value = false
  }
}

watch(currentUser, (user, previous) => {
  if (!previous || (user && user.userId === previous.userId)) return
  draft.value = ''
  replyTo.value = null
  submitError.value = ''
})
</script>

<style scoped>
.clip-comments { min-width: 0; padding-top: .65rem; border-top: 1px solid var(--border); }
.comment-action {
  padding: .15rem 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  font-size: .8rem;
  font-weight: 600;
  cursor: pointer;
}
.comment-action:hover { text-decoration: underline; }
.comment-action:disabled { opacity: .55; cursor: not-allowed; }
.comment-panel { margin-top: .6rem; }
.comment-list { margin: 0; padding: 0; list-style: none; }
.comment-thread + .comment-thread { margin-top: .7rem; padding-top: .7rem; border-top: 1px solid var(--border); }
.comment-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem .6rem; font-size: .8rem; overflow-wrap: anywhere; }
.comment-meta time, .comment-note { color: var(--muted-2); font-size: .75rem; }
.comment-note { margin: 0; }
.comment-body { margin: .25rem 0; color: var(--muted); font-size: .85rem; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.comment-replies { display: grid; gap: .55rem; margin: .35rem 0 0 .25rem; padding-left: .75rem; border-left: 2px solid var(--border); }
.comment-form, .comment-sign-in, .more-comments { margin-top: .65rem; }
.comment-form { display: grid; gap: .35rem; }
.comment-label { font-size: .8rem; font-weight: 650; }
.comment-input { padding: .55rem .7rem; resize: vertical; font: inherit; font-size: .85rem; }
.reply-target, .comment-form-actions { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: .25rem .65rem; }
.reply-target { color: var(--muted-2); font-size: .8rem; overflow-wrap: anywhere; }
.comment-status { display: flex; align-items: baseline; gap: .5rem; margin: .25rem 0 0; color: #a13027; font-size: .8rem; }
</style>
