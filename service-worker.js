const CACHE_NAME='baby-growth-v1-20260720-r2';
const APP_SHELL=[
  "./","./index.html","./manifest.webmanifest","./assets/styles/app.css","./assets/icons/icon.svg","./assets/icons/icon-192.svg","./assets/icons/icon-512.svg","./data/recipes.js",
  "./src/app.js","./src/db.js","./src/store.js","./src/router.js","./src/core/id.js","./src/core/dates.js","./src/core/schema.js",
  "./src/features/schedule/template.js","./src/features/schedule/engine.js","./src/features/schedule/select-current.js",
  "./src/features/meals/planner.js","./src/features/meals/preferences.js","./src/features/meals/shopping.js",
  "./src/features/records/records.js","./src/features/records/sleep.js","./src/features/records/new-food.js",
  "./src/features/growth/timeline.js","./src/features/growth/chart.js","./src/features/backup/backup.js","./src/features/backup/validate.js","./src/features/notifications/notifications.js",
  "./src/ui/render.js","./src/ui/today.js","./src/ui/meals.js","./src/ui/records.js","./src/ui/growth.js","./src/ui/settings.js","./src/ui/onboarding.js","./src/ui/feedback.js","./src/ui/dialogs.js"
];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();if(event.data?.type==='SCHEDULE_NOTIFICATION')event.waitUntil(self.registration.showNotification(event.data.title,{body:'打开应用查看当前事项',tag:`task-${event.data.taskId}`,data:{url:'./',taskId:event.data.taskId}}))});

async function navigationResponse(request){try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put('./index.html',response.clone())}return response}catch{return caches.match('./index.html')}}
async function assetResponse(request){const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone())}return response}
self.addEventListener('fetch',event=>{const{request}=event;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;if(request.mode === 'navigate')event.respondWith(navigationResponse(request));else event.respondWith(assetResponse(request))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{const existing=clients.find(client=>'focus'in client);return existing?existing.focus():self.clients.openWindow(event.notification.data?.url||'./')}))});
