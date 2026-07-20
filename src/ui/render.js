export const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const formatTime=value=>value?new Date(value).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}):'--:--';
export const formatTimelineDate=(value,timeZone)=>{if(!value)return'';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value.slice(5);return new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,...(timeZone?{timeZone}:{})})};
export function mount(id,html){const node=document.getElementById(id);if(node)node.innerHTML=html;return node}
