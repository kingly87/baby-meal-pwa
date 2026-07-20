export const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const formatTime=value=>value?new Date(value).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}):'--:--';
export function mount(id,html){const node=document.getElementById(id);if(node)node.innerHTML=html;return node}

