export function notificationState(api=globalThis.Notification){if(!api)return'unsupported';if(api.permission==='granted')return'granted';if(api.permission==='denied')return'denied';return'needs-explanation'}
export function dueNotifications(tasks,now=new Date().toISOString()){const time=new Date(now).getTime();return tasks.filter(task=>!['completed','skipped'].includes(task.status)&&new Date(task.plannedAt).getTime()<=time).sort((a,b)=>a.plannedAt.localeCompare(b.plannedAt))}
export function reconcileNotificationMessages(tasks,now){return dueNotifications(tasks,now).map(task=>({type:'SCHEDULE_NOTIFICATION',taskId:task.id,title:`该${task.title}了`,plannedAt:task.plannedAt}))}
export async function requestNotifications(api=globalThis.Notification){if(!api)throw new Error('当前浏览器不支持通知');return api.requestPermission()}
export async function notifyDueTasks(tasks,{now=new Date().toISOString(),registration}={}){const messages=reconcileNotificationMessages(tasks,now);for(const message of messages)await registration?.showNotification?.(message.title,{body:'打开宝宝成长助手查看当前事项',tag:`task-${message.taskId}`,data:{url:'./',taskId:message.taskId}});return messages}

